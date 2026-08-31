const express = require('express');
const router = express.Router();
const personController = require('../controllers/personController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireLeader } = require('../middlewares/leaderMiddleware');
const { requireOwnerOrLeader } = require('../middlewares/ownerOrLeaderMiddleware');

// Rotas públicas (qualquer um pode cadastrar/verificar)
router.get('/nova', personController.formNovaPessoa);
router.post('/', personController.criarPessoa);
router.get('/verificar/:token', personController.verificarEmail);

// Rota protegida (só quem tem login e acesso)
router.get('/', requireAuth, personController.listarPessoas);

// Editar/excluir: a própria pessoa pode mexer na conta dela,
// e o líder pode mexer em qualquer uma.
router.get('/:id/editar', requireAuth, requireOwnerOrLeader, personController.formEditarPessoa);
router.post('/:id/editar', requireAuth, requireOwnerOrLeader, personController.editarPessoa);
router.post('/:id/excluir', requireAuth, requireOwnerOrLeader, personController.excluirPessoa);

// Reenviar verificação: só o líder (é uma ação administrativa sobre
// o cadastro de outra pessoa). A confirmação em si só acontece pelo
// link do e-mail - não existe mais um jeito manual de "forçar".
router.post('/:id/reenviar-verificacao', requireAuth, requireLeader, personController.reenviarVerificacao);

module.exports = router;
