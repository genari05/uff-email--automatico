-- Histórico de edições e exclusões (só líderes veem).
-- Rode uma vez no SQL Editor do Supabase ANTES de subir o código novo.
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid,
  actor_name text not null,
  actor_oculto boolean not null default false, -- ações da conta de TI: só o TI vê
  action text not null check (action in ('edit', 'delete')),
  entity_type text not null,   -- tarefa | mensagem | pessoa | modelo_email | gt
  entity_id text,
  entity_label text,           -- título/nome na hora da ação
  gt_name text,
  changes jsonb,               -- edição: [{campo, de, para}]
  snapshot jsonb               -- exclusão: dados do que foi apagado
);
create index if not exists audit_log_created_idx on audit_log (created_at desc);
