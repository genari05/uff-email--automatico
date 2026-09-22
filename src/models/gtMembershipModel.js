const supabase = require('../config/supabase');

const TABLE = 'gt_memberships';

/**
 * Cria (ou reaproveita) um pedido de entrada de um usuário em um GT.
 * Fica "pending" até o líder daquele GT aprovar ou negar.
 */
async function requestEntry({ gtId, userId }) {
  const existente = await findByGtAndUser(gtId, userId);
  if (existente) return existente;

  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ gt_id: gtId, user_id: userId }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function findByGtAndUser(gtId, userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('gt_id', gtId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, gts(*), users!gt_memberships_user_id_fkey(*, people(*))')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Todos os GTs (aprovados) de que o usuário faz parte, com o papel
 * dele em cada um. Usado no trocador de GT da sidebar.
 */
async function listApprovedByUser(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, gts(*)')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('resolved_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Pedidos de entrada pendentes nos GTs em que o usuário é líder
 * aprovado. Usado na tela de "pedidos pendentes" do líder.
 */
async function listPendingForLeaderGts(userId) {
  const gtsLiderados = await supabase
    .from(TABLE)
    .select('gt_id')
    .eq('user_id', userId)
    .eq('role', 'leader')
    .eq('status', 'approved');

  if (gtsLiderados.error) throw gtsLiderados.error;

  const gtIds = gtsLiderados.data.map((m) => m.gt_id);
  if (gtIds.length === 0) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select('*, gts(*), users!gt_memberships_user_id_fkey(*, people(*))')
    .in('gt_id', gtIds)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (error) throw error;
  return data;
}

async function resolve(id, { status, resolvedBy }) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status, resolved_by: resolvedBy, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Membros aprovados de um GT (com nome/foto da pessoa), pra listar
 * a equipe do GT e pra escolher a quem atribuir tarefas dentro dele.
 */
async function listApprovedMembersOfGt(gtId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, users!gt_memberships_user_id_fkey(*, people(*))')
    .eq('gt_id', gtId)
    .eq('status', 'approved');

  if (error) throw error;
  return data;
}

async function isApprovedLeaderOfGt(gtId, userId) {
  const membership = await findByGtAndUser(gtId, userId);
  return !!(membership && membership.status === 'approved' && membership.role === 'leader');
}

async function isApprovedMemberOfGt(gtId, userId) {
  const membership = await findByGtAndUser(gtId, userId);
  return !!(membership && membership.status === 'approved');
}

/**
 * Encontra o(s) líder(es) aprovado(s) de um GT (pra notificar por
 * e-mail quando chega um pedido de entrada ou uma tarefa cross-GT).
 */
async function findLeadersOfGt(gtId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, users!gt_memberships_user_id_fkey(*, people(*))')
    .eq('gt_id', gtId)
    .eq('role', 'leader')
    .eq('status', 'approved');

  if (error) throw error;
  return data;
}

module.exports = {
  requestEntry,
  findByGtAndUser,
  findById,
  listApprovedByUser,
  listPendingForLeaderGts,
  resolve,
  listApprovedMembersOfGt,
  isApprovedLeaderOfGt,
  isApprovedMemberOfGt,
  findLeadersOfGt,
};
