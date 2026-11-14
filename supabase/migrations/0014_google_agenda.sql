-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — Google Agenda "na hora" (push pela API, como no SIGE)
-- Rode inteiro no SQL Editor do Supabase, depois da 0013. Pode rodar de novo.
--
-- O link .ics é PUXADO pelo Google a cada 12–24 h. Aqui a agenda EMPURRA:
-- uma conta Google da Insper AI (conectada por um admin em Membros) é a
-- organizadora; cada evento vira um evento numa agenda dessa conta, com quem
-- pode vê-lo (e ativou em Conectar) como convidado. Convidado do Google vê o
-- evento no próprio Google Agenda segundos depois de salvar.
--
-- • google_conta      — a conta conectada (uma só). Só o servidor (service role) lê.
-- • google_inscricoes — quem quer receber, e em qual e-mail Google. Cada um mexe na sua.
-- • google_fila       — séries que mudaram e ainda não foram para o Google.
-- • google_espelho    — o que já está no Google (id + assinatura do conteúdo),
--                       para não reenviar o que não mudou e saber o que apagar.
-- • Todo insert/update/delete em events enfileira a série e, uma vez por
--   comando, chama /api/google/sincronizar pelo pg_net (depois do commit).
--   O cron diário (/api/ping) varre o que sobrar.
-- • O aviso de "destructive operations" vem dos `drop … if exists`. É esperado.
-- ═══════════════════════════════════════════════════════════════════════════

-- pg_net faz HTTP de dentro do banco (é o que os Database Webhooks usam).
-- Se não der para ativar, a fila continua valendo e o cron diário a esvazia.
do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net indisponível (%): a sincronização fica para o cron diário.', sqlerrm;
end $$;

-- ── A conta da Insper AI ────────────────────────────────────────────────────
create table if not exists google_conta (
  id            boolean primary key default true check (id),
  email         text not null,
  refresh_token text not null,
  calendario_id text,
  site_url      text not null,
  segredo       text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  conectada_por uuid references members(id) on delete set null,
  conectada_em  timestamptz not null default now(),
  erro          text,
  erro_em       timestamptz,
  sincronizada_em timestamptz
);
revoke all on google_conta from anon, authenticated, public;
alter table google_conta enable row level security;
-- Sem policies: só a service role (que ignora a RLS) chega aqui.

-- ── Quem recebe ─────────────────────────────────────────────────────────────
create table if not exists google_inscricoes (
  member_id uuid primary key references members(id) on delete cascade default current_member_id(),
  email     citext not null check (email::text ~*'^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  criada_em timestamptz not null default now()
);
revoke all on google_inscricoes from anon, authenticated, public;
grant select, insert, update, delete on google_inscricoes to authenticated;
alter table google_inscricoes enable row level security;
drop policy if exists google_inscricoes_a_sua on google_inscricoes;
create policy google_inscricoes_a_sua on google_inscricoes
  for all to authenticated
  using (member_id = current_member_id())
  with check (member_id = current_member_id());

-- ── Fila e espelho (só o servidor) ──────────────────────────────────────────
create table if not exists google_fila (
  serie_id    uuid primary key,              -- id do mestre (sem FK: a série pode ter sido apagada)
  pedido_em   timestamptz not null default clock_timestamp(),
  proxima_em  timestamptz not null default now(),
  travada_ate timestamptz,
  tentativas  integer not null default 0,
  erro        text
);
create table if not exists google_espelho (
  evento_id     uuid primary key,            -- linha de events (mestre ou filha); sem FK pelo mesmo motivo
  serie_id      uuid not null,
  assinatura    text not null,
  atualizado_em timestamptz not null default now()
);
create index if not exists google_espelho_serie_idx on google_espelho (serie_id);
revoke all on google_fila, google_espelho from anon, authenticated, public;
alter table google_fila enable row level security;
alter table google_espelho enable row level security;

-- ── Enfileirar ──────────────────────────────────────────────────────────────
create or replace function google_enfileirar(p_serie uuid) returns void
language sql security definer set search_path = public as $$
  -- Re-enfileirar não solta a trava: quem está processando vê o pedido novo
  -- (pedido_em mudou), não apaga a linha e passa de novo nela.
  insert into google_fila (serie_id) values (p_serie)
  on conflict (serie_id) do update
    set pedido_em = clock_timestamp(), proxima_em = now(), tentativas = 0, erro = null;
$$;

-- Tudo o que pode estar (ou deveria estar) no Google: séries que ainda não
-- acabaram há mais de 30 dias + o que já foi enviado.
create or replace function google_enfileirar_tudo() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with alvo as (
    select id from events
     where series_id is null
       and ((freq is null and end_at > now() - interval '30 days')
            or (freq is not null and until >= current_date - 30))
    union
    select serie_id from google_espelho
  )
  insert into google_fila (serie_id) select id from alvo
  on conflict (serie_id) do update set pedido_em = clock_timestamp(), proxima_em = now(), tentativas = 0, erro = null;
  get diagnostics n = row_count;
  return n;
end $$;

-- Chama o app (depois do commit, pelo pg_net). Nunca derruba quem salvou o evento.
create or replace function google_avisar() returns trigger
language plpgsql security definer set search_path = public as $$
declare c google_conta;
begin
  select * into c from google_conta where id;
  if c.site_url is null
     or not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                     where n.nspname = 'net' and p.proname = 'http_post') then
    return null;
  end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 5000)'
    using c.site_url || '/api/google/sincronizar', '{}'::jsonb,
          jsonb_build_object('Content-Type', 'application/json', 'x-agenda-segredo', c.segredo);
  return null;
