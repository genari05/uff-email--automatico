const taskModel = require('../models/taskModel');
const activityModel = require('../models/activityModel');
const personModel = require('../models/personModel');
const userModel = require('../models/userModel');
const emailModel = require('../models/emailModel');
const {
  sendTaskAssignedEmail,
  sendTaskAwaitingApprovalEmail,
  sendTaskDeniedEmail,
} = require('../services/emailService');

// GET /tarefas/nova
async function formNovaTarefa(req, res) {
  const pessoas = await personModel.listAll({ onlyVerified: true });
  const templates = await emailModel.listTemplates();
  res.render('tasks/nova', { title: 'Nova tarefa', erro: null, pessoas, templates });
}

// POST /tarefas
async function criarTarefa(req, res) {
  try {
    const {
      responsibleId,
      title,
      description,
      deadlineDate,
      sendReminder, // 'on' se marcado
      reminderDate,
      reminderType, // 'template' | 'custom'
      reminderTemplateId,
      reminderSubject,
      reminderBody,
    } = req.body;

    const pessoas = await personModel.listAll({ onlyVerified: true });
    const templates = await emailModel.listTemplates();

    if (!responsibleId || !title || !deadlineDate) {
      return res.render('tasks/nova', {
        title: 'Nova tarefa',
        erro: 'Preencha responsável, título e prazo de entrega.',
        pessoas,
        templates,
      });
    }

    const querEnviarLembrete = sendReminder === 'on';
    if (querEnviarLembrete && !reminderDate) {
      return res.render('tasks/nova', {
        title: 'Nova tarefa',
        erro: 'Escolha a data do lembrete, ou desmarque o envio de e-mail.',
        pessoas,
        templates,
      });
    }

    const souLider = req.user.role === 'leader';

    const taskData = {
      title: title.trim(),
      description: description?.trim() || null,
      responsible_person_id: responsibleId,
      created_by: req.user.id,
      status: souLider ? 'pending' : 'aguardando_aprovacao',
      deadline_date: deadlineDate,
      send_reminder: querEnviarLembrete,
      reminder_date: querEnviarLembrete ? reminderDate : null,
      reminder_type: querEnviarLembrete ? reminderType : null,
      reminder_template_id: querEnviarLembrete && reminderType === 'template' ? reminderTemplateId : null,
      reminder_subject: querEnviarLembrete && reminderType === 'custom' ? reminderSubject : null,
      reminder_body: querEnviarLembrete && reminderType === 'custom' ? reminderBody : null,
    };

    const task = await taskModel.create(taskData);

    if (souLider) {
      // Líder atribuindo -> já ativa direto, sem precisar de aprovação
      await activityModel.log(
        `${req.user.people.name} atribuiu a tarefa "${task.title}" para ${task.people.name}`,
        'task_created',
        task.id
      );
      await sendTaskAssignedEmail({
        to: task.people.email,
        name: task.people.name,
        title: task.title,
        description: task.description,
        deadlineDate: new Date(task.deadline_date).toLocaleDateString('pt-BR'),
      });
    } else {
      // Membro atribuindo -> fica aguardando aprovação do líder
      await activityModel.log(
        `${req.user.people.name} quer atribuir a tarefa "${task.title}" para ${task.people.name} (aguardando aprovação)`,
        'task_awaiting_approval',
        task.id
      );
      const leaders = await userModel.findLeaders();
      await Promise.allSettled(
        leaders.map((leader) =>
          sendTaskAwaitingApprovalEmail({
            to: leader.people.email,
            creatorName: req.user.people.name,
            responsibleName: task.people.name,
            title: task.title,
          })
        )
      );
    }

    res.redirect('/tarefas');
  } catch (err) {
    console.error(err);
    const pessoas = await personModel.listAll({ onlyVerified: true });
    const templates = await emailModel.listTemplates();
    res.render('tasks/nova', {
      title: 'Nova tarefa',
      erro: 'Erro ao criar tarefa. Tente novamente.',
      pessoas,
      templates,
    });
  }
}

// GET /tarefas -> painel geral da equipe
async function listarTarefas(req, res) {
  const tarefas = await taskModel.listVisible();
  const atividades = await activityModel.listRecent(30);
  res.render('tasks/lista', { title: 'Tarefas', tarefas, atividades });
}

