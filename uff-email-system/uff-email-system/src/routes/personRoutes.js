const express = require('express');
const router = express.Router();
const personController = require('../controllers/personController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Rotas públicas (qualquer um pode cadastrar/verificar)
router.get('/nova', personController.formNovaPessoa);
router.post('/', personController.criarPessoa);
router.get('/verificar/:token', personController.verificarEmail);

// Rota protegida (só quem tem login e acesso)
router.get('/', requireAuth, personController.listarPessoas);

module.exports = router;
