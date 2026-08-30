const taskModel = require('../models/taskModel');
const activityModel = require('../models/activityModel');
const personModel = require('../models/personModel');
const userModel = require('../models/userModel');
const emailModel = require('../models/emailModel');
const { verificarLembretes } = require('../services/reminderService');
const {
  sendTaskAssignedEmail,
  sendTaskAwaitingApprovalEmail,
  sendTaskDeniedEmail,
} = require('../services/emailService');

// GET /tarefas/nova
async function formNovaTarefa(req, res) {
  const pessoas = await personModel.listAll({ onlyVerified: true });
  const templates = await emailModel.listTemplates();
  const today = new Date().toISOString().slice(0, 10);
  res.render('tasks/nova', { title: 'Nova tarefa', erro: null, pessoas, templates, today });
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
      reminderTime, // 'HH:MM', opcional
      reminderType, // 'template' | 'custom'
      reminderTemplateId,
      reminderSubject,
      reminderBody,
    } = req.body;

    const pessoas = await personModel.listAll({ onlyVerified: true });
    const templates = await emailModel.listTemplates();
    const today = new Date().toISOString().slice(0, 10);

    if (!responsibleId || !title || !deadlineDate) {
      return res.render('tasks/nova', {
        title: 'Nova tarefa',
        erro: 'Preencha responsável, título e prazo de entrega.',
        pessoas,
        templates,
        today,
      });
    }

    // REGRA: o prazo de entrega não pode ser uma data que já passou
    if (deadlineDate < today) {
      return res.render('tasks/nova', {
        title: 'Nova tarefa',
        erro: 'O prazo de entrega não pode ser uma data no passado.',
        pessoas,
        templates,
        today,
      });
    }

    const querEnviarLembrete = sendReminder === 'on';

    if (querEnviarLembrete) {
      if (!reminderDate) {
        return res.render('tasks/nova', {
          title: 'Nova tarefa',
          erro: 'Escolha a data do lembrete, ou desmarque o envio de e-mail.',
          pessoas,
          templates,
          today,
        });
      }

      // REGRA: o lembrete não pode ser marcado pra uma data que já passou
      if (reminderDate < today) {
        return res.render('tasks/nova', {
          title: 'Nova tarefa',
          erro: 'A data do lembrete não pode ser no passado.',
          pessoas,
          templates,
          today,
        });
      }

      // REGRA: não faz sentido lembrar depois que a tarefa já venceu
      if (reminderDate > deadlineDate) {
        return res.render('tasks/nova', {
          title: 'Nova tarefa',
          erro: 'A data do lembrete não pode ser depois do prazo de entrega.',
          pessoas,
          templates,
          today,
        });
      }

      // REGRA: se preencher o horário, precisa estar no formato HH:MM
      if (reminderTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) {
        return res.render('tasks/nova', {
          title: 'Nova tarefa',
          erro: 'Horário do lembrete inválido.',
          pessoas,
          templates,
          today,
        });
      }
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
      reminder_time: querEnviarLembrete && reminderTime ? reminderTime : null,
      reminder_type: querEnviarLembrete ? reminderType : null,
      reminder_template_id: querEnviarLembrete && reminderType === 'template' ? reminderTemplateId : null,
      reminder_subject: querEnviarLembrete && reminderType === 'custom' ? reminderSubject : null,
      reminder_body: querEnviarLembrete && reminderType === 'custom' ? reminderBody : null,
    };

    const task = await taskModel.create(taskData);

    if (souLider) {
      // Líder atribuindo -> já ativa direto, sem precisar de aprovação
      await activityModel.log(
        `Recebeu a tarefa "${task.title}" de ${req.user.people.name}`,
        'task_created',
        task.id,
        task.responsible_person_id
      );
      await sendTaskAssignedEmail({
        to: task.people.email,
        name: task.people.name,
        title: task.title,
        description: task.description,
        deadlineDate: new Date(task.deadline_date).toLocaleDateString('pt-BR'),
      }).catch((err) => console.error('Erro ao notificar responsável pela tarefa:', err.message));
    } else {
      // Membro atribuindo -> fica aguardando aprovação do líder
      await activityModel.log(
        `Pediu para atribuir a tarefa "${task.title}" para ${task.people.name} (aguardando aprovação)`,
        'task_awaiting_approval',
        task.id,
        req.user.person_id
      );
      const leaders = await userModel.findLeaders();
      leaders.forEach((leader) => {
        sendTaskAwaitingApprovalEmail({
          to: leader.people.email,
          creatorName: req.user.people.name,
          responsibleName: task.people.name,
          title: task.title,
        }).catch((err) => console.error('Erro ao notificar líder sobre tarefa:', err.message));
      });
    }

    res.redirect('/tarefas');
  } catch (err) {
    console.error(err);
    const pessoas = await personModel.listAll({ onlyVerified: true });
    const templates = await emailModel.listTemplates();
    const today = new Date().toISOString().slice(0, 10);
    res.render('tasks/nova', {
      title: 'Nova tarefa',
      erro: 'Erro ao criar tarefa. Tente novamente.',
      pessoas,
      templates,
      today,
    });
  }
}

