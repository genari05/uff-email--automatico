const personModel = require('../models/personModel');
const emailModel = require('../models/emailModel');
const gtMembershipModel = require('../models/gtMembershipModel');
const { sendBulkEmail } = require('../services/emailService');

// Pessoas do GT ativo de quem está logado (isolamento: nunca mistura
// gente de outro GT). Sem GT ativo escolhido, ninguém aparece.
async function pessoasDoGtAtivo(req, { onlyVerified = false } = {}) {
  // TI enxerga todo mundo (a própria conta oculta já fica de fora pela view)
  if (req.user?.isTi) return personModel.listAll({ onlyVerified });
  if (!req.gtAtivo) return [];
  const membros = await gtMembershipModel.listApprovedMembersOfGt(req.gtAtivo.id);
  let pessoas = membros.map((m) => m.users?.people).filter(Boolean);
  if (onlyVerified) pessoas = pessoas.filter((p) => p.verified);
  return pessoas.sort((a, b) => a.name.localeCompare(b.name));
}

// GET /emails/selecionar -> checkbox só com pessoas verificadas do GT ativo
async function formSelecionarDestinatarios(req, res) {
  const pessoas = await pessoasDoGtAtivo(req, { onlyVerified: true });
  res.render('dashboard/selecionar-destinatarios', {
    title: 'Selecionar destinatários',
    pessoas,
    gtAtivo: req.gtAtivo,
    meusGts: req.meusGts,
  });
}

// POST /emails/selecionar -> guarda a seleção e manda pra tela de tipo de e-mail
async function processarSelecao(req, res) {
  let { destinatarios } = req.body; // ids marcados
  if (!destinatarios) destinatarios = [];
  if (!Array.isArray(destinatarios)) destinatarios = [destinatarios];

  // Isolamento também no backend: mesmo que alguém force IDs de fora
  // no formulário, só passam os que são mesmo do GT ativo e verificados.
  const permitidas = await pessoasDoGtAtivo(req, { onlyVerified: true });
  const idsPermitidos = new Set(permitidas.map((p) => p.id));
  const idsValidos = destinatarios.filter((id) => idsPermitidos.has(id));

  const query = new URLSearchParams({ ids: idsValidos.join(',') }).toString();
  res.redirect(`/emails/tipo?${query}`);
}

// GET /emails/tipo -> escolher entre "email programado" (template) ou personalizado
async function formTipoEmail(req, res) {
  const ids = (req.query.ids || '').split(',').filter(Boolean);
  const templates = await emailModel.listTemplates();
  res.render('dashboard/tipo-email', { title: 'Tipo de e-mail', ids, templates });
}

// GET /emails/compor -> formulário final (template preenchido ou em branco)
async function formCompor(req, res) {
  const ids = (req.query.ids || '').split(',').filter(Boolean);
  const templateId = req.query.template || null;

  // Revalida contra o GT ativo aqui também - a lista de ids veio por
  // query string, então não dá pra confiar nela sem checar de novo.
  const permitidas = await pessoasDoGtAtivo(req);
  const idsPermitidos = new Set(permitidas.map((p) => p.id));
  const idsValidos = ids.filter((id) => idsPermitidos.has(id));

  const [template, pessoas] = await Promise.all([
    templateId ? emailModel.findTemplateById(templateId) : Promise.resolve(null),
    personModel.findManyByIds(idsValidos),
  ]);

  res.render('dashboard/compor-email', {
    title: 'Compor e-mail',
    ids: idsValidos,
    pessoas,
    template,
  });
}

