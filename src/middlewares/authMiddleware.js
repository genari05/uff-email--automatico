const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/userModel');

/**
 * Garante que existe um usuário logado E com has_access = true.
 * Usado em todas as rotas do "painel" (listar pessoas, enviar e-mail, etc).
 */
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.redirect('/auth/login');

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await userModel.findById(payload.userId);

    if (!user || !user.has_access) {
      res.clearCookie('token');
      return res.redirect('/auth/login');
    }

    req.user = user; // disponível nos controllers/views
    res.locals.currentUser = user;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.redirect('/auth/login');
  }
}

/**
 * Igual ao requireAuth, mas NUNCA bloqueia o acesso - só detecta se
 * tem alguém logado (pra montar req.user/currentUser) e segue em
 * frente de qualquer jeito. Usado em rotas públicas que precisam se
 * comportar diferente pra quem já está logado (ex: cadastrar pessoa).
 */
async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return next();

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await userModel.findById(payload.userId);

    if (user && user.has_access) {
      req.user = user;
      res.locals.currentUser = user;
    }
  } catch (err) {
    // token inválido/expirado - trata como visitante não logado, sem erro
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
