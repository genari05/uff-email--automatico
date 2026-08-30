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

module.exports = { log, listRecent };
