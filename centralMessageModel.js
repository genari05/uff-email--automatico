const supabase = require('../config/supabase');

const TABLE = 'central_messages';

/**
 * Posta uma mensagem no mural central (visível a todos os GTs),
 * assinada com o GT de quem escreveu.
 */
async function create({ gtId, authorUserId, message }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ gt_id: gtId, author_user_id: authorUserId, message }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mensagens recentes do mural central, com o GT autor e a pessoa
 * que escreveu (pra mostrar nome + foto + cor do GT no balão).
 */
async function listRecent(limit = 50) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, gts(*), users:author_user_id(*, people(*))')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function updateMessage(id, message) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ message, edited_at: new Date().toISOString() })
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

module.exports = { create, listRecent, findById, updateMessage, remove };
