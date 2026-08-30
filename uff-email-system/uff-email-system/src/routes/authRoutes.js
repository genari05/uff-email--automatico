const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.formLogin);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.get('/definir-senha/:token', authController.formDefinirSenha);
router.post('/definir-senha/:token', authController.definirSenha);

module.exports = router;
