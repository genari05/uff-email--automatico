const express = require('express');
const router = express.Router();
const tiController = require('../controllers/tiController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireTi } = require('../middlewares/tiMiddleware');

router.use(requireAuth, requireTi); // só a conta de TI

router.get('/gts', tiController.telaGts);
router.post('/gts', tiController.salvarGts);

module.exports = router;
