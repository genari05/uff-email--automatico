-- =========================================================
-- MIGRAÇÃO: foto de perfil + mural com pessoa vinculada
-- Rode este script no SQL Editor do Supabase.
-- =========================================================

-- Foto de perfil de cada pessoa (URL pública do Supabase Storage)
alter table people
  add column if not exists avatar_url text;

-- O mural passa a saber DE QUEM é cada atividade (pra mostrar
-- nome + foto no estilo "grupo de WhatsApp")
alter table activity_log
  add column if not exists person_id uuid references people(id) on delete set null;

-- Cria o bucket público de fotos de perfil no Supabase Storage
-- (se já existir, não faz nada)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
