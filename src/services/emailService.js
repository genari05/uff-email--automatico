const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure, // true para 465, false para outras portas
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

/**
 * Envio genérico de e-mail (usado por todas as funções abaixo).
 */
async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: env.smtp.from,
    to,
    subject,
    html,
  });
}

/**
 * E-mail de verificação de cadastro (pessoa confirma que o e-mail é dela).
 */
async function sendVerificationEmail({ to, name, token }) {
  const link = `${env.appUrl}/pessoas/verificar/${token}`;
  return sendMail({
    to,
    subject: 'Confirme seu e-mail - Sistema UFF',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Olá, ${name}!</h2>
        <p>Você foi cadastrado(a) no sistema de e-mails da UFF.</p>
        <p>Para confirmar que este é o seu e-mail, clique no botão abaixo:</p>
        <p>
          <a href="${link}"
             style="display:inline-block;padding:12px 24px;background:#0b5ea8;color:#fff;
                    text-decoration:none;border-radius:6px;">
            Confirmar meu e-mail
          </a>
        </p>
        <p>Ou copie e cole este link no navegador:<br>${link}</p>
        <p style="color:#888;font-size:12px;">Este link expira em 24 horas.</p>
      </div>
    `,
  });
}

/**
 * E-mail avisando que o pedido de acesso foi APROVADO, com link
 * para a pessoa definir a própria senha de acesso ao sistema.
 */
async function sendAccessApprovedEmail({ to, name, token }) {
  const link = `${env.appUrl}/auth/definir-senha/${token}`;
  return sendMail({
    to,
    subject: 'Acesso liberado - Sistema UFF',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Boas notícias, ${name}!</h2>
        <p>Seu pedido de acesso ao sistema de e-mails da UFF foi <b>aprovado</b>.</p>
        <p>Clique no botão abaixo para criar sua senha de acesso:</p>
        <p>
          <a href="${link}"
             style="display:inline-block;padding:12px 24px;background:#0b5ea8;color:#fff;
                    text-decoration:none;border-radius:6px;">
            Criar minha senha
          </a>
        </p>
        <p style="color:#888;font-size:12px;">Este link expira em 24 horas.</p>
      </div>
    `,
  });
}

/**
 * Avisa o(s) líder(es) que um novo pedido de acesso chegou.
 */
async function sendNewAccessRequestEmail({ to, requesterName }) {
  const link = `${env.appUrl}/acesso/pendentes`;
  return sendMail({
    to,
    subject: 'Novo pedido de acesso - Sistema UFF',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Novo pedido de acesso</h2>
        <p><b>${requesterName}</b> solicitou acesso ao sistema de e-mails da UFF.</p>
        <p>
          <a href="${link}"
             style="display:inline-block;padding:12px 24px;background:#0b5ea8;color:#fff;
                    text-decoration:none;border-radius:6px;">
            Ver pedidos pendentes
          </a>
        </p>
      </div>
    `,
  });
}

/**
 * Avisa o(s) líder(es) que alguém quer virar líder também.
 */
async function sendNewLeaderRequestEmail({ to, requesterName }) {
  const link = `${env.appUrl}/acesso/pendentes`;
  return sendMail({
    to,
    subject: 'Pedido para virar líder - Sistema UFF',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Pedido de promoção a líder</h2>
        <p><b>${requesterName}</b> solicitou se tornar líder do sistema de e-mails da UFF.</p>
        <p>
          <a href="${link}"
             style="display:inline-block;padding:12px 24px;background:#0b5ea8;color:#fff;
                    text-decoration:none;border-radius:6px;">
            Ver pedidos pendentes
          </a>
        </p>
      </div>
    `,
  });
}

/**
 * Avisa a pessoa responsável que recebeu uma nova tarefa.
 */
async function sendTaskAssignedEmail({ to, name, title, description, deadlineDate }) {
  return sendMail({
    to,
    subject: `Nova tarefa: ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Olá, ${name}!</h2>
        <p>Você recebeu uma nova tarefa no sistema UFF:</p>
        <p style="padding:12px; background:#f4f6f8; border-radius:6px;">
          <b>${title}</b><br>
          ${description ? description.replace(/\n/g, '<br>') + '<br>' : ''}
          Prazo de entrega: <b>${deadlineDate}</b>
        </p>
        <p>Acesse o sistema e vá em "Minhas tarefas" para acompanhar.</p>
      </div>
    `,
  });
}

/**
 * Lembrete automático da tarefa, na data configurada por quem criou.
 * Pode usar assunto/corpo customizado (subject/html já prontos).
 */
async function sendTaskReminderEmail({ to, subject, html }) {
  return sendMail({ to, subject, html });
}

/**
 * Avisa o(s) líder(es) que um membro quer atribuir uma tarefa e
 * está aguardando aprovação.
 */
async function sendTaskAwaitingApprovalEmail({ to, creatorName, responsibleName, title }) {
  const link = `${env.appUrl}/tarefas/aprovacao`;
  return sendMail({
    to,
    subject: 'Tarefa aguardando aprovação - Sistema UFF',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Nova tarefa para aprovar</h2>
        <p><b>${creatorName}</b> quer atribuir a tarefa "<b>${title}</b>" para <b>${responsibleName}</b>.</p>
        <p>
          <a href="${link}"
             style="display:inline-block;padding:12px 24px;background:#0b5ea8;color:#fff;
                    text-decoration:none;border-radius:6px;">
            Avaliar pedido
          </a>
        </p>
      </div>
    `,
  });
}

/**
 * Avisa quem criou a tarefa que ela foi negada pelo líder.
 */
async function sendTaskDeniedEmail({ to, creatorName, responsibleName, title }) {
  return sendMail({
    to,
    subject: 'Tarefa negada - Sistema UFF',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Olá, ${creatorName}</h2>
        <p>A tarefa "<b>${title}</b>" que você tentou atribuir para <b>${responsibleName}</b> não foi aprovada pelo líder.</p>
      </div>
    `,
  });
}

/**
 * Envio em massa (template "programado" ou personalizado) para
 * a lista de destinatários selecionada pelo usuário autorizado.
 */
async function sendBulkEmail({ recipients, subject, html }) {
  const results = await Promise.allSettled(
    recipients.map((to) => sendMail({ to, subject, html }))
  );

  const success = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - success;

  return { success, failed, results };
}

module.exports = {
  sendMail,
  sendVerificationEmail,
  sendAccessApprovedEmail,
  sendNewAccessRequestEmail,
  sendNewLeaderRequestEmail,
  sendTaskAssignedEmail,
  sendTaskReminderEmail,
  sendTaskAwaitingApprovalEmail,
  sendTaskDeniedEmail,
  sendBulkEmail,
};
