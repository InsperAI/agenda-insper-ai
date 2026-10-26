-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — votações de horário (estilo when2meet)
-- Rode inteiro no SQL Editor do Supabase, UMA vez, depois da 0003.
--
-- • A diretoria abre uma votação: dias (datas de uma semana, ou dias da semana
--   para algo recorrente), blocos de 30 min das 8h às 21h, duração e prazo.
-- • Convidados = níveis inteiros + ajustes por pessoa. Cada um marca os blocos
--   em que pode. Os convidados veem só a contagem por bloco (sem nomes).
-- • Quem abriu confirma um horário → vira evento (Reunião) para os convidados.
-- • events.convidados: pessoas que veem o evento mesmo fora do "publico".
--
-- Chave de bloco: "<dia>|<bloco>", com dia = 'AAAA-MM-DD' (única) ou '1'..'7'
-- (recorrente, 1 = segunda) e bloco = 0..25 (0 = 8h00, 25 = 20h30).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Convidados individuais em eventos ──────────────────────────────────
alter table events add column convidados uuid[] not null default '{}';

create or replace function pode_ver_evento(p_publico nivel[], p_convidados uuid[]) returns boolean
language sql stable security definer set search_path = public as $$
  select pode_ver(p_publico) or coalesce(current_member_id() = any (p_convidados), false)
$$;

drop policy events_read on events;
create policy events_read on events for select to authenticated using (is_member() and pode_ver_evento(publico, convidados));

-- Filhas de série herdam público e convidados do mestre (substitui as da 0003).
create or replace function herdar_visibilidade() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.series_id is not null then
    select publico, convidados into new.publico, new.convidados from events where id = new.series_id;
  end if;
  return new;
end $$;
drop trigger events_herdar_publico on events;
create trigger events_herdar_publico before insert or update of publico, convidados, series_id on events
  for each row execute function herdar_visibilidade();

create or replace function propagar_visibilidade() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.series_id is null and (new.publico is distinct from old.publico or new.convidados is distinct from old.convidados) then
    update events set publico = new.publico, convidados = new.convidados where series_id = new.id;
  end if;
  return new;
end $$;
drop trigger events_propagar_publico on events;
create trigger events_propagar_publico after update of publico, convidados on events
  for each row execute function propagar_visibilidade();

-- ── 2. Votações ────────────────────────────────────────────────────────────
create type modo_votacao as enum ('unica', 'recorrente');

create or replace function dias_validos(p_modo modo_votacao, p_dias text[]) returns boolean
language sql immutable as $$
  select cardinality(p_dias) between 1 and 14
     and not exists (
       select 1 from unnest(p_dias) d
       where case p_modo when 'unica' then d !~ '^\d{4}-\d{2}-\d{2}$' else d !~ '^[1-7]$' end
     )
$$;

create table votacoes (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null check (length(trim(titulo)) between 1 and 120),
  descricao     text not null default '' check (length(descricao) <= 1000),
  modo          modo_votacao not null,
  dias          text[] not null,
  duracao_min   int not null check (duracao_min between 30 and 480 and duracao_min % 30 = 0),
  prazo         timestamptz not null,
  niveis        nivel[] not null default '{}',  -- níveis convidados inteiros (viram o "publico" do evento)
  criado_por    uuid references members(id) on delete set null,
  evento_id     uuid references events(id) on delete set null,
  confirmada_em timestamptz,
  created_at    timestamptz not null default now(),
  constraint dias_ok check (dias_validos(modo, dias))
);

