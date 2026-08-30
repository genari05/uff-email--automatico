const supabase = require('../config/supabase');

const TABLE = 'tasks';

async function create(data) {
  const { data: row, error } = await supabase.from(TABLE).insert([data]).select('*, people:responsible_person_id(*)').single();
  if (error) throw error;
  return row;
}

async function findById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, people:responsible_person_id(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Lista geral de tarefas para o painel da equipe (todas, exceto
 * as que ainda estão aguardando aprovação - essas só o líder vê).
 */
async function listVisible() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, people:responsible_person_id(*)')
    .in('status', ['pending', 'completed', 'denied'])
    .order('deadline_date', { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Tarefas de uma pessoa específica (para a tela "Minhas tarefas").
 * Só mostra tarefas já ativas (aprovadas), não as pendentes de aprovação.
 */
async function listByResponsible(personId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, people:responsible_person_id(*)')
    .eq('responsible_person_id', personId)
    .in('status', ['pending', 'completed'])
    .order('deadline_date', { ascending: true });
  if (error) throw error;
  return data;
}

async function listAwaitingApproval() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, people:responsible_person_id(*)')
    .eq('status', 'aguardando_aprovacao')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Tarefas com lembrete pendente de envio: já ativas, com lembrete
 * ligado, ainda não enviado, e a data já chegou (ou passou, caso
 * o servidor estivesse "dormindo" no dia certo). A checagem fina
 * de horário (quando tem) é feita em reminderService.js.
 */
async function listPendingReminders() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, people:responsible_person_id(*)')
    .eq('status', 'pending')
    .eq('send_reminder', true)
    .eq('reminder_sent', false)
    .lte('reminder_date', today);
  if (error) throw error;
  return data;
}

async function markReminderSent(id) {
  const { error } = await supabase
    .from(TABLE)
    .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

async function markCompleted(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, people:responsible_person_id(*)')
    .single();
  if (error) throw error;
  return data;
}

async function resolveApproval(id, { status, approvedBy }) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status, approved_by: approvedBy, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, people:responsible_person_id(*)')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Todas as tarefas, de todos os status, para a tela de desempenho
 * da equipe (só o líder vê essa visão completa).
 */
async function listAllForStats() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, people:responsible_person_id(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Todas as tarefas que têm lembrete configurado (enviado ou não),
 * para a tela de controle de status de e-mails.
 */
async function listWithReminder() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, people:responsible_person_id(*)')
    .eq('send_reminder', true)
    .in('status', ['pending', 'completed'])
    .order('reminder_date', { ascending: true });
  if (error) throw error;
  return data;
}

async function remove(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

module.exports = {
  create,
  findById,
  listVisible,
  listByResponsible,
  listAwaitingApproval,
  listPendingReminders,
  markReminderSent,
  markCompleted,
  resolveApproval,
  listAllForStats,
  remove,
  listWithReminder,
};
