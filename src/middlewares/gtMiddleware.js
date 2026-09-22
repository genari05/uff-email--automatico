const gtModel = require('../models/gtModel');
const gtMembershipModel = require('../models/gtMembershipModel');

/**
 * Usado depois do requireAuth, em qualquer rota /gts/:slug/...
 * Só deixa passar quem já tem entrada APROVADA naquele GT
 * específico (o "acesso trancado" pedido: cada GT só abre pra
 * quem o líder daquele GT liberou).
 */
async function requireGtAccess(req, res, next) {
  try {
    const gt = await gtModel.findBySlug(req.params.slug);
    if (!gt) {
      return res.status(404).render('errors/nao-encontrado', { title: 'GT não encontrado' });
    }

    const membership = await gtMembershipModel.findByGtAndUser(gt.id, req.user.id);
    if (!membership || membership.status !== 'approved') {
      return res.status(403).render('errors/acesso-negado', {
        title: 'Acesso negado',
        mensagem: `Você ainda não faz parte do ${gt.name}. Peça entrada na tela de GTs e aguarde a aprovação do líder.`,
      });
    }

    req.gt = gt;
    req.gtMembership = membership;
    res.locals.gt = gt;
    res.locals.gtMembership = membership;
    next();
  } catch (err) {
    console.error('Erro ao verificar acesso ao GT:', err.message);
    res.status(503).send(
      '<div style="font-family:sans-serif;max-width:420px;margin:80px auto;text-align:center;">' +
      '<h2>Erro temporário de conexão</h2>' +
      '<p>Não foi possível confirmar seu acesso a este GT agora. Tente de novo.</p>' +
      '<a href="javascript:location.reload()">Tentar novamente</a>' +
      '</div>'
    );
  }
}

/**
 * Usado depois do requireGtAccess. Só deixa passar quem é líder
 * (aprovado) DAQUELE GT específico - não confundir com req.user.role,
 * que é o papel geral do sistema.
 */
function requireGtLeader(req, res, next) {
  if (!req.gtMembership || req.gtMembership.role !== 'leader') {
    return res.status(403).render('errors/acesso-negado', {
      title: 'Acesso negado',
      mensagem: `Apenas o líder do ${req.gt.name} pode acessar esta área.`,
    });
  }
  next();
}

module.exports = { requireGtAccess, requireGtLeader };
