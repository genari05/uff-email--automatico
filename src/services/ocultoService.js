const { AsyncLocalStorage } = require('async_hooks');
const supabase = require('../config/supabase');

/**
 * Apoio à conta de TI oculta.
 *
 * - contexto: guarda, durante UMA requisição, se quem está agindo é uma
 *   conta oculta. O activityModel.log usa isso pra não registrar nada
 *   no feed (sem precisar mexer em cada controller).
 * - ids ocultos: cache curto (60s) dos users/people ocultos, usado pra
 *   filtrar consultas aninhadas (membros de GT etc) e bloquear rotas.
 */
const contexto = new AsyncLocalStorage();

let cache = { quando: 0, personIds: new Set(), userIds: new Set() };
const TTL_MS = 60 * 1000;

async function carregar() {
  if (Date.now() - cache.quando < TTL_MS) return cache;
  try {
    const { data, error } = await supabase.from('users').select('id, person_id').eq('oculto', true);
    if (error) throw error;
    cache = {
      quando: Date.now(),
      personIds: new Set(data.map((u) => u.person_id)),
      userIds: new Set(data.map((u) => u.id)),
    };
  } catch (err) {
    // Se a migration ainda não rodou (coluna não existe) não derruba o site
    console.error('Aviso: não foi possível ler contas ocultas:', err.message);
    cache.quando = Date.now();
  }
  return cache;
}

async function personIdsOcultos() {
  return (await carregar()).personIds;
}

async function pessoaEhOculta(personId) {
  if (!personId) return false;
  return (await carregar()).personIds.has(personId);
}

async function userEhOculto(userId) {
  if (!userId) return false;
  return (await carregar()).userIds.has(userId);
}

/** Marca a requisição atual como "ação de conta oculta". */
function marcarRequisicaoOculta() {
  contexto.enterWith({ oculto: true });
}

function requisicaoEhOculta() {
  return !!contexto.getStore()?.oculto;
}

/** Tira de uma lista de memberships (com users aninhado) quem é oculto. */
function semOcultos(memberships) {
  return (memberships || []).filter((m) => !m.users?.oculto);
}

module.exports = {
  personIdsOcultos,
  pessoaEhOculta,
  userEhOculto,
  marcarRequisicaoOculta,
  requisicaoEhOculta,
  semOcultos,
};
