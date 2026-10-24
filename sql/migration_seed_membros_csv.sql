-- =========================================================
-- SEED: membros/líderes importados do formulário (CSV) para
-- seus respectivos GTs. Cria os GTs novos que ainda não
-- existiam (Apoio, Formação, Agenda) e vincula cada pessoa,
-- pelo e-mail, já aprovada no papel certo (membro/líder).
--
-- Pré-requisito: a pessoa já precisa estar cadastrada no
-- sistema (tabela people + users) com esse mesmo e-mail -
-- esse script só cria o VÍNCULO com o GT, não cadastra gente.
-- Rode este script no SQL Editor do Supabase.
-- =========================================================

-- 1) Garante que os GTs novos existem (os 3 originais já
--    foram criados pela migration_gts.sql)
insert into gts (name, slug, color, description) values
  ('GT Apoio', 'apoio', '#7c3aed', 'Apoio geral à organização da Semana da Psicologia'),
  ('GT Formação', 'formacao', '#db2777', 'Formação e conteúdo educativo da Semana da Psicologia'),
  ('GT Agenda', 'agenda', '#0d9488', 'Agenda e programação da Semana da Psicologia')
on conflict (slug) do nothing;

-- 2) Vincula cada pessoa (pelo e-mail) ao GT certo, já
--    aprovada, no papel indicado pela coluna 'Integrante'.
--    Se a pessoa já tiver pedido/vínculo com esse GT, apenas
--    atualiza o papel e confirma a aprovação (idempotente -
--    pode rodar esse script de novo sem duplicar nada).
insert into gt_memberships (gt_id, user_id, role, status, resolved_at)
select g.id, u.id, x.role, 'approved', now()
from (values
  ('katherinem@id.uff.br', 'comunicacao', 'member'),
  ('marianaspindola@id.uff.br', 'comunicacao', 'member'),
  ('freiremaria@id.uff.br', 'comunicacao', 'leader'),
  ('yusilva@id.uff.br', 'comunicacao', 'member'),
  ('agterra@id.uff.br', 'comunicacao', 'member'),
  ('juliaiost@id.uff.br', 'comunicacao', 'member'),
  ('acrispim@id.uff.br', 'financas', 'leader'),
  ('acrispim@id.uff.br', 'infra', 'leader'),
  ('paula_vieira@id.uff.br', 'financas', 'member'),
  ('ilanav@id.uff.br', 'apoio', 'member'),
  ('th_chagas@id.uff.br', 'apoio', 'leader'),
  ('diooliveira@id.uff.br', 'apoio', 'member'),
  ('raissabotelho@id.uff.br', 'infra', 'member'),
  ('maria_cmm@id.uff.br', 'infra', 'member'),
  ('giselya@id.uff.br', 'infra', 'member'),
  ('rebecavaz@id.uff.br', 'infra', 'member'),
  ('gbraio@id.uff.br', 'infra', 'member'),
  ('juliaop@id.uff.br', 'infra', 'member'),
  ('munizsofia@id.uff.br', 'infra', 'member'),
  ('alinemd@id.uff.br', 'financas', 'member'),
  ('daniel_fs@id.uff.br', 'apoio', 'member'),
  ('ninimeth@id.uff.br', 'apoio', 'member'),
  ('pedrohof@id.uff.br', 'formacao', 'member'),
  ('isabelagpp@id.uff.br', 'formacao', 'member'),
  ('ana_sideratos@id.uff.br', 'formacao', 'member'),
  ('marinaduarte@id.uff.com.br', 'agenda', 'member'),
  ('lucasod@id.uff.br', 'agenda', 'leader'),
  ('mtosetto@id.uff.br', 'agenda', 'member'),
  ('moregina@id.uff.br', 'agenda', 'member'),
  ('mapoeys@id.uff.br', 'agenda', 'member'),
  ('b_cristina@id.uff.br', 'apoio', 'member'),
  ('laisabulhoes@id.uff.br', 'apoio', 'member'),
  ('estefane_v@id.uff.br', 'apoio', 'leader'),
  ('estefane_v@id.uff.br', 'infra', 'leader'),
  ('ninamiu@id.uff.br', 'comunicacao', 'member')
) as x(email, gt_slug, role)
join gts g on g.slug = x.gt_slug
join people p on lower(trim(p.email)) = x.email
join users u on u.person_id = p.id
on conflict (gt_id, user_id) do update
  set role = excluded.role, status = 'approved', resolved_at = now();

-- 3) Conferência: mostra quem do CSV NÃO foi vinculado (pessoa
--    ainda não cadastrada no sistema com esse e-mail, por
--    exemplo) - se essa consulta não retornar nada, deu tudo certo.
select x.email, x.gt_slug, x.role
from (values
  ('katherinem@id.uff.br', 'comunicacao', 'member'),
  ('marianaspindola@id.uff.br', 'comunicacao', 'member'),
  ('freiremaria@id.uff.br', 'comunicacao', 'leader'),
  ('yusilva@id.uff.br', 'comunicacao', 'member'),
  ('agterra@id.uff.br', 'comunicacao', 'member'),
  ('juliaiost@id.uff.br', 'comunicacao', 'member'),
  ('acrispim@id.uff.br', 'financas', 'leader'),
  ('acrispim@id.uff.br', 'infra', 'leader'),
  ('paula_vieira@id.uff.br', 'financas', 'member'),
  ('ilanav@id.uff.br', 'apoio', 'member'),
  ('th_chagas@id.uff.br', 'apoio', 'leader'),
  ('diooliveira@id.uff.br', 'apoio', 'member'),
  ('raissabotelho@id.uff.br', 'infra', 'member'),
  ('maria_cmm@id.uff.br', 'infra', 'member'),
  ('giselya@id.uff.br', 'infra', 'member'),
  ('rebecavaz@id.uff.br', 'infra', 'member'),
  ('gbraio@id.uff.br', 'infra', 'member'),
  ('juliaop@id.uff.br', 'infra', 'member'),
  ('munizsofia@id.uff.br', 'infra', 'member'),
  ('alinemd@id.uff.br', 'financas', 'member'),
  ('daniel_fs@id.uff.br', 'apoio', 'member'),
  ('ninimeth@id.uff.br', 'apoio', 'member'),
  ('pedrohof@id.uff.br', 'formacao', 'member'),
  ('isabelagpp@id.uff.br', 'formacao', 'member'),
  ('ana_sideratos@id.uff.br', 'formacao', 'member'),
  ('marinaduarte@id.uff.com.br', 'agenda', 'member'),
  ('lucasod@id.uff.br', 'agenda', 'leader'),
  ('mtosetto@id.uff.br', 'agenda', 'member'),
  ('moregina@id.uff.br', 'agenda', 'member'),
  ('mapoeys@id.uff.br', 'agenda', 'member'),
  ('b_cristina@id.uff.br', 'apoio', 'member'),
  ('laisabulhoes@id.uff.br', 'apoio', 'member'),
  ('estefane_v@id.uff.br', 'apoio', 'leader'),
  ('estefane_v@id.uff.br', 'infra', 'leader'),
  ('ninamiu@id.uff.br', 'comunicacao', 'member')
) as x(email, gt_slug, role)
where not exists (
  select 1 from people p
  join users u on u.person_id = p.id
  where lower(trim(p.email)) = x.email
);
