const supabase = require('../config/supabase');

const TABLE = 'gts';

async function listAll() {
  const { data, error } = await supabase.from(TABLE).select('*').order('name', { ascending: true });
  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function findBySlug(slug) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}

module.exports = { listAll, findById, findBySlug };
