const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.redirect('/auth/login'));

router.use('/pessoas', require('./personRoutes'));
router.use('/auth', require('./authRoutes'));
router.use('/acesso', require('./accessRequestRoutes'));
router.use('/emails', require('./emailRoutes'));
router.use('/tarefas', require('./taskRoutes'));
router.use('/cron', require('./cronRoutes'));

module.exports = router;
