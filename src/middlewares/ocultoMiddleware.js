const ocultoService = require('../services/ocultoService');

/**
 * Rotas com :id de pessoa (editar, excluir, reenviar verificação).
 * Se o :id é de uma conta oculta (TI) e quem pede NÃO é a própria
 * conta, responde 404 como se a pessoa não existisse.
 */
async function bloquearPessoaOculta(req, res, next) {
  try {
    const id = req.params.id;
    if (id && id !== req.user?.person_id && await ocultoService.pessoaEhOculta(id)) {
      return res.status(404).render('errors/nao-encontrado', { title: 'Não encontrado' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { bloquearPessoaOculta };
