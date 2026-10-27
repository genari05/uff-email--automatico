-- =========================================================
-- MIGRAÇÃO: adiciona HORÁRIO opcional ao lembrete das tarefas
-- Rode este script no SQL Editor do Supabase.
-- Seguro: só adiciona uma coluna nova, não mexe no que já existe.
-- Se ficar em branco, o sistema entende como 00:00 (meia-noite).
-- =========================================================

alter table tasks
  add column if not exists reminder_time text;
