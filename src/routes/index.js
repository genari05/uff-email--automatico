const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.redirect('/auth/login'));

router.use('/pessoas', require('./personRoutes'));
router.use('/auth', require('./authRoutes'));
router.use('/novidades', require('./novidadesRoutes'));
router.use('/historico', require('./historicoRoutes'));
router.use('/pedidos', require('./pedidoRoutes'));
router.use('/acesso', require('./accessRequestRoutes'));
router.use('/emails', require('./emailRoutes'));
router.use('/tarefas', require('./taskRoutes'));
router.use('/cron', require('./cronRoutes'));
router.use('/perfil', require('./profileRoutes'));
router.use('/gts', require('./gtRoutes'));
router.use('/ti', require('./tiRoutes'));

module.exports = router;
