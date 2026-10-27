const supabase = require('../config/supabase');

// -------- Templates ("e-mail programado") --------
async function listTemplates() {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function findTemplateById(id) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createTemplate({ title, subject, body, createdBy }) {
  const { data, error } = await supabase
    .from('email_templates')
    .insert([{ title, subject, body, created_by: createdBy }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateTemplate(id, { title, subject, body }) {
  const { data, error } = await supabase
    .from('email_templates')
    .update({ title, subject, body })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteTemplate(id) {
  const { error } = await supabase.from('email_templates').delete().eq('id', id);
  if (error) throw error;
}

// -------- Logs de envio --------
async function logEmail({ senderId, subject, body, recipients, type, templateId = null }) {
  const { data, error } = await supabase
    .from('email_logs')
    .insert([
      {
        sender_id: senderId,
        subject,
        body,
        recipients,
        type,
        template_id: templateId,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listLogs() {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .order('sent_at', { ascending: false });

  if (error) throw error;
  return data;
}

module.exports = {
  listTemplates,
  findTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  logEmail,
  listLogs,
};
