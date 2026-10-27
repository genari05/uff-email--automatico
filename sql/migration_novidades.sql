-- Alerta "o que mudou" mostrado uma vez por pessoa.
-- Rode uma vez no SQL Editor do Supabase (sem isso o alerta usa só um cookie do navegador).
alter table users add column if not exists novidades_versao text;
