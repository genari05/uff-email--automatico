const supabase = require('../config/supabase');

const TABLE = 'activity_log';

async function log(message, type, taskId = null) {
  const { error } = await supabase.from(TABLE).insert([{ message, type, task_id: taskId }]);
  if (error) console.error('Erro ao registrar atividade:', error.message);
}

async function listRecent(limit = 30) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
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
