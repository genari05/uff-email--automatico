-- Libera as tarefas que ficaram "aguardando aprovação" (não existe mais
-- aprovação: qualquer pessoa atribui direto). Rode uma vez no Supabase.
update tasks set status = 'pending' where status = 'aguardando_aprovacao';
