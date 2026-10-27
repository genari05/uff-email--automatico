const supabase = require('../config/supabase');

const TABLE = 'audit_log';

async function insert(row) {
  const { error } = await supabase.from(TABLE).insert([row]);
  if (error) throw error;
}

async function list({ incluirOcultos = false, acao = null, tipo = null, limit = 200 } = {}) {
  let q = supabase.from(TABLE).select('*').order('created_at', { ascending: false }).limit(limit);
  if (!incluirOcultos) q = q.eq('actor_oculto', false);
  if (acao) q = q.eq('action', acao);
  if (tipo) q = q.eq('entity_type', tipo);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

module.exports = { insert, list };
