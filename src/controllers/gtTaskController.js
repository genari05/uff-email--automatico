const taskModel = require('../models/taskModel');
const activityModel = require('../models/activityModel');
const userModel = require('../models/userModel');
const emailModel = require('../models/emailModel');
const gtModel = require('../models/gtModel');
const gtMembershipModel = require('../models/gtMembershipModel');
const {
  sendTaskAssignedEmail,
  sendTaskDeniedEmail,
  sendGtTaskAwaitingApprovalEmail,
} = require('../services/emailService');

/**
 * Monta a lista de "membros disponíveis por GT", usada no formulário
 * de nova tarefa pra filtrar o responsável conforme o GT de destino
 * escolhido (uma tarefa só pode ir pra alguém que É daquele GT).
 */
async function membrosPorGt(gts) {
  const listas = await Promise.all(gts.map((gt) => gtMembershipModel.listApprovedMembersOfGt(gt.id)));
  const porGt = {};
  gts.forEach((gt, i) => {
    porGt[gt.id] = listas[i]
      .filter((m) => m.users?.people)
      .map((m) => ({ personId: m.users.people.id, name: m.users.people.name }));
  });
  return porGt;
}

// GET /gts/:slug -> painel interno do GT (mural + tarefas daquele GT)
async function painelGt(req, res) {
  const gt = req.gt;

  const [tarefas, atividades] = await Promise.all([
    taskModel.listVisibleByGt(gt.id),
    activityModel.listRecentByGt(gt.id, 30),
  ]);

  const idsUnicos = [...new Set(atividades.filter((a) => a.person_id).map((a) => a.person_id))];
  const papeis = await userModel.findRolesByPersonIds(idsUnicos);
  const atividadesComPapel = atividades.map((a) => ({ ...a, papel: papeis[a.person_id] || 'member' }));

  res.render('gts/painel', {
    title: gt.name,
    gt,
    tarefas,
    atividades: atividadesComPapel,
  });
}

// GET /gts/:slug/tarefas/nova
async function formNovaTarefaGt(req, res) {
  const [gts, templates] = await Promise.all([gtModel.listAll(), emailModel.listTemplates()]);
  const porGt = await membrosPorGt(gts);
  const today = new Date().toISOString().slice(0, 10);

  res.render('gts/tarefa-nova', {
    title: 'Nova tarefa',
    gt: req.gt,
    gts,
    porGt,
    templates,
    today,
    erro: null,
  });
}

// POST /gts/:slug/tarefas
async function criarTarefaGt(req, res) {
  const gt = req.gt;

  const rerender = async (erro) => {
    const [gts, templates] = await Promise.all([gtModel.listAll(), emailModel.listTemplates()]);
    const porGt = await membrosPorGt(gts);
    const today = new Date().toISOString().slice(0, 10);
    return res.render('gts/tarefa-nova', { title: 'Nova tarefa', gt, gts, porGt, templates, today, erro });
  };

  try {
    const {
      targetGtId,
      responsibleId,
      title,
      description,
      deadlineDate,
      sendReminder,
      reminderDate,
      reminderTime,
      reminderType,
      reminderTemplateId,
      reminderSubject,
      reminderBody,
    } = req.body;

    if (!targetGtId || !responsibleId || !title || !deadlineDate) {
      return rerender('Preencha o GT de destino, o responsável, o título e o prazo de entrega.');
    }

    const targetGt = await gtModel.findById(targetGtId);
    if (!targetGt) return rerender('GT de destino inválido.');

    // O responsável precisa realmente fazer parte do GT de destino escolhido
    const membrosDestino = await gtMembershipModel.listApprovedMembersOfGt(targetGt.id);
    const responsavelValido = membrosDestino.find((m) => m.users?.people?.id === responsibleId);
    if (!responsavelValido) {
      return rerender(`Essa pessoa não faz parte do ${targetGt.name}.`);
    }

    const today = new Date().toISOString().slice(0, 10);
    if (deadlineDate < today) return rerender('O prazo de entrega não pode ser uma data no passado.');

    const querEnviarLembrete = sendReminder === 'on';
    if (querEnviarLembrete) {
      if (!reminderDate) return rerender('Escolha a data do lembrete, ou desmarque o envio de e-mail.');
      if (reminderDate < today) return rerender('A data do lembrete não pode ser no passado.');
      if (reminderDate > deadlineDate) return rerender('A data do lembrete não pode ser depois do prazo de entrega.');
      if (reminderTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) return rerender('Horário do lembrete inválido.');
    }

    const crossGt = targetGt.id !== gt.id;
    // Dentro do próprio GT: ativa direto se quem cria é líder DAQUELE GT.
    // Entre GTs: sempre precisa da aprovação do líder do GT de destino,
    // não importa quem criou.
    const ativaDireto = !crossGt && req.gtMembership.role === 'leader';

    const task = await taskModel.create({
      title: title.trim(),
      description: description?.trim() || null,
      responsible_person_id: responsibleId,
      created_by: req.user.id,
      gt_id: targetGt.id,
      origin_gt_id: gt.id,
      status: ativaDireto ? 'pending' : 'aguardando_aprovacao',
      deadline_date: deadlineDate,
      send_reminder: querEnviarLembrete,
      reminder_date: querEnviarLembrete ? reminderDate : null,
      reminder_time: querEnviarLembrete && reminderTime ? reminderTime : null,
      reminder_type: querEnviarLembrete ? reminderType : null,
      reminder_template_id: querEnviarLembrete && reminderType === 'template' ? reminderTemplateId : null,
      reminder_subject: querEnviarLembrete && reminderType === 'custom' ? reminderSubject : null,
      reminder_body: querEnviarLembrete && reminderType === 'custom' ? reminderBody : null,
    });

    if (ativaDireto) {
      await activityModel.log(
        `Recebeu a tarefa "${task.title}" de ${req.user.people.name}`,
        'task_created',
        task.id,
        task.responsible_person_id,
        targetGt.id
      );
      sendTaskAssignedEmail({
        to: task.people.email,
        name: task.people.name,
        title: task.title,
        description: task.description,
        deadlineDate: new Date(task.deadline_date).toLocaleDateString('pt-BR'),
      }).catch((err) => console.error('Erro ao notificar responsável pela tarefa de GT:', err.message));
    } else {
      await activityModel.log(
        crossGt
          ? `${req.user.people.name} (${gt.name}) pediu para atribuir a tarefa "${task.title}" para ${task.people.name} (aguardando aprovação do ${targetGt.name})`
          : `Pediu para atribuir a tarefa "${task.title}" para ${task.people.name} (aguardando aprovação)`,
        'task_awaiting_approval',
        task.id,
        req.user.person_id,
        targetGt.id
      );

      const lideresDestino = await gtMembershipModel.findLeadersOfGt(targetGt.id);
      lideresDestino.forEach((l) => {
        const emailLider = l.users?.people?.email;
        if (!emailLider) return;
        sendGtTaskAwaitingApprovalEmail({
          to: emailLider,
          gtOrigemNome: gt.name,
          gtDestinoNome: targetGt.name,
          responsibleName: task.people.name,
          title: task.title,
        }).catch((err) => console.error('Erro ao notificar líder do GT de destino:', err.message));
      });
    }

    res.redirect(`/gts/${targetGt.slug}`);
  } catch (err) {
    console.error(err);
    await rerender('Erro ao criar tarefa. Tente novamente.');
  }
}

