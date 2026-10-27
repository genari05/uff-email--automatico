const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { criarLimitador } = require('../middlewares/rateLimit');

// Máx. 10 tentativas de login por IP+e-mail a cada 15 min
const limitarLogin = criarLimitador({
  max: 10,
  chave: (req) => `${req.ip}|${(req.body?.email || '').toLowerCase().trim()}`,
});

router.get('/login', authController.formLogin);
router.post('/login', limitarLogin, authController.login);
router.get('/logout', authController.logout);

router.get('/esqueci-senha', authController.formEsqueciSenha);
router.post('/esqueci-senha', authController.esqueciSenha);

router.get('/definir-senha/:token', authController.formDefinirSenha);
router.post('/definir-senha/:token', authController.definirSenha);

module.exports = router;
