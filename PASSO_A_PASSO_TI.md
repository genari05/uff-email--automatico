# Conta de TI oculta — como aplicar

## Ordem (importante)
1. **Supabase → SQL Editor:** rode `sql/migration_ti_oculto.sql` (pode rodar mais de uma vez).
   A última consulta deve voltar 1 linha com `role = ti` e `oculto = true`.
   Pré-requisito: a conta tgenari791@gmail.com já existir (cadastro + senha criada).
2. Copie os arquivos deste zip para o projeto (mesmas pastas), faça commit e push. O Render sobe sozinho.
3. Saia e entre de novo no site com a conta de TI.

## Arquivos
Novos: `sql/migration_ti_oculto.sql`, `src/services/ocultoService.js`, `src/middlewares/ocultoMiddleware.js`
Alterados: `src/middlewares/authMiddleware.js`, `src/routes/personRoutes.js`, `src/models/{activityModel,personModel,gtMembershipModel,userModel}.js`,
`src/controllers/{authController,gtController,centralMessageController,taskController}.js`

## O que muda
- Papel `ti`: no código vira "líder" em todas as checagens, enxerga todos os GTs como líder e não é mandado para escolher GT.
- Some de: lista de pessoas, membros de GT, líderes de GT, responsável de tarefa, destinatários de e-mail (inclusive se alguém forjar o ID), editar/excluir/reenviar (dá 404).
- Nenhum registro no feed: ações feitas por você e atividades sobre a sua conta não são gravadas; você também não consegue postar no mural central.
- Login, cadastro e recuperação de senha continuam lendo `users` normalmente.

## Pontos de atenção
- Esse projeto não tem a rota `/perfil/:id`; só existe `/perfil` (o próprio). Os equivalentes (`/pessoas/:id/...`) já dão 404 para os outros.
- Se você criar uma tarefa para alguém, o e-mail que a pessoa recebe cita o seu nome. Isso é e-mail, não o feed.
- A lista de contas ocultas fica em cache por 60 s; depois de rodar o SQL pode levar até 1 minuto para valer.

## Linha sugerida para a política de privacidade (LGPD)
> A equipe técnica responsável pela manutenção do sistema possui acesso administrativo aos dados armazenados, exclusivamente para fins de manutenção, segurança e correção de falhas, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
