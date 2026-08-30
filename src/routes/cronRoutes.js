const express = require('express');
const router = express.Router();
const env = require('../config/env');
const { verificarLembretes } = require('../services/reminderService');

/**
 * GET /cron/lembretes?token=SEU_CRON_SECRET
 *
 * Feito para ser chamado por um serviço externo (ex: cron-job.org)
 * uma vez por dia, garantindo que os lembretes disparem mesmo se
 * o servidor estiver "dormindo" (planos gratuitos como o Render).
 */
router.get('/lembretes', async (req, res) => {
  if (req.query.token !== env.cronSecret) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const resultado = await verificarLembretes();
    res.json({ ok: true, ...resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Erro ao verificar lembretes' });
  }
});

module.exports = router;
