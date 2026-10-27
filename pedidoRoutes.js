const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.get('/', requireAuth, pedidoController.listarPedidos);

module.exports = router;
