-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda da Diretoria · Insper AI — esquema inicial
-- Rode inteiro no SQL Editor do Supabase, em um projeto novo. Não rode duas
-- vezes no mesmo projeto.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists citext;
create extension if not exists pgcrypto;

create type categoria  as enum ('evento', 'aula', 'reuniao', 'prazo');
create type frequencia as enum ('semanal', 'quinzenal', 'mensal');

-- ── Membros (allowlist) ─────────────────────────────────────────────────────
create table members (
  id         uuid primary key default gen_random_uuid(),
  email      citext not null unique,
  name       text   not null,
  cargo      text   not null default '',
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- O token fica FORA de members para que todo membro possa ler nome/cargo dos
-- colegas sem nunca enxergar o token de feed de outra pessoa.
create table feed_tokens (
  member_id  uuid primary key references members(id) on delete cascade,
  token      text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);

-- ── Eventos ─────────────────────────────────────────────────────────────────
-- Uma linha "mestre" (series_id nulo) é um evento único ou o início de uma
-- série (freq + until). Uma linha "filha" (series_id preenchido) substitui ou
-- cancela UMA ocorrência da série, identificada por original_start.
create table events (
  id             uuid primary key default gen_random_uuid(),
  title          text not null check (length(title) between 1 and 200),
  category       categoria not null,
  start_at       timestamptz not null,
  end_at         timestamptz not null,          -- exclusivo; dia inteiro = 00:00 SP → 00:00 SP do dia seguinte
  all_day        boolean not null default false,
  location       text not null default '',
  link           text not null default '' check (link = '' or link ~* '^https?://'),
  description    text not null default '',
  freq           frequencia,                    -- só no mestre de uma série
  until          date,                          -- inclusivo, data-calendário de São Paulo
  series_id      uuid references events(id) on delete cascade,
  original_start timestamptz,                   -- instante da ocorrência que esta filha substitui
  cancelled      boolean not null default false,
  created_by     uuid references members(id) on delete set null,
  updated_by     uuid references members(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint ends_after_start check (end_at > start_at),
  constraint recurrence_pair  check ((freq is null) = (until is null)),
  constraint child_shape check (
    (series_id is null and original_start is null and cancelled = false)
    or (series_id is not null and original_start is not null and freq is null)
  ),
  unique (series_id, original_start)
);
create index events_start_idx  on events (start_at);
create index events_series_idx on events (series_id);
create index events_master_idx on events (until) where freq is not null;

-- ── Funções auxiliares (SECURITY DEFINER evita recursão de RLS) ─────────────
create or replace function current_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from members where email = (auth.jwt() ->> 'email')::citext
$$;

create or replace function is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select current_member_id() is not null
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from members where id = current_member_id()), false)
$$;

-- Colunas de auditoria preenchidas no servidor (o cliente não consegue forjar).
create or replace function set_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := current_member_id();
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_by := current_member_id();
  new.updated_at := now();
  return new;
end $$;
create trigger events_audit before insert or update on events
  for each row execute function set_audit();

-- Todo membro nasce com um token de feed.
create or replace function ensure_feed_token() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into feed_tokens (member_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger members_feed_token after insert on members
  for each row execute function ensure_feed_token();

-- Nunca ficar sem admin.
create or replace function keep_one_admin() returns trigger
language plpgsql as $$
begin
  if (tg_op = 'DELETE' or new.is_admin = false) and old.is_admin
     and (select count(*) from members where is_admin and id <> old.id) = 0 then
    raise exception 'Não é possível remover o último admin.';
  end if;
  return coalesce(new, old);
end $$;
create trigger members_keep_admin before update or delete on members
  for each row execute function keep_one_admin();

-- E-mail sempre em minúsculas e sem espaços.
create or replace function normalize_member_email() returns trigger
language plpgsql as $$
begin
  new.email := lower(trim(new.email));
  return new;
end $$;
create trigger members_normalize_email before insert or update on members
  for each row execute function normalize_member_email();

-- Uma chamada por intervalo visível. SECURITY INVOKER: a RLS continua valendo.
-- Devolve: mestres (únicos ou séries) que tocam o intervalo, filhas que tocam o
-- intervalo (pelo horário novo OU pelo original), e o mestre de toda filha devolvida.
create or replace function events_in_range(p_ini timestamptz, p_fim timestamptz)
returns setof events language sql stable as $$
  with filhas as (
    select c.* from events c
    where c.series_id is not null
      and ((c.start_at < p_fim and c.end_at > p_ini)
           or (c.original_start >= p_ini and c.original_start < p_fim))
  ),
  mestres as (
    select e.* from events e
    where e.series_id is null and (
      (e.freq is null and e.start_at < p_fim and e.end_at > p_ini)
      or (e.freq is not null and e.start_at < p_fim
          and ((e.until::timestamp at time zone 'America/Sao_Paulo') + interval '1 day') > p_ini)
      or e.id in (select series_id from filhas)
    )
  )
  select * from mestres
  union
  select * from filhas
$$;

-- Gera um novo token de feed para o próprio membro.
create or replace function rotate_feed_token() returns text
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  update feed_tokens
     set token = encode(gen_random_bytes(24), 'hex'), created_at = now()
   where member_id = current_member_id()
   returning token into t;
  return t;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table members     enable row level security;
alter table feed_tokens enable row level security;
alter table events      enable row level security;
-- (sem políticas para anon → anon não vê nada; service_role ignora RLS)

create policy members_read   on members for select to authenticated using (is_member());
create policy members_insert on members for insert to authenticated with check (is_admin());
create policy members_update on members for update to authenticated using (is_admin()) with check (is_admin());
create policy members_delete on members for delete to authenticated using (is_admin() and id <> current_member_id());

create policy feed_read on feed_tokens for select to authenticated using (member_id = current_member_id());

create policy events_read   on events for select to authenticated using (is_member());
create policy events_insert on events for insert to authenticated with check (is_member());
create policy events_update on events for update to authenticated using (is_member()) with check (is_member());
create policy events_delete on events for delete to authenticated using (is_member());

grant execute on function events_in_range(timestamptz, timestamptz), rotate_feed_token() to authenticated;
revoke execute on function events_in_range(timestamptz, timestamptz), rotate_feed_token() from anon;

-- Atualizações em tempo real na tabela de eventos (respeitam a RLS).
alter publication supabase_realtime add table events;
