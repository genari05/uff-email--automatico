-- =========================================================
-- MIGRAÇÃO: adiciona o sistema de TAREFAS e MURAL DE ATIVIDADES
-- Rode este script no SQL Editor do Supabase.
-- É seguro: só cria tabelas novas, não mexe no que já existe.
-- =========================================================

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  responsible_person_id uuid not null references people(id) on delete cascade,
  created_by uuid not null references users(id),
  status text not null default 'pending'
    check (status in ('aguardando_aprovacao', 'pending', 'completed', 'denied')),
  deadline_date date not null,

  send_reminder boolean not null default false,
  reminder_date date,
  reminder_type text check (reminder_type in ('template', 'custom')),
  reminder_template_id uuid references email_templates(id),
  reminder_subject text,
  reminder_body text,
  reminder_sent boolean not null default false,
  reminder_sent_at timestamptz,

  approved_by uuid references users(id),
  resolved_at timestamptz,

  completed_at timestamptz,
  created_at timestamptz not null default now()
);

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
