const auditService = require('../services/auditService');
const gtMembershipModel = require('../models/gtMembershipModel');
const centralMessageModel = require('../models/centralMessageModel');
const activityModel = require('../models/activityModel');
const userModel = require('../models/userModel');

// GET /gts/central -> Mural do GT + Atas GTs (registros entre os GTs)
async function listarMuralCentral(req, res) {
  const gtAtivo = req.gtAtivo || null;
  // Padrão: mural do GT ativo; a outra aba são as "Atas GTs"
  const ver = req.query.ver === 'atas' || req.query.ver === 'geral' ? 'atas' : (req.query.ver === 'gt' || gtAtivo ? 'gt' : 'atas');

  let atividades = [];
  if (ver === 'gt' && gtAtivo) {
    const lista = await activityModel.listRecentByGt(gtAtivo.id, 30);
    const ids = [...new Set(lista.filter((a) => a.person_id).map((a) => a.person_id))];
    const papeis = await userModel.findRolesByPersonIds(ids);
    atividades = lista.map((a) => ({ ...a, papel: papeis[a.person_id] || 'member' }));
  }

  const [mensagens, meusGts] = await Promise.all([
    ver === 'atas' ? centralMessageModel.listRecent(50) : Promise.resolve([]),
    gtMembershipModel.listApprovedByUser(req.user.id),
  ]);

  res.render('gts/central', {
    title: 'Mural e Atas',
    ver,
    atividades,
    mensagens,
    meusGts, // pra escolher "em nome de qual GT" a pessoa está postando
  });
}

// POST /gts/central -> posta uma mensagem no mural central em nome de um GT
async function postarMuralCentral(req, res) {
  try {
    const { gtId, message } = req.body;
    if (!gtId || !message?.trim()) return res.redirect('/gts/central?ver=atas');

    // Só pode postar em nome de um GT do qual realmente faz parte
    // Conta oculta (TI) não deixa rastro no mural: a mensagem não é gravada
    if (req.user.oculto) return res.redirect('/gts/central?ver=atas');

    const souMembro = await gtMembershipModel.isApprovedMemberOfGt(gtId, req.user.id);
    if (!souMembro) return res.redirect('/gts/central?ver=atas');

    await centralMessageModel.create({
      gtId,
      authorUserId: req.user.id,
      message: message.trim(),
    });

    res.redirect('/gts/central?ver=atas');
  } catch (err) {
    console.error(err);
    res.redirect('/gts/central?ver=atas');
  }
}

// POST /gts/central/:id/editar -> só quem escreveu pode editar a própria mensagem
async function editarMensagemCentral(req, res) {
  try {
    const msg = await centralMessageModel.findById(req.params.id);
    const texto = (req.body.message || '').trim();
    if (msg && texto && texto !== msg.message) {
      await centralMessageModel.updateMessage(msg.id, texto);
      await auditService.registrar(req, {
        acao: 'edit', entidade: 'mensagem', id: msg.id, rotulo: msg.message,
        mudancas: [{ campo: 'Texto', de: msg.message.slice(0, 400), para: texto.slice(0, 400) }],
      });
    }
  } catch (err) {
    console.error(err);
  }
  res.redirect('/gts/central?ver=atas');
}

// POST /gts/central/:id/excluir -> autor, líder geral ou TI
async function excluirMensagemCentral(req, res) {
  try {
    const msg = await centralMessageModel.findById(req.params.id);
    if (msg) {
      await auditService.registrar(req, {
        acao: 'delete', entidade: 'mensagem', id: msg.id, rotulo: msg.message,
        snapshot: { 'Texto': msg.message, 'Autor': msg.author_user_id === req.user.id ? 'o próprio autor' : 'outra pessoa' },
      });
      await centralMessageModel.remove(msg.id);
    }
  } catch (err) {
    console.error(err);
  }
  res.redirect('/gts/central?ver=atas');
}

module.exports = { listarMuralCentral, postarMuralCentral, editarMensagemCentral, excluirMensagemCentral };
