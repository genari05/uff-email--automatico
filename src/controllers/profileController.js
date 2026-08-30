const personModel = require('../models/personModel');
const { uploadAvatar } = require('../services/avatarService');

// GET /perfil -> tela do próprio perfil
async function verPerfil(req, res) {
  const pessoa = await personModel.findById(req.user.person_id);
  res.render('people/perfil', { title: 'Meu perfil', pessoa, erro: null, sucesso: null });
}

// POST /perfil/foto -> upload da foto de perfil
async function atualizarFoto(req, res) {
  try {
    if (!req.file) {
      const pessoa = await personModel.findById(req.user.person_id);
      return res.render('people/perfil', {
        title: 'Meu perfil',
        pessoa,
        erro: 'Selecione uma imagem antes de enviar.',
        sucesso: null,
      });
    }

    const avatarUrl = await uploadAvatar({
      personId: req.user.person_id,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
    });

    await personModel.updateAvatar(req.user.person_id, avatarUrl);

    const pessoa = await personModel.findById(req.user.person_id);
    res.render('people/perfil', {
      title: 'Meu perfil',
      pessoa,
      erro: null,
      sucesso: 'Foto atualizada!',
    });
  } catch (err) {
    console.error(err);
    const pessoa = await personModel.findById(req.user.person_id);
    res.render('people/perfil', {
      title: 'Meu perfil',
      pessoa,
      erro: err.message || 'Erro ao enviar a foto. Tente novamente.',
      sucesso: null,
    });
  }
}

module.exports = { verPerfil, atualizarFoto };