// GET /tarefas/minhas -> tarefas da pessoa logada
async function minhasTarefas(req, res) {
  const tarefas = await taskModel.listByResponsible(req.user.person_id);
  res.render('tasks/minhas', { title: 'Minhas tarefas', tarefas });
}

// POST /tarefas/:id/concluir
async function concluirTarefa(req, res) {
  try {
    const { id } = req.params;
    const task = await taskModel.findById(id);

    if (!task) return res.redirect('/tarefas/minhas');

    // Só a própria pessoa responsável (ou o líder) pode marcar como concluída
    if (task.responsible_person_id !== req.user.person_id && req.user.role !== 'leader') {
      return res.redirect('/tarefas/minhas');
    }

    const atualizada = await taskModel.markCompleted(id);
    await activityModel.log(
      `${atualizada.people.name} concluiu a tarefa "${atualizada.title}"`,
      'task_completed',
      atualizada.id
    );

    res.redirect('/tarefas/minhas');
  } catch (err) {
    console.error(err);
    res.redirect('/tarefas/minhas');
  }
}

// GET /tarefas/aprovacao -> painel do líder (tarefas aguardando aprovação)
async function listarAprovacao(req, res) {
  const tarefas = await taskModel.listAwaitingApproval();
  res.render('tasks/aprovacao', { title: 'Aprovar tarefas', tarefas });
}

// POST /tarefas/:id/aprovar
async function resolverAprovacao(req, res) {
  try {
    const { id } = req.params;
    const { decisao } = req.body; // 'pending' (aprovar) | 'denied' (negar)

    const task = await taskModel.findById(id);
    if (!task) return res.redirect('/tarefas/aprovacao');

    const criador = await userModel.findById(task.created_by);
    const atualizada = await taskModel.resolveApproval(id, {
      status: decisao,
      approvedBy: req.user.id,
    });

    if (decisao === 'pending') {
      await activityModel.log(
        `Tarefa "${atualizada.title}" para ${atualizada.people.name} foi aprovada`,
        'task_approved',
        atualizada.id
      );
      await sendTaskAssignedEmail({
        to: atualizada.people.email,
        name: atualizada.people.name,
        title: atualizada.title,
        description: atualizada.description,
        deadlineDate: new Date(atualizada.deadline_date).toLocaleDateString('pt-BR'),
      });
    } else {
      await activityModel.log(
        `Tarefa "${atualizada.title}" para ${atualizada.people.name} foi negada pelo líder`,
        'task_denied',
        atualizada.id
      );
      if (criador?.people?.email) {
        await sendTaskDeniedEmail({
          to: criador.people.email,
          creatorName: criador.people.name,
          responsibleName: atualizada.people.name,
          title: atualizada.title,
        });
      }
    }

    res.redirect('/tarefas/aprovacao');
  } catch (err) {
    console.error(err);
    res.redirect('/tarefas/aprovacao');
  }
}

// GET /tarefas/desempenho -> estatísticas gerais da equipe (só líder)
async function desempenho(req, res) {
  const tarefas = await taskModel.listAllForStats();

  const resumo = {
    total: tarefas.length,
    pendentes: tarefas.filter((t) => t.status === 'pending').length,
    concluidas: tarefas.filter((t) => t.status === 'completed').length,
    negadas: tarefas.filter((t) => t.status === 'denied').length,
    aguardandoAprovacao: tarefas.filter((t) => t.status === 'aguardando_aprovacao').length,
  };

  // Agrupa por pessoa responsável
  const porPessoaMap = new Map();
  for (const t of tarefas) {
    if (t.status === 'aguardando_aprovacao' || t.status === 'denied') continue; // só tarefas ativas contam pro desempenho
    const key = t.people.id;
    if (!porPessoaMap.has(key)) {
      porPessoaMap.set(key, { nome: t.people.name, email: t.people.email, total: 0, pendentes: 0, concluidas: 0 });
    }
    const entry = porPessoaMap.get(key);
    entry.total += 1;
    if (t.status === 'completed') entry.concluidas += 1;
    else entry.pendentes += 1;
  }
  const porPessoa = Array.from(porPessoaMap.values()).sort((a, b) => b.total - a.total);

  res.render('tasks/desempenho', { title: 'Desempenho da equipe', resumo, porPessoa });
}

module.exports = {
  formNovaTarefa,
  criarTarefa,
  listarTarefas,
  minhasTarefas,
  concluirTarefa,
  listarAprovacao,
  resolverAprovacao,
  desempenho,
};
