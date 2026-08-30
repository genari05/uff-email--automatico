const supabase = require('../config/supabase');

const TABLE = 'activity_log';

/**
 * Registra uma atividade no mural. `personId` é a pessoa "dona" da
 * mensagem (nome + foto aparecem no balão, estilo grupo de WhatsApp).
 */
async function log(description, type, taskId = null, personId = null) {
  const { error } = await supabase
    .from(TABLE)
    .insert([{ message: description, type, task_id: taskId, person_id: personId }]);
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

async function deleteByTask(taskId) {
  const { error } = await supabase.from(TABLE).delete().eq('task_id', taskId);
  if (error) console.error('Erro ao remover atividades da tarefa:', error.message);
}

module.exports = { log, listRecent, deleteByTask };
