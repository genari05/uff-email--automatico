const personModel = require('../models/personModel');
const emailModel = require('../models/emailModel');
const { sendBulkEmail } = require('../services/emailService');

// GET /emails/selecionar -> checkbox com todas as pessoas verificadas
async function formSelecionarDestinatarios(req, res) {
  const pessoas = await personModel.listAll({ onlyVerified: true });
  res.render('dashboard/selecionar-destinatarios', { title: 'Selecionar destinatários', pessoas });
}

// POST /emails/selecionar -> guarda a seleção e manda pra tela de tipo de e-mail
async function processarSelecao(req, res) {
  let { destinatarios } = req.body; // ids marcados (ou "todos")
  if (!destinatarios) destinatarios = [];
  if (!Array.isArray(destinatarios)) destinatarios = [destinatarios];

  // guardamos os ids selecionados na query string da próxima etapa
  const query = new URLSearchParams({ ids: destinatarios.join(',') }).toString();
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

  const [template, pessoas] = await Promise.all([
    templateId ? emailModel.findTemplateById(templateId) : Promise.resolve(null),
    personModel.findManyByIds(ids),
  ]);

  res.render('dashboard/compor-email', {
    title: 'Compor e-mail',
    ids,
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

    const pessoas = await personModel.findManyByIds(ids);
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

module.exports = {
  formSelecionarDestinatarios,
  processarSelecao,
  formTipoEmail,
  formCompor,
  enviar,
  criarTemplate,
};
