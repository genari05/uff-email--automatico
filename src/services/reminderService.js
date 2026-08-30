const taskModel = require('../models/taskModel');
const emailModel = require('../models/emailModel');
const activityModel = require('../models/activityModel');
const { sendTaskReminderEmail } = require('./emailService');

/**
 * Confere quais tarefas têm lembrete configurado para hoje (ou
 * atrasado, se o servidor estava "dormindo" no dia certo) e
 * envia o e-mail automaticamente.
 *
 * Retorna um resumo pra quem chamou (cron interno ou rota HTTP externa).
 */
async function verificarLembretes() {
  const pendentes = await taskModel.listPendingReminders();
  const agora = new Date();
  let enviados = 0;
  let aindaNaoChegouAHora = 0;
  const erros = [];

  for (const task of pendentes) {
    try {
      // Monta o horário exato do lembrete: data + hora (ou 00:00 se em branco)
      const horario = task.reminder_time && /^\d{2}:\d{2}$/.test(task.reminder_time)
        ? task.reminder_time
        : '00:00';
      const momentoDoLembrete = new Date(`${task.reminder_date}T${horario}:00`);

      if (momentoDoLembrete > agora) {
        // Ainda não chegou a hora marcada - pula por enquanto
        aindaNaoChegouAHora += 1;
        continue;
      }

      let subject = task.reminder_subject;
      let body = task.reminder_body;

      if (task.reminder_type === 'template' && task.reminder_template_id) {
        const template = await emailModel.findTemplateById(task.reminder_template_id);
        if (template) {
          subject = template.subject;
          body = template.body;
        }
      }

      if (!subject) subject = `Lembrete: ${task.title}`;
      if (!body) body = `Este é um lembrete sobre a tarefa "${task.title}", com prazo em ${new Date(task.deadline_date).toLocaleDateString('pt-BR')}.`;

      const html = body.replace(/\n/g, '<br>');
      await sendTaskReminderEmail({ to: task.people.email, subject, html });

      await taskModel.markReminderSent(task.id);
      await activityModel.log(
        `${task.people.name} recebeu o lembrete da tarefa "${task.title}"`,
        'reminder_sent',
        task.id
      );
      enviados += 1;
    } catch (err) {
      console.error(`Erro ao enviar lembrete da tarefa ${task.id}:`, err.message);
      erros.push({ taskId: task.id, erro: err.message });
    }
  }

  return { total: pendentes.length, enviados, aindaNaoChegouAHora, erros };
}

module.exports = { verificarLembretes };
