/**
 * Usado depois do requireAuth. Só a conta de TI passa; pra todo
 * mundo o resultado é 404, como se a página não existisse.
 */
function requireTi(req, res, next) {
  if (!req.user || !req.user.isTi) {
    return res.status(404).render('errors/nao-encontrado', { title: 'Não encontrado' });
  }
  next();
}

module.exports = { requireTi };
