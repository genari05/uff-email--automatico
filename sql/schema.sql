-- =========================================================
-- UFF EMAIL SYSTEM - SCHEMA SUPABASE (PostgreSQL)
-- Cole esse arquivo inteiro no SQL Editor do seu projeto Supabase
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1) PEOPLE: pessoas cadastradas (destinatários de e-mail)
-- ---------------------------------------------------------
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  verified boolean not null default false,
  verification_token text,
  verification_expires timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 2) USERS: login de quem tem acesso ao sistema
--    (1 usuário está sempre ligado a 1 "people")
-- ---------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references people(id) on delete cascade,
  password_hash text,
  role text not null default 'member' check (role in ('leader', 'member')),
  has_access boolean not null default false,
  password_set_token text,
  password_set_expires timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 3) ACCESS_REQUESTS: pedidos de acesso ao sistema
-- ---------------------------------------------------------
create table if not exists access_requests (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  request_type text not null default 'access' check (request_type in ('access', 'leader')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references users(id)
);

-- ---------------------------------------------------------
-- 4) EMAIL_TEMPLATES: modelos de "email programado"
-- ---------------------------------------------------------
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  body text not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 5) EMAIL_LOGS: histórico de e-mails enviados
-- ---------------------------------------------------------
create table if not exists email_logs (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references users(id),
  subject text not null,
  body text not null,
  recipients jsonb not null,
  type text not null check (type in ('template', 'custom')),
  template_id uuid references email_templates(id),
  sent_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Índices úteis
-- ---------------------------------------------------------
create index if not exists idx_people_email on people(email);
create index if not exists idx_access_requests_status on access_requests(status);
create index if not exists idx_access_requests_person on access_requests(person_id);

-- ---------------------------------------------------------
-- 6) TASKS: tarefas atribuídas a pessoas, com prazo e
--    lembrete automático por e-mail (opcional)
-- ---------------------------------------------------------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  responsible_person_id uuid not null references people(id) on delete cascade,
  created_by uuid not null references users(id),
  status text not null default 'pending'
    check (status in ('aguardando_aprovacao', 'pending', 'completed', 'denied')),
  deadline_date date not null,

  -- lembrete por e-mail (opcional, fica a critério de quem cria)
  send_reminder boolean not null default false,
  reminder_date date,
  reminder_type text check (reminder_type in ('template', 'custom')),
  reminder_template_id uuid references email_templates(id),
  reminder_subject text,
  reminder_body text,
  reminder_sent boolean not null default false,
  reminder_sent_at timestamptz,

  -- aprovação do líder (só quando quem cria não é líder)
  approved_by uuid references users(id),
  resolved_at timestamptz,

  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 7) ACTIVITY_LOG: mural de atividades da equipe
--    (ex: "Katherine concluiu a tarefa X", "Davi recebeu uma nova tarefa")
-- ---------------------------------------------------------
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  type text not null,
  task_id uuid references tasks(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_responsible on tasks(responsible_person_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_reminder on tasks(send_reminder, reminder_sent, reminder_date);
create index if not exists idx_activity_log_created on activity_log(created_at desc);

-- ---------------------------------------------------------
-- Seed opcional: crie o primeiro LÍDER manualmente depois
-- de rodar esse schema, cadastrando a pessoa pelo sistema
-- e então rodando (troque o e-mail):
--
-- update users set role = 'leader', has_access = true
-- where person_id = (select id from people where email = 'lider@id.uff.br');
-- ---------------------------------------------------------
