/**
 * Usado depois do requireAuth. Garante que só o líder acesse
 * a área de aprovar/negar pedidos de acesso.
 */
function requireLeader(req, res, next) {
  if (!req.user || req.user.role !== 'leader') {
    return res.status(403).render('errors/acesso-negado', {
      title: 'Acesso negado',
      mensagem: 'Apenas o líder pode acessar esta área.',
    });
  }
  next();
}

module.exports = { requireLeader };