exception when others then
  raise warning 'google_avisar: %', sqlerrm;
  return null;
end $$;

create or replace function google_evento_mudou() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then perform google_enfileirar(coalesce(old.series_id, old.id)); end if;
  if tg_op in ('INSERT', 'UPDATE') then perform google_enfileirar(coalesce(new.series_id, new.id)); end if;
  return null;
end $$;

drop trigger if exists events_google_fila on events;
create trigger events_google_fila after insert or update or delete on events
  for each row execute function google_evento_mudou();
drop trigger if exists events_google_avisar on events;
create trigger events_google_avisar after insert or update or delete on events
  for each statement execute function google_avisar();

-- Quem recebe mudou (ativou, trocou e-mail, saiu, mudou de nível): os
-- convidados de tudo podem ter mudado. O espelho evita reenviar o que ficou igual.
create or replace function google_publico_mudou() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Mudança de nível só importa para quem recebe no Google.
  -- IFs aninhados: `new.nivel` só existe em members (o plpgsql não faz curto-circuito ao planejar).
  if tg_table_name = 'members' then
    if new.nivel is not distinct from old.nivel
       or not exists (select 1 from google_inscricoes where member_id = new.id) then
      return null;
    end if;
  end if;
  perform google_enfileirar_tudo();
  return null;
end $$;

drop trigger if exists google_inscricoes_fila on google_inscricoes;
create trigger google_inscricoes_fila after insert or update or delete on google_inscricoes
  for each row execute function google_publico_mudou();
drop trigger if exists google_inscricoes_avisar on google_inscricoes;
create trigger google_inscricoes_avisar after insert or update or delete on google_inscricoes
  for each statement execute function google_avisar();
drop trigger if exists members_google_fila on members;
create trigger members_google_fila after update of nivel on members
  for each row execute function google_publico_mudou();
drop trigger if exists members_google_avisar on members;
create trigger members_google_avisar after update of nivel on members
  for each statement execute function google_avisar();

-- ── O servidor pega um lote e devolve ───────────────────────────────────────
create or replace function google_pegar_fila(p_limite integer default 20)
returns table (serie_id uuid, pedido_em timestamptz, tentativas integer)
language sql security definer set search_path = public as $$
  update google_fila f
     set travada_ate = now() + interval '2 minutes'
   where f.serie_id in (
     select q.serie_id from google_fila q
      where q.proxima_em <= now() and (q.travada_ate is null or q.travada_ate < now())
      order by q.proxima_em
      limit p_limite
      for update skip locked)
  returning f.serie_id, f.pedido_em, f.tentativas;
$$;

-- Feito: some da fila, a não ser que alguém tenha mudado a série no meio.
create or replace function google_concluir(p_serie uuid, p_pedido_em timestamptz) returns void
language sql security definer set search_path = public as $$
  delete from google_fila where serie_id = p_serie and pedido_em = p_pedido_em;
  update google_fila set travada_ate = null where serie_id = p_serie;
$$;

-- Falhou: tenta de novo mais tarde (1, 2, 4… min, no máximo 6 h).
create or replace function google_falhou(p_serie uuid, p_erro text) returns void
language sql security definer set search_path = public as $$
  update google_fila
     set travada_ate = null,
         tentativas = tentativas + 1,
         erro = left(p_erro, 500),
         proxima_em = now() + least(interval '6 hours', interval '1 minute' * power(2, least(tentativas, 9)))
   where serie_id = p_serie;
$$;

-- Para o feed: as séries que já estão no Google, num único array (o PostgREST corta listas em 1000 linhas).
create or replace function google_series_enviadas() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct serie_id), '{}') from google_espelho
$$;

revoke execute on function google_series_enviadas() from anon, authenticated, public;
grant execute on function google_series_enviadas() to service_role;
revoke execute on function google_enfileirar(uuid), google_enfileirar_tudo(), google_pegar_fila(integer),
  google_concluir(uuid, timestamptz), google_falhou(uuid, text) from anon, authenticated, public;
grant execute on function google_enfileirar(uuid), google_enfileirar_tudo(), google_pegar_fila(integer),
  google_concluir(uuid, timestamptz), google_falhou(uuid, text) to service_role;
revoke execute on function google_avisar(), google_evento_mudou(), google_publico_mudou() from anon, authenticated, public;

-- ── O que a interface pode saber ────────────────────────────────────────────
-- Todo membro: se a conta está conectada (para mostrar a opção em Conectar).
-- Admin: também o e-mail da conta, a fila e o último erro.
create or replace function google_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when not is_member() then null
    when not is_admin() then jsonb_build_object('conectada', exists (select 1 from google_conta))
    else jsonb_build_object(
      'conectada', c.email is not null,
      'email', c.email,
      'conectada_em', c.conectada_em,
      'sincronizada_em', c.sincronizada_em,
      'erro', c.erro,
      'erro_em', c.erro_em,
      'pendentes', (select count(*) from google_fila),
      'com_erro', (select count(*) from google_fila where erro is not null),
      'inscritos', (select count(*) from google_inscricoes)
    )
  end
  from (select 1) x left join google_conta c on c.id
$$;
revoke execute on function google_status() from anon, public;
grant execute on function google_status() to authenticated;
