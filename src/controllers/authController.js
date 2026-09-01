const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/userModel');
const personModel = require('../models/personModel');
const { generateToken, expiresInHours } = require('../services/tokenService');
const { sendPasswordResetEmail } = require('../services/emailService');

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.nodeEnv === 'production',
  maxAge: 8 * 60 * 60 * 1000, // 8 horas
};

// GET /auth/login
function formLogin(req, res) {
  res.render('auth/login', { title: 'Entrar no sistema', erro: null });
}

// POST /auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await userModel.findByEmailWithAccess((email || '').toLowerCase().trim());

    if (!user || !user.has_access || !user.password_hash) {
      return res.render('auth/login', {
        title: 'Entrar no sistema',
        erro: 'E-mail ou senha inválidos, ou você ainda não tem acesso liberado.',
      });
    }

    const senhaOk = await bcrypt.compare(password || '', user.password_hash);
    if (!senhaOk) {
      return res.render('auth/login', {
        title: 'Entrar no sistema',
        erro: 'E-mail ou senha inválidos.',
      });
    }

    const token = jwt.sign({ userId: user.id }, env.jwtSecret, { expiresIn: '8h' });
    res.cookie('token', token, COOKIE_OPTIONS);
    res.redirect('/pessoas');
  } catch (err) {
    console.error(err);
    res.render('auth/login', { title: 'Entrar no sistema', erro: 'Erro ao entrar. Tente novamente.' });
  }
}

// GET /auth/logout
function logout(req, res) {
  res.clearCookie('token');
  res.redirect('/auth/login');
}

// GET /auth/esqueci-senha
function formEsqueciSenha(req, res) {
  res.render('auth/esqueci-senha', { title: 'Esqueci minha senha', erro: null, sucesso: null });
}

// POST /auth/esqueci-senha
async function esqueciSenha(req, res) {
  // Mensagem sempre igual, independente de o e-mail existir ou não -
  // assim ninguém descobre quais e-mails têm conta só tentando aqui.
  const mensagemPadrao =
    'Se esse e-mail tiver uma conta com acesso liberado, você vai receber um link pra criar uma senha nova em instantes.';

  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const person = await personModel.findByEmail(email);

    if (person) {
      const user = await userModel.findByPersonId(person.id);
      if (user && user.has_access) {
        const token = generateToken();
        await userModel.setPasswordResetToken(user.id, { token, expiresAt: expiresInHours(24) });
        sendPasswordResetEmail({ to: person.email, name: person.name, token }).catch((err) =>
          console.error('Erro ao enviar e-mail de redefinição:', err.message)
        );
      }
    }

    res.render('auth/esqueci-senha', { title: 'Esqueci minha senha', erro: null, sucesso: mensagemPadrao });
  } catch (err) {
    console.error(err);
    res.render('auth/esqueci-senha', { title: 'Esqueci minha senha', erro: null, sucesso: mensagemPadrao });
  }
}

// GET /auth/definir-senha/:token
async function formDefinirSenha(req, res) {
  const { token } = req.params;
  const user = await userModel.findByPasswordSetToken(token);

  if (!user || (user.password_set_expires && new Date(user.password_set_expires) < new Date())) {
    return res.render('auth/definir-senha', {
      title: 'Link inválido',
      erro: 'Link inválido ou expirado. Solicite acesso novamente.',
      tokenValido: false,
      token,
    });
  }

  res.render('auth/definir-senha', {
    title: 'Criar senha de acesso',
    erro: null,
    tokenValido: true,
    token,
  });
}

// POST /auth/definir-senha/:token
async function definirSenha(req, res) {
  try {
    const { token } = req.params;
    const { password, confirmarSenha } = req.body;

    const user = await userModel.findByPasswordSetToken(token);
    if (!user || (user.password_set_expires && new Date(user.password_set_expires) < new Date())) {
      return res.render('auth/definir-senha', {
        title: 'Link inválido',
        erro: 'Link inválido ou expirado.',
        tokenValido: false,
        token,
      });
    }

    if (!password || password.length < 6) {
      return res.render('auth/definir-senha', {
        title: 'Criar senha de acesso',
        erro: 'A senha deve ter pelo menos 6 caracteres.',
        tokenValido: true,
        token,
      });
    }

    if (password !== confirmarSenha) {
      return res.render('auth/definir-senha', {
        title: 'Criar senha de acesso',
        erro: 'As senhas não conferem.',
        tokenValido: true,
        token,
      });
    }

    const hash = await bcrypt.hash(password, 10);
    await userModel.setPassword(user.id, hash);

    res.render('auth/login', {
      title: 'Entrar no sistema',
      erro: null,
      mensagemSucesso: 'Senha criada com sucesso! Faça login abaixo.',
    });
  } catch (err) {
    console.error(err);
    res.render('auth/definir-senha', {
      title: 'Erro',
      erro: 'Erro ao salvar senha. Tente novamente.',
      tokenValido: true,
      token: req.params.token,
    });
  }
}

module.exports = { formLogin, login, logout, formEsqueciSenha, esqueciSenha, formDefinirSenha, definirSenha };
