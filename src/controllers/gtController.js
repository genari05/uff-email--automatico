const gtModel = require('../models/gtModel');
const gtMembershipModel = require('../models/gtMembershipModel');
const {
  sendGtEntryRequestEmail,
  sendGtEntryResolvedEmail,
} = require('../services/emailService');

// GET /gts -> lista todos os GTs e a situação da pessoa em cada um
async function listarGts(req, res) {
  const [gts, minhas] = await Promise.all([
    gtModel.listAll(),
    gtMembershipModel.listApprovedByUser(req.user.id),
  ]);

  // Pra saber a situação de TODOS os GTs (aprovado, pendente, ou nada
  // ainda), não só os aprovados, busca o membership de cada um.
  const situacoes = await Promise.all(
    gts.map((gt) => gtMembershipModel.findByGtAndUser(gt.id, req.user.id))
  );

  const gtsComSituacao = gts.map((gt, i) => ({
    ...gt,
    minhaSituacao: situacoes[i] ? situacoes[i].status : null, // null = nunca pediu entrada
    meuPapel: situacoes[i]?.status === 'approved' ? situacoes[i].role : null,
  }));

  const gtAtivoSlug = req.cookies?.gt_ativo || null;

  res.render('gts/lista', {
    title: 'Grupos de Trabalho',
    gts: gtsComSituacao,
    gtAtivoSlug,
  });
}

// POST /gts/:slug/entrar -> pede entrada em um GT
async function pedirEntrada(req, res) {
  try {
    const gt = await gtModel.findBySlug(req.params.slug);
    if (!gt) return res.redirect('/gts');

    const membership = await gtMembershipModel.requestEntry({ gtId: gt.id, userId: req.user.id });

    if (membership.status === 'pending') {
      const lideres = await gtMembershipModel.findLeadersOfGt(gt.id);
      lideres.forEach((l) => {
        const emailLider = l.users?.people?.email;
        if (!emailLider) return;
        sendGtEntryRequestEmail({
          to: emailLider,
          requesterName: req.user.people.name,
          gtName: gt.name,
        }).catch((err) => console.error('Erro ao notificar líder do GT:', err.message));
      });
    }

    res.redirect('/gts');
  } catch (err) {
    console.error(err);
    res.redirect('/gts');
  }
}

// GET /gts/pendentes -> pedidos de entrada pendentes nos GTs que a pessoa lidera
async function listarPendentes(req, res) {
  const pedidos = await gtMembershipModel.listPendingForLeaderGts(req.user.id);
  res.render('gts/pendentes', { title: 'Pedidos de entrada em GTs', pedidos });
}

// POST /gts/pendentes/:id/resolver -> aprova ou nega um pedido de entrada
async function resolverPendente(req, res) {
  try {
    const { id } = req.params;
    const { decisao } = req.body; // 'approved' | 'denied'

    const membership = await gtMembershipModel.findById(id);
    if (!membership) return res.redirect('/gts/pendentes');

    // Só o líder do GT em questão pode resolver esse pedido específico
    const souLiderDesseGt = await gtMembershipModel.isApprovedLeaderOfGt(membership.gt_id, req.user.id);
    if (!souLiderDesseGt) {
      return res.status(403).render('errors/acesso-negado', {
        title: 'Acesso negado',
        mensagem: 'Apenas o líder desse GT pode resolver esse pedido.',
      });
    }

    const atualizado = await gtMembershipModel.resolve(id, {
      status: decisao,
      resolvedBy: req.user.id,
    });

    const pessoaSolicitante = membership.users?.people;
    if (pessoaSolicitante?.email) {
      sendGtEntryResolvedEmail({
        to: pessoaSolicitante.email,
        name: pessoaSolicitante.name,
        gtName: membership.gts.name,
        aprovado: decisao === 'approved',
      }).catch((err) => console.error('Erro ao notificar resultado do pedido de GT:', err.message));
    }

    res.redirect('/gts/pendentes');
  } catch (err) {
    console.error(err);
    res.redirect('/gts/pendentes');
  }
}

// POST /gts/:slug/ativar -> troca o GT ativo da sessão (guardado em cookie)
async function ativarGt(req, res) {
  try {
    const gt = await gtModel.findBySlug(req.params.slug);
    if (!gt) return res.redirect('/gts');

    const souMembro = await gtMembershipModel.isApprovedMemberOfGt(gt.id, req.user.id);
    if (!souMembro) return res.redirect('/gts');

    res.cookie('gt_ativo', gt.slug, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 dias
    });

    res.redirect(`/gts/${gt.slug}`);
  } catch (err) {
    console.error(err);
    res.redirect('/gts');
  }
}

module.exports = {
  listarGts,
  pedirEntrada,
  listarPendentes,
  resolverPendente,
  ativarGt,
};
