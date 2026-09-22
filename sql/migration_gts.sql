-- =========================================================
-- MIGRAÇÃO: GTs (Grupos de Trabalho)
-- Multi-workgroup: cada GT tem acesso trancado (aprovação do
-- líder daquele GT), tarefas e mural próprios, além de um
-- mural central onde os GTs se comunicam entre si.
-- Rode este script no SQL Editor do Supabase.
-- =========================================================

-- ---------------------------------------------------------
-- 1) GTS: os grupos de trabalho em si
-- ---------------------------------------------------------
create table if not exists gts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  color text not null default '#2563eb', -- cor de identidade do GT (hex)
  description text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 2) GT_MEMBERSHIPS: quem pertence a qual GT, e com que papel
--    dentro daquele GT específico (um usuário pode ter papéis
--    diferentes em GTs diferentes: líder de um, membro de outro)
-- ---------------------------------------------------------
create table if not exists gt_memberships (
  id uuid primary key default gen_random_uuid(),
  gt_id uuid not null references gts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member' check (role in ('leader', 'member')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references users(id) on delete set null,
  unique (gt_id, user_id)
);

create index if not exists idx_gt_memberships_user on gt_memberships(user_id);
create index if not exists idx_gt_memberships_gt on gt_memberships(gt_id);
create index if not exists idx_gt_memberships_status on gt_memberships(status);

-- ---------------------------------------------------------
-- 3) CENTRAL_MESSAGES: mural central de comunicação ENTRE GTs
--    (ex: "GT Comunicação avisa o GT Infra que pode postar")
-- ---------------------------------------------------------
create table if not exists central_messages (
  id uuid primary key default gen_random_uuid(),
  gt_id uuid not null references gts(id) on delete cascade,
  author_user_id uuid references users(id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_central_messages_created on central_messages(created_at desc);

-- ---------------------------------------------------------
-- 4) TASKS: passam a poder pertencer a um GT e, quando criadas
--    por alguém de um GT para outro GT, precisam da aprovação
--    do líder do GT de destino antes de aparecer no histórico
--    dele (reaproveitando o mesmo padrão de aprovação já usado
--    entre membro -> membro).
-- ---------------------------------------------------------
alter table tasks
  add column if not exists gt_id uuid references gts(id) on delete set null;

alter table tasks
  add column if not exists origin_gt_id uuid references gts(id) on delete set null;

create index if not exists idx_tasks_gt on tasks(gt_id);

-- ---------------------------------------------------------
-- 5) ACTIVITY_LOG: o mural de cada GT precisa saber a qual GT
--    a atividade pertence, pra separar os murais (idêntico ao
--    mural de tarefas que já existe, só que por GT)
-- ---------------------------------------------------------
alter table activity_log
  add column if not exists gt_id uuid references gts(id) on delete set null;

create index if not exists idx_activity_log_gt on activity_log(gt_id);

-- ---------------------------------------------------------
-- Seed: os 3 GTs iniciais
-- ---------------------------------------------------------
insert into gts (name, slug, color, description) values
  ('GT Comunicação', 'comunicacao', '#2563eb', 'Comunicação e divulgação da Semana da Psicologia'),
  ('GT Finanças',    'financas',    '#16a34a', 'Orçamento, patrocínios e controle financeiro'),
  ('GT Infra',       'infra',       '#ea580c', 'Infraestrutura, estrutura física e logística do evento')
on conflict (slug) do nothing;

-- ---------------------------------------------------------
-- Nota: quem já é líder geral (users.role = 'leader') deve ser
-- promovido a líder de cada GT manualmente (ou pelo próprio
-- sistema, na primeira tela de configuração dos GTs), rodando
-- por exemplo:
--
-- insert into gt_memberships (gt_id, user_id, role, status, resolved_at)
-- select g.id, u.id, 'leader', 'approved', now()
-- from gts g, users u
-- where u.role = 'leader' and g.slug = 'comunicacao'
-- on conflict (gt_id, user_id) do nothing;
-- ---------------------------------------------------------
