const auditModel = require('../models/auditModel');

const MAX = 400;
const texto = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  return s.length > MAX ? s.slice(0, MAX) + '…' : s;
};

/**
 * Compara "antes" e "depois" e devolve só o que mudou:
 * campos = [{ chave, rotulo, fmt? }] -> [{ campo, de, para }]
 */
function diff(antes, depois, campos) {
  const out = [];
  campos.forEach(({ chave, rotulo, fmt }) => {
    const f = fmt || ((x) => x);
    const a = f(antes[chave]);
    const d = f(depois[chave]);
    const norm = (x) => (x === null || x === undefined || x === '' ? '' : String(x).trim());
    if (norm(a) !== norm(d)) out.push({ campo: rotulo, de: texto(a), para: texto(d) });
  });
  return out;
}

/**
 * Registra uma edição/exclusão. Nunca derruba a ação principal:
 * se falhar (ex.: tabela ainda não criada), só avisa no log do servidor.
 * Ações da conta de TI ficam marcadas e só o próprio TI enxerga.
 */
async function registrar(req, { acao, entidade, id = null, rotulo = null, gtNome = null, mudancas = null, snapshot = null }) {
  try {
    if (acao === 'edit' && (!mudancas || mudancas.length === 0)) return;
    await auditModel.insert({
      actor_user_id: req.user.id,
      actor_name: req.user.people?.name || 'Desconhecido',
      actor_oculto: !!(req.user.oculto || req.user.isTi),
      action: acao,
      entity_type: entidade,
      entity_id: id ? String(id) : null,
      entity_label: rotulo ? texto(rotulo) : null,
      gt_name: gtNome,
      changes: mudancas,
      snapshot,
    });
  } catch (err) {
    console.error('Falha ao gravar histórico:', err.message);
  }
}

module.exports = { registrar, diff };
