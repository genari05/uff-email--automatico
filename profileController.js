const bcrypt = require('bcrypt');
const personModel = require('../models/personModel');
const userModel = require('../models/userModel');
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

// POST /perfil/senha -> alterar a própria senha (precisa saber a atual)
async function alterarSenha(req, res) {
  const pessoa = await personModel.findById(req.user.person_id);

  try {
    const { senhaAtual, novaSenha, confirmarNovaSenha } = req.body;

    const senhaAtualOk = await bcrypt.compare(senhaAtual || '', req.user.password_hash || '');
    if (!senhaAtualOk) {
      return res.render('people/perfil', {
        title: 'Meu perfil',
        pessoa,
        erro: 'Senha atual incorreta.',
        sucesso: null,
      });
    }

    if (!novaSenha || novaSenha.length < 6) {
      return res.render('people/perfil', {
        title: 'Meu perfil',
        pessoa,
        erro: 'A nova senha deve ter pelo menos 6 caracteres.',
        sucesso: null,
      });
    }

    if (novaSenha !== confirmarNovaSenha) {
      return res.render('people/perfil', {
        title: 'Meu perfil',
        pessoa,
        erro: 'As senhas não conferem.',
        sucesso: null,
      });
    }

    const hash = await bcrypt.hash(novaSenha, 10);
    await userModel.setPassword(req.user.id, hash);

    res.render('people/perfil', {
      title: 'Meu perfil',
      pessoa,
      erro: null,
      sucesso: 'Senha alterada com sucesso!',
    });
  } catch (err) {
    console.error(err);
    res.render('people/perfil', {
      title: 'Meu perfil',
      pessoa,
      erro: 'Erro ao alterar a senha. Tente novamente.',
      sucesso: null,
    });
  }
}

module.exports = { verPerfil, atualizarFoto, alterarSenha };
