const express = require('express');
const router = express.Router();
const accessRequestController = require('../controllers/accessRequestController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireLeader } = require('../middlewares/leaderMiddleware');

// Públicas (pessoa sem login solicitando acesso)
router.get('/solicitar', accessRequestController.formSolicitar);
router.post('/solicitar', accessRequestController.solicitar);
router.get('/status', accessRequestController.formStatus);
router.get('/status/consultar', accessRequestController.verStatus);

// Protegida - qualquer membro logado pode pedir para virar líder
router.get('/virar-lider', requireAuth, accessRequestController.formSolicitarLider);
router.post('/virar-lider', requireAuth, accessRequestController.solicitarLider);

// Protegidas - só o líder aprova/nega
router.get('/pendentes', (req, res) => res.redirect('/pedidos'));
router.post('/:id/resolver', requireAuth, requireLeader, accessRequestController.resolver);

module.exports = router;
