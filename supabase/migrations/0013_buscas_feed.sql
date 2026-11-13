-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — registro de quando o calendário de cada um busca o feed
-- Rode inteiro no SQL Editor do Supabase, depois da 0012. Pode rodar de novo.
--
-- • Cada busca do link .ics (Google Agenda, Calendário da Apple, Outlook…)
--   soma uma linha por pessoa e por app: primeira e última busca e quantas
--   foram. Assim dá para ver se o calendário está mesmo vindo buscar mudanças
--   e de quanto em quanto tempo.
-- • Cada pessoa vê só as suas (página Conectar). Só o feed (service role)
--   registra; ninguém logado escreve aqui.
-- • O aviso de "destructive operations" vem do `drop policy if exists`, que
--   deixa o arquivo re-executável. É esperado.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists feed_buscas (
  member_id   uuid not null references members(id) on delete cascade,
  cliente     text not null check (cliente in ('google', 'apple', 'outlook', 'navegador', 'outro')),
  agente      text not null default '',
  primeira_em timestamptz not null default now(),
  ultima_em   timestamptz not null default now(),
  buscas      integer not null default 1,
  primary key (member_id, cliente)
);

-- Além da RLS: quem está logado só pode ler; anon nada.
revoke all on feed_buscas from anon, authenticated, public;
grant select on feed_buscas to authenticated;
alter table feed_buscas enable row level security;
drop policy if exists feed_buscas_le_as_suas on feed_buscas;
create policy feed_buscas_le_as_suas on feed_buscas
  for select to authenticated using (member_id = current_member_id());

create or replace function registrar_busca_feed(p_member uuid, p_cliente text, p_agente text) returns void
language sql security definer set search_path = public as $$
  insert into feed_buscas (member_id, cliente, agente)
  values (p_member, p_cliente, left(coalesce(p_agente, ''), 300))
  on conflict (member_id, cliente) do update
    set ultima_em = now(), buscas = feed_buscas.buscas + 1, agente = excluded.agente;
$$;
revoke execute on function registrar_busca_feed(uuid, text, text) from anon, authenticated, public;
grant execute on function registrar_busca_feed(uuid, text, text) to service_role;
