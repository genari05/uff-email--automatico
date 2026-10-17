const supabase = require('../config/supabase');

const TABLE = 'activity_log';

/**
 * Registra uma atividade no mural. `personId` é a pessoa "dona" da
 * mensagem (nome + foto aparecem no balão, estilo grupo de WhatsApp).
 * `gtId` marca de qual GT é essa atividade (null = mural geral, sem GT).
 */
async function log(description, type, taskId = null, personId = null, gtId = null) {
  const { error } = await supabase
    .from(TABLE)
    .insert([{ message: description, type, task_id: taskId, person_id: personId, gt_id: gtId }]);
  if (error) console.error('Erro ao registrar atividade:', error.message);
}

async function listRecent(limit = 30) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, people:person_id(*)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/**
 * Mural interno de UM GT específico (idêntico ao mural geral, só que
 * filtrado por gt_id - cada GT tem o próprio "grupo de WhatsApp").
 */
async function listRecentByGt(gtId, limit = 30) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, people:person_id(*)')
    .eq('gt_id', gtId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

async function deleteByTask(taskId) {
  const { error } = await supabase.from(TABLE).delete().eq('task_id', taskId);
  if (error) console.error('Erro ao remover atividades da tarefa:', error.message);
}

module.exports = { log, listRecent, listRecentByGt, deleteByTask };
