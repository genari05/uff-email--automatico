const express = require('express');
const router = express.Router();
const historicoController = require('../controllers/historicoController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireLeader } = require('../middlewares/leaderMiddleware');

router.get('/', requireAuth, requireLeader, historicoController.listarHistorico);

module.exports = router;
