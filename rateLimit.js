/**
 * Limitador simples em memória (sem dependências), pra frear tentativa
 * de adivinhar senha. Conta por IP + e-mail numa janela de tempo.
 */
function criarLimitador({ max = 10, janelaMs = 15 * 60 * 1000, chave }) {
  const tentativas = new Map();

  setInterval(() => {
    const agora = Date.now();
    for (const [k, v] of tentativas) if (v.expira < agora) tentativas.delete(k);
  }, janelaMs).unref();

  return function limitar(req, res, next) {
    const k = chave(req);
    const agora = Date.now();
    const atual = tentativas.get(k);

    if (!atual || atual.expira < agora) {
      tentativas.set(k, { n: 1, expira: agora + janelaMs });
      return next();
    }
    atual.n += 1;
    if (atual.n > max) {
      const minutos = Math.ceil((atual.expira - agora) / 60000);
      return res.status(429).render('auth/login', {
        title: 'Entrar no sistema',
        erro: `Muitas tentativas. Aguarde ${minutos} minuto(s) e tente de novo.`,
      });
    }
    next();
  };
}

module.exports = { criarLimitador };
