const taskModel = require('../models/taskModel');
const personModel = require('../models/personModel');
const emailModel = require('../models/emailModel');
const auditService = require('../services/auditService');
const { destinoTarefa } = require('../utils/destinoTarefa');
const gtModel = require('../models/gtModel');
const gtMembershipModel = require('../models/gtMembershipModel');
const activityModel = require('../models/activityModel');
const { sendTaskAssignedEmail } = require('../services/emailService');
const { hojeSP } = require('../utils/datas');

const fmtData = (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

// Pessoas que podem ser responsáveis: do GT da tarefa (ou todas, se a tarefa é antiga e sem GT)
async function opcoesResponsavel(task) {
  let pessoas;
  if (task.gt_id) {
    const membros = await gtMembershipModel.listApprovedMembersOfGt(task.gt_id);
    pessoas = membros.map((m) => m.users?.people).filter(Boolean);
  } else {
    pessoas = await personModel.listAll({ onlyVerified: true });
  }
  // Garante que o responsável atual continua na lista (mesmo se já saiu do GT)
  if (task.people && !pessoas.some((p) => p.id === task.people.id)) pessoas.push(task.people);
  return pessoas.sort((a, b) => a.name.localeCompare(b.name));
}

async function destinoDepois(req, task) {
  return destinoTarefa(req, task);
}

async function carregarTarefa(req, res) {
  const task = await taskModel.findById(req.params.id);
  if (!task) {
    res.status(404).render('errors/nao-encontrado', { title: 'Tarefa não encontrada' });
    return null;
  }
  if (!req.podeEditarTarefa(task)) {
    res.status(403).render('errors/acesso-negado', {
      title: 'Acesso negado',
      mensagem: 'Você não tem permissão para editar esta tarefa.',
    });
    return null;
  }
  return task;
}

async function renderForm(req, res, task, { erro = null, valores = null } = {}) {
  const [pessoas, templates, voltar] = await Promise.all([
    opcoesResponsavel(task),
    emailModel.listTemplates(),
    destinoDepois(req, task),
  ]);
  res.render('tasks/editar', {
    title: 'Editar tarefa',
    task,
    pessoas,
    templates,
    voltar,
    hoje: hojeSP(),
    erro,
    v: valores,
  });
}

// GET /tarefas/:id/editar
async function formEditar(req, res) {
  const task = await carregarTarefa(req, res);
  if (!task) return;
  await renderForm(req, res, task);
}

// POST /tarefas/:id/editar
async function salvarEdicao(req, res) {
  const task = await carregarTarefa(req, res);
  if (!task) return;

  const b = req.body;
  const hoje = hojeSP();
  const falha = (erro) => renderForm(req, res, task, { erro, valores: b });

  const title = (b.title || '').trim();
  if (!title) return falha('O título não pode ficar vazio.');
  if (!b.responsibleId || !b.deadlineDate) return falha('Preencha responsável e prazo.');

  const pessoas = await opcoesResponsavel(task);
  const novoResp = pessoas.find((p) => p.id === b.responsibleId);
  if (!novoResp) return falha('Esse responsável não pode receber a tarefa (precisa ser do GT dela).');

  // Prazo no passado só é barrado se a data foi alterada agora
  const prazoAntigo = String(task.deadline_date).slice(0, 10);
  if (b.deadlineDate !== prazoAntigo && b.deadlineDate < hoje) return falha('O novo prazo não pode ser uma data no passado.');

  const status = b.status === 'completed' ? 'completed' : 'pending';

  const querLembrete = b.sendReminder === 'on';
  const lembrete = {
    send_reminder: false, reminder_date: null, reminder_time: null,
    reminder_type: null, reminder_template_id: null, reminder_subject: null, reminder_body: null,
  };
  let reiniciaLembrete = false;
  if (querLembrete) {
    if (!b.reminderDate) return falha('Escolha a data do lembrete, ou desmarque o envio de e-mail.');
    const dataAntiga = task.reminder_date ? String(task.reminder_date).slice(0, 10) : null;
    if (b.reminderDate !== dataAntiga && b.reminderDate < hoje) return falha('A nova data do lembrete não pode ser no passado.');
    if (b.reminderDate > b.deadlineDate) return falha('A data do lembrete não pode ser depois do prazo.');
    if (b.reminderTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.reminderTime)) return falha('Horário do lembrete inválido.');

    lembrete.send_reminder = true;
    lembrete.reminder_date = b.reminderDate;
    lembrete.reminder_time = b.reminderTime || null;
    lembrete.reminder_type = b.reminderType === 'template' ? 'template' : 'custom';
    lembrete.reminder_template_id = lembrete.reminder_type === 'template' ? (b.reminderTemplateId || null) : null;
    lembrete.reminder_subject = lembrete.reminder_type === 'custom' ? (b.reminderSubject || null) : null;
    lembrete.reminder_body = lembrete.reminder_type === 'custom' ? (b.reminderBody || null) : null;

    // Mudou a data/hora (ou ligou agora): o lembrete volta a valer
    const horaAntiga = task.reminder_time || null;
    reiniciaLembrete = !task.send_reminder || b.reminderDate !== dataAntiga || (b.reminderTime || null) !== horaAntiga;
  }

  const campos = {
    title,
    description: (b.description || '').trim() || null,
    responsible_person_id: novoResp.id,
    deadline_date: b.deadlineDate,
    status,
    completed_at: status === 'completed' ? (task.completed_at || new Date().toISOString()) : null,
    ...lembrete,
  };
  if (reiniciaLembrete) { campos.reminder_sent = false; campos.reminder_sent_at = null; }
  if (!querLembrete) { campos.reminder_sent = false; campos.reminder_sent_at = null; }

  const atualizada = await taskModel.update(task.id, campos);

  // Histórico (só líderes veem): o que mudou, campo a campo
  const lab = (st) => (st === 'completed' ? 'Concluída' : 'Pendente');
  const antesA = {
    title: task.title, description: task.description, resp: task.people?.name,
    prazo: prazoAntigo, status: task.status,
    lembrete: task.send_reminder ? `${fmtData(task.reminder_date)} ${task.reminder_time || ''}`.trim() : 'sem lembrete',
  };
  const depoisA = {
    title, description: campos.description, resp: novoResp.name,
    prazo: b.deadlineDate, status,
    lembrete: querLembrete ? `${fmtData(b.reminderDate)} ${b.reminderTime || ''}`.trim() : 'sem lembrete',
  };
  await auditService.registrar(req, {
    acao: 'edit', entidade: 'tarefa', id: task.id, rotulo: task.title,
    gtNome: atualizada.gt_id ? (await gtModel.findById(atualizada.gt_id))?.name : null,
    mudancas: auditService.diff(antesA, depoisA, [
      { chave: 'title', rotulo: 'Título' },
      { chave: 'description', rotulo: 'Descrição' },
      { chave: 'resp', rotulo: 'Responsável' },
      { chave: 'prazo', rotulo: 'Prazo', fmt: (x) => fmtData(x) },
      { chave: 'status', rotulo: 'Status', fmt: lab },
      { chave: 'lembrete', rotulo: 'Lembrete' },
    ]),
  });

  // Resumo do que mudou -> mural
  const mudancas = [];
  if (title !== task.title) mudancas.push('título');
  if (novoResp.id !== task.responsible_person_id) mudancas.push(`responsável (${task.people?.name || '—'} → ${novoResp.name})`);
  if (b.deadlineDate !== prazoAntigo) mudancas.push(`prazo (${fmtData(prazoAntigo)} → ${fmtData(b.deadlineDate)})`);
  if (status !== task.status) mudancas.push(status === 'completed' ? 'marcada como concluída' : 'reaberta');
  if ((campos.description || null) !== (task.description || null)) mudancas.push('descrição');
  if (reiniciaLembrete || querLembrete !== !!task.send_reminder) mudancas.push('lembrete');

  if (mudancas.length) {
    await activityModel.log(
      `Tarefa "${atualizada.title}" editada por ${req.user.people.name}: ${mudancas.join(', ')}`,
      'task_edited',
      atualizada.id,
      req.user.person_id,
      atualizada.gt_id || null
    );
  }

  // Responsável novo: avisa por e-mail (sem travar a resposta)
  if (novoResp.id !== task.responsible_person_id && status !== 'completed' && atualizada.people?.email) {
    sendTaskAssignedEmail({
      to: atualizada.people.email,
      name: atualizada.people.name,
      title: atualizada.title,
      description: atualizada.description,
      deadlineDate: fmtData(atualizada.deadline_date),
    }).catch((err) => console.error('Erro ao avisar novo responsável:', err.message));
  }

  res.redirect(await destinoDepois(req, atualizada));
}

module.exports = { formEditar, salvarEdicao };
