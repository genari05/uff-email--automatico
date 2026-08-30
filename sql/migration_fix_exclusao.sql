-- =========================================================
-- MIGRAÇÃO: corrige a exclusão de pessoas/usuários que já têm
-- histórico no sistema (e-mails enviados, tarefas criadas,
-- pedidos resolvidos, modelos de e-mail criados).
--
-- Antes disso, excluir uma pessoa que já tinha atividade no
-- sistema dava erro de "foreign key constraint" (chave estrangeira).
--
-- A solução: o histórico continua existindo (não apaga nada),
-- só que a referência à pessoa excluída vira NULL nesses
-- registros antigos, em vez de bloquear a exclusão.
-- =========================================================

-- 1) E-mails enviados (quem mandou)
alter table email_logs drop constraint if exists email_logs_sender_id_fkey;
alter table email_logs
  add constraint email_logs_sender_id_fkey
  foreign key (sender_id) references users(id) on delete set null;

-- 2) Modelos de e-mail criados (quem criou)
alter table email_templates drop constraint if exists email_templates_created_by_fkey;
alter table email_templates
  add constraint email_templates_created_by_fkey
  foreign key (created_by) references users(id) on delete set null;

-- 3) Pedidos de acesso resolvidos (quem aprovou/negou)
alter table access_requests drop constraint if exists access_requests_resolved_by_fkey;
alter table access_requests
  add constraint access_requests_resolved_by_fkey
  foreign key (resolved_by) references users(id) on delete set null;

-- 4) Tarefas criadas (quem criou) - essa coluna era obrigatória,
--    então primeiro liberamos ela pra aceitar NULL
alter table tasks alter column created_by drop not null;
alter table tasks drop constraint if exists tasks_created_by_fkey;
alter table tasks
  add constraint tasks_created_by_fkey
  foreign key (created_by) references users(id) on delete set null;

-- 5) Tarefas aprovadas/negadas (quem decidiu)
alter table tasks drop constraint if exists tasks_approved_by_fkey;
alter table tasks
  add constraint tasks_approved_by_fkey
  foreign key (approved_by) references users(id) on delete set null;
