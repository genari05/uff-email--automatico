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

async function update(id, { name, email }) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ name, email })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function remove(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

/**
 * Gera um novo token de verificação (usado no "reenviar verificação",
 * já que o token antigo pode ter expirado ou o e-mail nunca ter chegado).
 */
async function setVerificationToken(id, { token, expiresAt }) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ verification_token: token, verification_expires: expiresAt })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Usado quando o e-mail de uma pessoa é editado: a verificação antiga
 * não vale mais pro e-mail novo, então volta pra "pendente" com um
 * novo token.
 */
async function resetVerification(id, { token, expiresAt }) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      verified: false,
      verified_at: null,
      verification_token: token,
      verification_expires: expiresAt,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateAvatar(id, avatarUrl) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ avatar_url: avatarUrl })
    .eq('id', id)
    .select()
    .single();

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
  update,
  remove,
  setVerificationToken,
  resetVerification,
  updateAvatar,
};
