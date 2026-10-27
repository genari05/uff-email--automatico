-- Edição de mensagens do mural central: guarda quando a mensagem foi editada.
-- Rode uma vez no SQL Editor do Supabase ANTES de subir o código novo.
alter table central_messages add column if not exists edited_at timestamptz;
