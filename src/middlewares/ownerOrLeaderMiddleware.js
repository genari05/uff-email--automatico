/**
 * Usado depois do requireAuth. Libera a ação se:
 * - quem está logado é o líder (pode mexer em qualquer pessoa), OU
 * - a pessoa é dona do próprio registro (:id da rota bate com o
 *   person_id de quem está logado).
 * Qualquer outro caso -> acesso negado.
 */
function requireOwnerOrLeader(req, res, next) {
  const idDaRota = req.params.id;

  if (req.user.role === 'leader' || idDaRota === req.user.person_id) {
    return next();
  }

  return res.status(403).render('errors/acesso-negado', {
    title: 'Acesso negado',
    mensagem: 'Você só pode editar ou excluir a sua própria conta.',
  });
}

module.exports = { requireOwnerOrLeader };
