const express = require('express');
const multer = require('multer');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middlewares/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});

router.use(requireAuth);

router.get('/', profileController.verPerfil);
router.post('/foto', upload.single('foto'), profileController.atualizarFoto);

module.exports = router;
