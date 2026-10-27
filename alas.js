/**
 * Cada área principal do sistema é uma "Ala", com o nome de uma
 * figura importante da psicologia. Usado pro título da página e
 * pro tutorial que aparece no primeiro acesso de cada pessoa.
 *
 * slug = nome do arquivo de imagem esperado em /public/img/figuras/<slug>.png
 * (se o arquivo não existir, o sistema mostra só um símbolo no lugar,
 * sem quebrar nada - é só subir a imagem depois que quiser ativar).
 */
const ALAS = {
  '/perfil': {
    figura: 'Jung',
    slug: 'jung',
    saudacao: 'Bem-vindo(a) à Ala Jung',
    explicacao: 'Aqui é sobre você: sua foto, seu nome e como o resto da equipe te reconhece pelo sistema.',
  },
  '/pessoas': {
    figura: 'James',
    slug: 'james',
    saudacao: 'Bem-vindo(a) à Ala James',
    explicacao: 'O mapa de toda a equipe. Aqui ficam todas as pessoas cadastradas, seus status e quem pode editar o quê.',
  },
  '/emails': {
    figura: 'Skinner',
    slug: 'skinner',
    saudacao: 'Bem-vindo(a) à Ala Skinner',
    explicacao: 'A ala do estímulo e da resposta: escolha quem recebe, escreva a mensagem (ou use um modelo pronto) e envie.',
  },
  '/tarefas/minhas': {
    figura: 'Maslow',
    slug: 'maslow',
    saudacao: 'Bem-vindo(a) à Ala Maslow',
    explicacao: 'Suas prioridades, um degrau de cada vez. Aqui ficam só as tarefas que são suas - marque como concluída quando terminar.',
  },
  '/tarefas/nova': {
    figura: 'Freud',
    slug: 'freud',
    saudacao: 'Bem-vindo(a) à Ala Freud',
    explicacao: 'É aqui que uma tarefa nasce: escolha o responsável, o prazo, e - se quiser - um lembrete automático por e-mail.',
  },
  '/tarefas/lembretes': {
    figura: 'Wundt',
    slug: 'wundt',
    saudacao: 'Bem-vindo(a) à Ala Wundt',
    explicacao: 'A ala da medição: veja se cada lembrete programado já foi enviado, está atrasado, ou ainda vai disparar.',
  },
  '/tarefas/aprovacao': {
    figura: 'Bandura',
    slug: 'bandura',
    saudacao: 'Bem-vindo(a) à Ala Bandura',
    explicacao: 'Tarefas que um membro atribuiu pra outro membro esperam sua validação aqui antes de valerem de verdade.',
  },
  '/tarefas/desempenho': {
    figura: 'Piaget',
    slug: 'piaget',
    saudacao: 'Bem-vindo(a) à Ala Piaget',
    explicacao: 'O progresso da equipe em números: quantas tarefas pendentes, concluídas, e como cada pessoa está indo.',
  },
  '/tarefas': {
    figura: 'Lewin',
    slug: 'lewin',
    saudacao: 'Bem-vindo(a) à Ala Lewin',
    explicacao: 'A visão do grupo inteiro: todas as tarefas da equipe, lado a lado com o mural de atividades ao vivo.',
  },
  '/acesso/pendentes': {
    figura: 'Rogers',
    slug: 'rogers',
    saudacao: 'Bem-vindo(a) à Ala Rogers',
    explicacao: 'Aqui quem decide é você: aprove ou negue pedidos de acesso e de promoção a líder da equipe.',
  },
};

/**
 * Acha a ala certa pra um caminho de URL, testando do mais
 * específico pro mais genérico (ex: /tarefas/nova antes de /tarefas).
 */
function encontrarAla(pathname) {
  const chaves = Object.keys(ALAS).sort((a, b) => b.length - a.length);
  const chave = chaves.find((k) => pathname === k || pathname.startsWith(k + '/'));
  return chave ? { ...ALAS[chave], path: chave } : null;
}

module.exports = { ALAS, encontrarAla };