create table votacao_convidados (
  votacao_id uuid not null references votacoes(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  primary key (votacao_id, member_id)
);

create table votacao_respostas (
  votacao_id uuid not null,
  member_id  uuid not null default current_member_id(),
  blocos     text[] not null default '{}' check (cardinality(blocos) <= 14 * 26),
  updated_at timestamptz not null default now(),
  primary key (votacao_id, member_id),
  foreign key (votacao_id, member_id) references votacao_convidados (votacao_id, member_id) on delete cascade
);

-- ── Auxiliares (SECURITY DEFINER evita recursão de RLS) ───────────────────
create or replace function eh_criador_votacao(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from votacoes where id = p_id and criado_por = current_member_id())
$$;

create or replace function eh_convidado_votacao(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from votacao_convidados where votacao_id = p_id and member_id = current_member_id())
$$;

-- Aceita respostas enquanto não foi confirmada e o prazo não venceu. `confirmada_em`
-- (e não evento_id) é o que vale: apagar o evento depois não reabre a votação.
create or replace function votacao_aceita(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from votacoes where id = p_id and confirmada_em is null and prazo > now())
$$;

-- Toda chave precisa ser "<dia da votação>|<0..25>".
create or replace function validar_resposta() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_dias text[];
begin
  select dias into v_dias from votacoes where id = new.votacao_id;
  -- Formato exato "<dia>|<0..25>" (sem zero à esquerda), dia da votação, sem nulos.
  if exists (
    select 1 from unnest(new.blocos) k
    where k is null
       or k !~ '^[^|]+\|(0|[1-9]|1[0-9]|2[0-5])$'
       or split_part(k, '|', 1) <> all (v_dias)
  ) then
    raise exception 'Bloco inválido para esta votação.';
  end if;
  new.blocos := array(select distinct unnest(new.blocos) order by 1);
  new.updated_at := now();
  return new;
end $$;
create trigger respostas_validar before insert or update on votacao_respostas
  for each row execute function validar_resposta();

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table votacoes           enable row level security;
alter table votacao_convidados enable row level security;
alter table votacao_respostas  enable row level security;

-- Criar, confirmar e reabrir só pelas funções abaixo; direto só ler e excluir.
create policy votacoes_read   on votacoes for select to authenticated using (eh_criador_votacao(id) or eh_convidado_votacao(id));
create policy votacoes_delete on votacoes for delete to authenticated using (eh_criador_votacao(id));

create policy convidados_read on votacao_convidados for select to authenticated
  using (member_id = current_member_id() or eh_criador_votacao(votacao_id));

-- Cada um só mexe na própria resposta, e só enquanto a votação aceita. Quem abriu lê todas.
create policy respostas_read on votacao_respostas for select to authenticated
  using (member_id = current_member_id() or eh_criador_votacao(votacao_id));
create policy respostas_insert on votacao_respostas for insert to authenticated
  with check (member_id = current_member_id() and eh_convidado_votacao(votacao_id) and votacao_aceita(votacao_id));
create policy respostas_update on votacao_respostas for update to authenticated
  using (member_id = current_member_id() and votacao_aceita(votacao_id))
  with check (member_id = current_member_id() and votacao_aceita(votacao_id));

-- ── Funções de negócio ─────────────────────────────────────────────────────
create or replace function criar_votacao(
  p_titulo text, p_descricao text, p_modo modo_votacao, p_dias text[], p_duracao_min int,
  p_prazo timestamptz, p_niveis nivel[], p_incluir uuid[], p_excluir uuid[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_eu uuid := current_member_id();
begin
  if not pode_editar() then
    raise exception 'Só a diretoria abre votações.';
  end if;
  if p_prazo <= now() then
    raise exception 'O prazo precisa ser no futuro.';
  end if;
  if p_modo = 'unica' and exists (
    select 1 from unnest(p_dias) d
    where d ~ '^\d{4}-\d{2}-\d{2}$' and d::date < (now() at time zone 'America/Sao_Paulo')::date
  ) then
    raise exception 'Escolha dias que ainda não passaram.';
  end if;
  insert into votacoes (titulo, descricao, modo, dias, duracao_min, prazo, niveis, criado_por)
  values (trim(p_titulo), coalesce(p_descricao, ''), p_modo, array(select distinct unnest(p_dias) order by 1),
          p_duracao_min, p_prazo, coalesce(p_niveis, '{}'), v_eu)
  returning id into v_id;

  -- Quem abriu sempre participa.
  insert into votacao_convidados (votacao_id, member_id)
  select v_id, m.id from members m
  where (m.nivel = any (coalesce(p_niveis, '{}')) or m.id = any (coalesce(p_incluir, '{}')) or m.id = v_eu)
    and (m.id = v_eu or not (m.id = any (coalesce(p_excluir, '{}'))));
  return v_id;
end $$;

-- Contagem por bloco, sem nomes: o que os convidados enxergam.
create or replace function mapa_votacao(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (eh_convidado_votacao(p_id) or eh_criador_votacao(p_id)) then
    raise exception 'Você não participa desta votação.';
  end if;
  return jsonb_build_object(
    'total', (select count(*) from votacao_convidados where votacao_id = p_id),
    'respondidos', (select count(*) from votacao_respostas where votacao_id = p_id),
    'contagem', coalesce((
      select jsonb_object_agg(k, n) from (
        select k, count(*) as n from votacao_respostas r, unnest(r.blocos) k
        where r.votacao_id = p_id group by k
      ) t
    ), '{}'::jsonb)
  );
end $$;

-- Para o contador da barra: votações a responder e resultados prontos para quem abriu.
create or replace function pendencias_votacao() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'responder', (
      select count(*) from votacoes v
      join votacao_convidados c on c.votacao_id = v.id and c.member_id = current_member_id()
      where v.confirmada_em is null and v.prazo > now()
        and not exists (select 1 from votacao_respostas r where r.votacao_id = v.id and r.member_id = c.member_id)
    ),
    'resultados', (
      select count(*) from votacoes v
      where v.criado_por = current_member_id() and v.confirmada_em is null
        and (v.prazo <= now()
             or (select count(*) from votacao_respostas r where r.votacao_id = v.id)
              = (select count(*) from votacao_convidados c where c.votacao_id = v.id))
    )
  )
$$;

-- Confirma um horário: cria o evento (Reunião) para os convidados, numa transação.
create or replace function confirmar_votacao(p_id uuid, p_inicio timestamptz, p_freq frequencia, p_until date)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v votacoes;
  v_local timestamp := p_inicio at time zone 'America/Sao_Paulo';
  v_minutos int := extract(hour from v_local) * 60 + extract(minute from v_local);
  v_evento uuid;
  v_publico nivel[];
begin
  select * into v from votacoes where id = p_id for update;
  if v.id is null or v.criado_por is distinct from current_member_id() or not pode_editar() then
    raise exception 'Só quem abriu a votação (e ainda é da diretoria) pode confirmar.';
  end if;
  if v.confirmada_em is not null then
    raise exception 'Esta votação já foi confirmada.';
  end if;
  if v_minutos % 30 <> 0 or v_minutos < 8 * 60 or v_minutos + v.duracao_min > 21 * 60 then
    raise exception 'Horário fora da grade da votação.';
  end if;
  if (v.modo = 'unica' and not (to_char(v_local, 'YYYY-MM-DD') = any (v.dias)))
     or (v.modo = 'recorrente' and not (extract(isodow from v_local)::text = any (v.dias))) then
    raise exception 'Esse dia não faz parte da votação.';
  end if;
  if (v.modo = 'unica' and p_freq is not null) or (v.modo = 'recorrente' and (p_freq is null or p_until is null)) then
    raise exception 'Repetição inválida para este tipo de votação.';
  end if;

  -- Um nível só vira "publico" se TODOS os seus membros estão convidados (ninguém
  -- foi excluído). Os demais convidados entram um a um; a diretoria já vê tudo.
  v_publico := array(
    select n from unnest(v.niveis) n
    where n <> 'diretoria'
      and not exists (
        select 1 from members m
        where m.nivel = n
          and not exists (select 1 from votacao_convidados c where c.votacao_id = v.id and c.member_id = m.id)
      )
  );

  insert into events (title, category, start_at, end_at, description, freq, until, publico, convidados)
  values (
    v.titulo, 'reuniao', p_inicio, p_inicio + make_interval(mins => v.duracao_min), v.descricao,
    p_freq, case when p_freq is null then null else p_until end,
    v_publico,
    array(
      select c.member_id from votacao_convidados c join members m on m.id = c.member_id
      where c.votacao_id = v.id and m.nivel <> 'diretoria' and not (m.nivel = any (v_publico))
    )
  )
  returning id into v_evento;

  update votacoes set evento_id = v_evento, confirmada_em = now() where id = v.id;
  return v_evento;
end $$;

-- Reabre com novo prazo (e, se quiser, outros dias). Respostas fora dos dias novos são descartadas.
create or replace function reabrir_votacao(p_id uuid, p_prazo timestamptz, p_dias text[]) returns void
language plpgsql security definer set search_path = public as $$
declare v votacoes;
begin
  select * into v from votacoes where id = p_id for update;
  if v.id is null or v.criado_por is distinct from current_member_id() or not pode_editar() then
    raise exception 'Só quem abriu a votação (e ainda é da diretoria) pode reabrir.';
  end if;
  if v.confirmada_em is not null then
    raise exception 'Esta votação já foi confirmada.';
  end if;
  if p_prazo <= now() then
    raise exception 'O prazo precisa ser no futuro.';
  end if;
  update votacoes set prazo = p_prazo, dias = coalesce(nullif(p_dias, '{}'), dias) where id = p_id;
  if p_dias is not null and cardinality(p_dias) > 0 then
    update votacao_respostas
       set blocos = array(select k from unnest(blocos) k where split_part(k, '|', 1) = any (p_dias))
     where votacao_id = p_id;
  end if;
end $$;

revoke execute on function eh_criador_votacao(uuid), eh_convidado_votacao(uuid), votacao_aceita(uuid),
  pode_ver_evento(nivel[], uuid[]) from anon, public;
grant execute on function eh_criador_votacao(uuid), eh_convidado_votacao(uuid), votacao_aceita(uuid),
  pode_ver_evento(nivel[], uuid[]) to authenticated;

revoke execute on function criar_votacao(text, text, modo_votacao, text[], int, timestamptz, nivel[], uuid[], uuid[]),
  mapa_votacao(uuid), pendencias_votacao(), confirmar_votacao(uuid, timestamptz, frequencia, date),
  reabrir_votacao(uuid, timestamptz, text[]) from anon, public;
grant execute on function criar_votacao(text, text, modo_votacao, text[], int, timestamptz, nivel[], uuid[], uuid[]),
  mapa_votacao(uuid), pendencias_votacao(), confirmar_votacao(uuid, timestamptz, frequencia, date),
  reabrir_votacao(uuid, timestamptz, text[]) to authenticated;
