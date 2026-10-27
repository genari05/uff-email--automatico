-- =========================================================
-- MIGRAÇÃO: adiciona suporte a "pedido para virar líder"
-- Rode este script no SQL Editor do Supabase se você já
-- tinha rodado o schema.sql antigo (sem a coluna request_type)
-- =========================================================

alter table access_requests
  add column if not exists request_type text not null default 'access'
  check (request_type in ('access', 'leader'));
