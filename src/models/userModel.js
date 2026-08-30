const supabase = require('../config/supabase');

const TABLE = 'users';

async function createForPerson(personId) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ person_id: personId }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function findByPersonId(personId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, people(*)')
    .eq('person_id', personId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findByPasswordSetToken(token) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, people(*)')
    .eq('password_set_token', token)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Busca usuário autorizado pelo e-mail da pessoa vinculada
 * (join simples via people). Usado no login.
 */
async function findByEmailWithAccess(email) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, people!inner(*)')
    .eq('people.email', email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function grantAccess(userId, { password_set_token, password_set_expires }) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ has_access: false, password_set_token, password_set_expires })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function setPassword(userId, passwordHash) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      password_hash: passwordHash,
      has_access: true,
      password_set_token: null,
      password_set_expires: null,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function findLeaders() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, people(*)')
    .eq('role', 'leader')
    .eq('has_access', true);

  if (error) throw error;
  return data;
}

async function promoteToLeader(personId) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ role: 'leader' })
    .eq('person_id', personId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Busca o papel (líder/membro) de várias pessoas de uma vez, pelo
 * person_id. Usado no mural pra colorir cada balão de mensagem.
 * Retorna um objeto { personId: 'leader' | 'member' }.
 */
async function findRolesByPersonIds(personIds) {
  if (!personIds || personIds.length === 0) return {};

  const { data, error } = await supabase
    .from(TABLE)
    .select('person_id, role')
    .in('person_id', personIds);

  if (error) throw error;

  const mapa = {};
  data.forEach((u) => { mapa[u.person_id] = u.role; });
  return mapa;
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

module.exports = {
  createForPerson,
  findByPersonId,
  findByPasswordSetToken,
  findByEmailWithAccess,
  grantAccess,
  setPassword,
  findById,
  findLeaders,
  promoteToLeader,
  findRolesByPersonIds,
};
