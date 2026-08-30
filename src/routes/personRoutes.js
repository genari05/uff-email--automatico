const express = require('express');
const router = express.Router();
const personController = require('../controllers/personController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireLeader } = require('../middlewares/leaderMiddleware');

// Rotas públicas (qualquer um pode cadastrar/verificar)
router.get('/nova', personController.formNovaPessoa);
router.post('/', personController.criarPessoa);
router.get('/verificar/:token', personController.verificarEmail);

// Rota protegida (só quem tem login e acesso)
router.get('/', requireAuth, personController.listarPessoas);

// Administração de pessoas - só o líder pode editar/excluir/reenviar
router.get('/:id/editar', requireAuth, requireLeader, personController.formEditarPessoa);
router.post('/:id/editar', requireAuth, requireLeader, personController.editarPessoa);
router.post('/:id/excluir', requireAuth, requireLeader, personController.excluirPessoa);
router.post('/:id/reenviar-verificacao', requireAuth, requireLeader, personController.reenviarVerificacao);
router.post('/:id/marcar-verificado', requireAuth, requireLeader, personController.marcarVerificadoManualmente);

module.exports = router;