// GET /tarefas -> painel geral da equipe
async function listarTarefas(req, res) {
  const tarefas = await taskModel.listVisible();
  const atividades = await activityModel.listRecent(30);

  // Busca o papel (líder/membro) de cada pessoa que aparece no mural,
  // pra colorir cada balão de mensagem (azul = membro, dourado = líder)
  const idsUnicos = [...new Set(atividades.filter((a) => a.person_id).map((a) => a.person_id))];
  const papeis = await userModel.findRolesByPersonIds(idsUnicos);
  const atividadesComPapel = atividades.map((a) => ({ ...a, papel: papeis[a.person_id] || 'member' }));

  res.render('tasks/lista', { title: 'Tarefas', tarefas, atividades: atividadesComPapel });
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
      `Concluiu a tarefa "${atualizada.title}"`,
      'task_completed',
      atualizada.id,
      atualizada.responsible_person_id
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

    const criador = task.created_by ? await userModel.findById(task.created_by) : null;
    const atualizada = await taskModel.resolveApproval(id, {
      status: decisao,
      approvedBy: req.user.id,
    });

    if (decisao === 'pending') {
      await activityModel.log(
        `Teve a tarefa "${atualizada.title}" aprovada`,
        'task_approved',
        atualizada.id,
        atualizada.responsible_person_id
      );
      sendTaskAssignedEmail({
        to: atualizada.people.email,
        name: atualizada.people.name,
        title: atualizada.title,
        description: atualizada.description,
        deadlineDate: new Date(atualizada.deadline_date).toLocaleDateString('pt-BR'),
      }).catch((err) => console.error('Erro ao notificar aprovação de tarefa:', err.message));
    } else {
      await activityModel.log(
        `Teve a tarefa "${atualizada.title}" (para ${atualizada.people.name}) negada pelo líder`,
        'task_denied',
        atualizada.id,
        criador?.person_id || null
      );
      if (criador?.people?.email) {
        sendTaskDeniedEmail({
          to: criador.people.email,
          creatorName: criador.people.name,
          responsibleName: atualizada.people.name,
          title: atualizada.title,
        }).catch((err) => console.error('Erro ao notificar negação de tarefa:', err.message));
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

// POST /tarefas/:id/excluir -> só o líder pode excluir
async function excluirTarefa(req, res) {
  try {
    const { id } = req.params;
    const task = await taskModel.findById(id);
    if (!task) return res.redirect('/tarefas');

    // Apaga o rastro dessa tarefa no mural também (sem deixar nem
    // um aviso novo de exclusão) - some por completo.
    await activityModel.deleteByTask(id);
    await taskModel.remove(id);

    res.redirect('/tarefas');
  } catch (err) {
    console.error(err);
    res.redirect('/tarefas');
  }
}

// GET /tarefas/lembretes -> controle de status de envio dos lembretes
async function statusLembretes(req, res) {
  const tarefas = await taskModel.listWithReminder();
  const agora = new Date();

  const comStatus = tarefas.map((t) => {
    const horario = t.reminder_time && /^\d{2}:\d{2}$/.test(t.reminder_time) ? t.reminder_time : '00:00';
    const momento = new Date(`${t.reminder_date}T${horario}:00`);

    let situacao;
    if (t.reminder_sent) situacao = 'enviado';
    else if (momento <= agora) situacao = 'atrasado'; // já passou da hora e ainda não foi (servidor deve ter ficado offline no momento)
    else situacao = 'agendado';

    return { ...t, situacao, momento };
  });

  res.render('tasks/lembretes', {
    title: 'Status de e-mails',
    tarefas: comStatus,
    resultado: req.query.resultado || null,
  });
}

// POST /tarefas/lembretes/verificar-agora -> força a checagem na hora, sem esperar o relógio
async function forcarVerificacao(req, res) {
  try {
    const resultado = await verificarLembretes();
    const resumo = `enviados:${resultado.enviados}|aguardando:${resultado.aindaNaoChegouAHora}|erros:${resultado.erros.length}`;
    res.redirect(`/tarefas/lembretes?resultado=${encodeURIComponent(resumo)}`);
  } catch (err) {
    console.error(err);
    res.redirect('/tarefas/lembretes?resultado=erro');
  }
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
  excluirTarefa,
  statusLembretes,
  forcarVerificacao,
};
