const supabase = require('../config/supabase');

const TABLE = 'people';

async function create({ name, email, verification_token, verification_expires }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ name, email, verification_token, verification_expires }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function findByEmail(email) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function findByVerificationToken(token) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('verification_token', token)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function markAsVerified(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      verified: true,
      verified_at: new Date().toISOString(),
      verification_token: null,
      verification_expires: null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listAll({ onlyVerified = false } = {}) {
  let query = supabase.from(TABLE).select('*').order('name', { ascending: true });
  if (onlyVerified) query = query.eq('verified', true);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function findManyByIds(ids) {
  const { data, error } = await supabase.from(TABLE).select('*').in('id', ids);
  if (error) throw error;
  return data;
}

module.exports = {
  create,
  findByEmail,
  findById,
  findByVerificationToken,
  markAsVerified,
  listAll,
  findManyByIds,
};
