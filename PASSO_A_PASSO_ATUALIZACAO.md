# Atualização: TI vê tudo, sem aprovação de tarefas, dar liderança

## Como aplicar
1. Supabase → SQL Editor: rode `sql/migration_sem_aprovacao.sql` (libera tarefas que estavam esperando aprovação).
2. Copie os arquivos do zip para as mesmas pastas do projeto (apague o conteúdo do arquivo antes de colar) e faça commit + push.

## O que mudou
- **TI vê tudo:** menu "Visão geral (tudo)" (todas as tarefas do site), "Pessoas" com todas as pessoas + GTs de cada uma + liderança, "Desempenho da equipe" e "Status de e-mails" sem filtro de GT, e envio de e-mail para qualquer pessoa. Você continua invisível para os outros.
- **Sem aprovação:** qualquer pessoa (líder ou membro) atribui tarefa direto, dentro do GT ou para outro GT. O responsável recebe o e-mail na hora. O link "Aprovar tarefas" saiu do menu.
- **Dar liderança:**
  - No painel de cada GT há o card **Equipe**: o líder do GT clica em "Tornar líder" ou "Tirar liderança". O GT nunca fica sem líder.
  - Na tela **Pessoas**, quem é líder geral pode "Tornar líder"/"Tirar liderança" geral. A liderança geral dá acesso à aba Pessoas e às ações administrativas; a de GT vale só dentro do GT.

## Arquivos
Novos: `sql/migration_sem_aprovacao.sql`
Alterados: `src/controllers/{taskController,gtTaskController,personController,emailController}.js`, `src/routes/{personRoutes,gtRoutes}.js`, `src/models/{gtMembershipModel,userModel}.js`, `src/views/people/lista.ejs`, `src/views/gts/{painel,tarefa-nova}.ejs`, `src/views/partials/sidebar.ejs`
