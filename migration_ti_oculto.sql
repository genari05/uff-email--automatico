-- =========================================================
-- CONTA DE TI OCULTA
--  - novo papel 'ti' em users.role (acesso total)
--  - coluna users.oculto (some de listas, membros, destinatários e feed)
--  - views users_visiveis / people_visiveis (usadas nas listagens públicas)
--
-- Rode este arquivo no SQL Editor do Supabase ANTES de subir o
-- código novo. É seguro rodar mais de uma vez.
-- =========================================================

-- 1) Coluna "oculto"
alter table users add column if not exists oculto boolean not null default false;

-- 2) Papel 'ti' permitido na coluna role
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('leader', 'member', 'ti'));

-- 3) Views só com o que pode aparecer pros outros usuários
create or replace view users_visiveis as
  select * from users where oculto = false;

create or replace view people_visiveis as
  select p.*
  from people p
  where not exists (
    select 1 from users u where u.person_id = p.id and u.oculto = true
  );

-- 4) Marca a conta de TI (precisa já estar cadastrada, com senha criada)
update users
set role = 'ti', oculto = true, has_access = true
where person_id in (
  select id from people where lower(trim(email)) = 'tgenari791@gmail.com'
);

-- 5) Conferência: deve voltar 1 linha (role = ti, oculto = true)
select u.id, u.role, u.oculto, p.email
from users u join people p on p.id = u.person_id
where u.oculto = true;
