const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.use(requireAuth); // tudo aqui exige login com acesso liberado

router.get('/selecionar', emailController.formSelecionarDestinatarios);
router.post('/selecionar', emailController.processarSelecao);

router.get('/tipo', emailController.formTipoEmail);
router.post('/templates', emailController.criarTemplate);

router.get('/compor', emailController.formCompor);
router.post('/enviar', emailController.enviar);

module.exports = router;
