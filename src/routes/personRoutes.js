const express = require('express');
const router = express.Router();
const personController = require('../controllers/personController');
const { requireAuth, optionalAuth } = require('../middlewares/authMiddleware');
const { requireLeader } = require('../middlewares/leaderMiddleware');
const { requireOwnerOrLeader } = require('../middlewares/ownerOrLeaderMiddleware');

// Rotas públicas (qualquer um pode cadastrar/verificar). optionalAuth
// detecta se quem está acessando já está logado, sem bloquear quem não está -
// assim a mesma URL mostra a versão certa pra cada caso.
router.get('/nova', optionalAuth, personController.formNovaPessoa);
router.post('/', optionalAuth, personController.criarPessoa);
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