// POST /emails/enviar -> dispara de fato o e-mail para os selecionados
async function enviar(req, res) {
  try {
    let { ids, subject, body, tipo, templateId } = req.body;
    if (!ids) ids = [];
    if (!Array.isArray(ids)) ids = [ids];

    // Última barreira antes de disparar de verdade: só envia pra quem
    // é do GT ativo de quem está mandando, não importa o que veio no form.
    const permitidas = await pessoasDoGtAtivo(req);
    const idsPermitidos = new Set(permitidas.map((p) => p.id));
    const idsValidos = ids.filter((id) => idsPermitidos.has(id));

    const pessoas = await personModel.findManyByIds(idsValidos);
    const recipients = pessoas.map((p) => p.email);

    if (recipients.length === 0) {
      return res.render('dashboard/resultado-envio', {
        title: 'Resultado do envio',
        erro: 'Nenhum destinatário selecionado.',
        resultado: null,
      });
    }

    const html = body.replace(/\n/g, '<br>');
    const resultado = await sendBulkEmail({ recipients, subject, html });

    await emailModel.logEmail({
      senderId: req.user.id,
      subject,
      body,
      recipients,
      type: tipo === 'template' ? 'template' : 'custom',
      templateId: tipo === 'template' ? templateId || null : null,
    });

    res.render('dashboard/resultado-envio', {
      title: 'Resultado do envio',
      erro: null,
      resultado,
    });
  } catch (err) {
    console.error(err);
    res.render('dashboard/resultado-envio', {
      title: 'Resultado do envio',
      erro: 'Erro ao enviar e-mails.',
      resultado: null,
    });
  }
}

// POST /emails/templates -> líder/membro cria um novo modelo de e-mail programado
async function criarTemplate(req, res) {
  try {
    const { title, subject, body } = req.body;
    await emailModel.createTemplate({ title, subject, body, createdBy: req.user.id });
    res.redirect('/emails/tipo');
  } catch (err) {
    console.error(err);
    res.redirect('/emails/tipo');
  }
}

const podeMexerNoModelo = (req, t) => t && (req.user.role === 'leader' || t.created_by === req.user.id);

// GET /emails/templates/:id/editar
async function formEditarTemplate(req, res) {
  const t = await emailModel.findTemplateById(req.params.id);
  if (!t) return res.status(404).render('errors/nao-encontrado', { title: 'Modelo não encontrado' });
  if (!podeMexerNoModelo(req, t)) {
    return res.status(403).render('errors/acesso-negado', { title: 'Acesso negado', mensagem: 'Só quem criou o modelo ou a coordenação pode editá-lo.' });
  }
  res.render('dashboard/template-editar', { title: 'Editar modelo', t, erro: null });
}

// POST /emails/templates/:id/editar
async function salvarTemplate(req, res) {
  const t = await emailModel.findTemplateById(req.params.id);
  if (!t) return res.status(404).render('errors/nao-encontrado', { title: 'Modelo não encontrado' });
  if (!podeMexerNoModelo(req, t)) {
    return res.status(403).render('errors/acesso-negado', { title: 'Acesso negado', mensagem: 'Só quem criou o modelo ou a coordenação pode editá-lo.' });
  }
  const { title, subject, body } = req.body;
  if (!title?.trim() || !subject?.trim() || !body?.trim()) {
    return res.render('dashboard/template-editar', { title: 'Editar modelo', t: { ...t, title, subject, body }, erro: 'Preencha nome, assunto e corpo.' });
  }
  await emailModel.updateTemplate(t.id, { title: title.trim(), subject: subject.trim(), body });
  res.redirect('/emails/tipo');
}

// POST /emails/templates/:id/excluir
async function excluirTemplate(req, res) {
  try {
    const t = await emailModel.findTemplateById(req.params.id);
    if (t && podeMexerNoModelo(req, t)) await emailModel.deleteTemplate(t.id);
  } catch (err) {
    console.error('Não foi possível excluir o modelo (talvez esteja em uso):', err.message);
  }
  res.redirect('/emails/tipo');
}

module.exports = {
  formEditarTemplate,
  salvarTemplate,
  excluirTemplate,
  formSelecionarDestinatarios,
  processarSelecao,
  formTipoEmail,
  formCompor,
  enviar,
  criarTemplate,
};
