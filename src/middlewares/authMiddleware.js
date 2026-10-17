const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/userModel');

/**
 * Garante que existe um usuário logado E com has_access = true.
 * Usado em todas as rotas do "painel" (listar pessoas, enviar e-mail, etc).
 */
async function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect('/auth/login');

  // 1) Verifica o token em si. Se estiver expirado ou inválido de
  // verdade, aí sim é motivo real pra deslogar.
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    res.clearCookie('token');
    return res.redirect('/auth/login');
  }

  // 2) Busca o usuário no banco. Se der erro AQUI, não é prova de
  // que a sessão é inválida - pode ser só uma instabilidade momentânea
  // de conexão com o Supabase. Nesse caso NÃO desloga a pessoa, só
  // avisa que deu um erro passageiro (o cookie continua valendo).
  try {
    const user = await userModel.findById(payload.userId);

    if (!user || !user.has_access) {
      res.clearCookie('token');
      return res.redirect('/auth/login');
    }

    req.user = user; // disponível nos controllers/views
    res.locals.currentUser = user;
    next();
  } catch (err) {
    console.error('Erro temporário ao verificar sessão (mantida):', err.message);
    res.status(503).send(
      '<div style="font-family:sans-serif;max-width:420px;margin:80px auto;text-align:center;">' +
      '<h2>Erro temporário de conexão</h2>' +
      '<p>Não foi possível confirmar sua sessão agora. Isso não te deslogou - tente de novo.</p>' +
      '<a href="javascript:location.reload()">Tentar novamente</a>' +
      '</div>'
    );
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
