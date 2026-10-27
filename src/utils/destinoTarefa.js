/**
 * Pra onde mandar a pessoa depois de criar/editar/excluir uma tarefa.
 * Só manda pra um GT do qual ela faz parte (senão cai em "acesso negado"):
 * primeiro o GT da tarefa, depois o GT de origem, senão "Minhas tarefas".
 */
function destinoTarefa(req, task) {
  const meus = req.meusGts || [];
  const achar = (gtId) => (gtId ? meus.find((m) => m.gts && m.gts.id === gtId) : null);
  const noDestino = achar(task.gt_id);
  if (noDestino) return `/gts/${noDestino.gts.slug}`;
  const naOrigem = achar(task.origin_gt_id);
  if (naOrigem) return `/gts/${naOrigem.gts.slug}`;
  return '/tarefas/minhas';
}

module.exports = { destinoTarefa };
