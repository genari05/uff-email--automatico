const express = require('express');
const router = express.Router();
const novidades = require('../data/novidades');
const userModel = require('../models/userModel');
const { requireAuth } = require('../middlewares/authMiddleware');

// POST /novidades/visto -> marca o alerta "o que mudou" como lido (uma vez por pessoa)
router.post('/visto', requireAuth, async (req, res) => {
  res.cookie('novidades_ok', novidades.versao, { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 365 });
  try {
    await userModel.marcarNovidadesVistas(req.user.id, novidades.versao);
  } catch (err) {
    console.error('Não foi possível gravar o alerta de novidades (migração rodada?):', err.message);
  }
  res.status(204).end();
});

module.exports = router;
