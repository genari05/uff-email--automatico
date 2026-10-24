/**
 * Express 4 não captura erro de função async: se um controller sem
 * try/catch falhar (ex: instabilidade do Supabase), a requisição
 * trava e, em versões novas do Node, o servidor inteiro cai.
 * Este patch manda esses erros pro middleware de erro (página 500).
 */
const Layer = require('express/lib/router/layer');

if (!Layer.prototype.__asyncPatched) {
  const original = Layer.prototype.handle_request;
  Layer.prototype.handle_request = function (req, res, next) {
    const fn = this.handle;
    if (fn.length > 3) return next(); // middleware de erro: não mexe
    try {
      const retorno = fn(req, res, next);
      if (retorno && typeof retorno.catch === 'function') retorno.catch(next);
    } catch (err) {
      next(err);
    }
  };
  Layer.prototype.__asyncPatched = true;
  void original;
}
