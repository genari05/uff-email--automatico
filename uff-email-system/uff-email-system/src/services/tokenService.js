const crypto = require('crypto');

/**
 * Gera um token aleatório seguro (usado em links de verificação
 * de e-mail e de criação de senha).
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Retorna uma data de expiração X horas a partir de agora.
 */
function expiresInHours(hours = 24) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

module.exports = { generateToken, expiresInHours };