// POST /gts/:slug/tarefas/:id/concluir
async function concluirTarefaGt(req, res) {
  try {
    const { id } = req.params;
    const gt = req.gt;
    const task = await taskModel.findById(id);
    if (!task || task.gt_id !== gt.id) return res.redirect(`/gts/${gt.slug}`);

    const souResponsavel = task.responsible_person_id === req.user.person_id;
    const souLiderDoGt = req.gtMembership.role === 'leader';
    if (!souResponsavel && !souLiderDoGt) return res.redirect(`/gts/${gt.slug}`);

    const atualizada = await taskModel.markCompleted(id);
    await activityModel.log(
      `Concluiu a tarefa "${atualizada.title}"`,
      'task_completed',
      atualizada.id,
      atualizada.responsible_person_id,
      gt.id
    );

    res.redirect(`/gts/${gt.slug}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/gts/${req.gt.slug}`);
  }
}

// GET /gts/:slug/tarefas/aprovacao -> só o líder DESTE GT (requireGtLeader)
async function listarAprovacaoGt(req, res) {
  const [tarefas, gts] = await Promise.all([
    taskModel.listAwaitingApprovalByGt(req.gt.id),
    gtModel.listAll(),
  ]);
  const mapaGts = {};
  gts.forEach((g) => { mapaGts[g.id] = g; });

  const tarefasComOrigem = tarefas.map((t) => ({
    ...t,
    origemGt: t.origin_gt_id && t.origin_gt_id !== req.gt.id ? mapaGts[t.origin_gt_id] : null,
  }));

  res.render('gts/tarefa-aprovacao', { title: 'Aprovar tarefas', gt: req.gt, tarefas: tarefasComOrigem });
}

// POST /gts/:slug/tarefas/:id/aprovar
async function resolverAprovacaoGt(req, res) {
  try {
    const { id } = req.params;
    const { decisao } = req.body; // 'pending' (aprovar) | 'denied' (negar)
    const gt = req.gt;

    const task = await taskModel.findById(id);
    if (!task || task.gt_id !== gt.id) return res.redirect(`/gts/${gt.slug}/tarefas/aprovacao`);

    const criador = task.created_by ? await userModel.findById(task.created_by) : null;
    const atualizada = await taskModel.resolveApproval(id, { status: decisao, approvedBy: req.user.id });

    if (decisao === 'pending') {
      await activityModel.log(
        `Teve a tarefa "${atualizada.title}" aprovada pelo ${gt.name}`,
        'task_approved',
        atualizada.id,
        atualizada.responsible_person_id,
        gt.id
      );
      sendTaskAssignedEmail({
        to: atualizada.people.email,
        name: atualizada.people.name,
        title: atualizada.title,
        description: atualizada.description,
        deadlineDate: new Date(atualizada.deadline_date).toLocaleDateString('pt-BR'),
      }).catch((err) => console.error('Erro ao notificar aprovação de tarefa de GT:', err.message));
    } else {
      await activityModel.log(
        `Teve a tarefa "${atualizada.title}" (para ${atualizada.people.name}) negada pelo ${gt.name}`,
        'task_denied',
        atualizada.id,
        criador?.person_id || null,
        gt.id
      );
      if (criador?.people?.email) {
        sendTaskDeniedEmail({
          to: criador.people.email,
          creatorName: criador.people.name,
          responsibleName: atualizada.people.name,
          title: atualizada.title,
        }).catch((err) => console.error('Erro ao notificar negação de tarefa de GT:', err.message));
      }
    }

    res.redirect(`/gts/${gt.slug}/tarefas/aprovacao`);
  } catch (err) {
    console.error(err);
    res.redirect(`/gts/${req.gt.slug}/tarefas/aprovacao`);
  }
}

module.exports = {
  painelGt,
  formNovaTarefaGt,
  criarTarefaGt,
  concluirTarefaGt,
  listarAprovacaoGt,
  resolverAprovacaoGt,
};
