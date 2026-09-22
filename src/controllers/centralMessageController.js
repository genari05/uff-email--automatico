const gtMembershipModel = require('../models/gtMembershipModel');
const centralMessageModel = require('../models/centralMessageModel');

// GET /gts/central -> mural central, onde os GTs se comunicam entre si
async function listarMuralCentral(req, res) {
  const [mensagens, meusGts] = await Promise.all([
    centralMessageModel.listRecent(50),
    gtMembershipModel.listApprovedByUser(req.user.id),
  ]);

  res.render('gts/central', {
    title: 'Mural central dos GTs',
    mensagens,
    meusGts, // pra escolher "em nome de qual GT" a pessoa está postando
  });
}

// POST /gts/central -> posta uma mensagem no mural central em nome de um GT
async function postarMuralCentral(req, res) {
  try {
    const { gtId, message } = req.body;
    if (!gtId || !message?.trim()) return res.redirect('/gts/central');

    // Só pode postar em nome de um GT do qual realmente faz parte
    const souMembro = await gtMembershipModel.isApprovedMemberOfGt(gtId, req.user.id);
    if (!souMembro) return res.redirect('/gts/central');

    await centralMessageModel.create({
      gtId,
      authorUserId: req.user.id,
      message: message.trim(),
    });

    res.redirect('/gts/central');
  } catch (err) {
    console.error(err);
    res.redirect('/gts/central');
  }
}

module.exports = { listarMuralCentral, postarMuralCentral };
