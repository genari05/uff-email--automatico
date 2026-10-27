const supabase = require('../config/supabase');

const TABLE = 'access_requests';

async function create(personId, requestType = 'access') {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ person_id: personId, status: 'pending', request_type: requestType }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Pega o pedido mais recente de uma pessoa de um determinado tipo
 * (para saber se ela já está pendente, já foi negada, ou nunca pediu).
 */
async function findLatestByPerson(personId, requestType = 'access') {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('person_id', personId)
    .eq('request_type', requestType)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function listPending(requestType = null) {
  let query = supabase
    .from(TABLE)
    .select('*, people(*)')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (requestType) query = query.eq('request_type', requestType);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function resolve(id, { status, resolvedBy }) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status, resolved_at: new Date().toISOString(), resolved_by: resolvedBy })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, people(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

module.exports = { create, findLatestByPerson, listPending, resolve, findById };
