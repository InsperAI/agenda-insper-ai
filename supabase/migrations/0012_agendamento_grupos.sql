-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — horários para grupos (ex.: apresentações de projeto)
-- Rode inteiro no SQL Editor do Supabase, depois da 0011. Pode rodar de novo.
--
-- • Quem organiza (diretoria ou membro) gera horários (janelas fatiadas) e
--   convida níveis/pessoas, como num pedido de disponibilidade.
-- • Cada convidado cria um grupo ou entra num existente (estilo GitHub
--   Classroom). Uma pessoa fica em no máximo um grupo por agendamento.
-- • Qualquer integrante reserva UM horário para o grupo; um horário tem no
--   máximo um grupo (unique), então não há sobreposição nem corrida.
-- • Até o prazo: trocar/soltar a reserva, sair do grupo (grupo vazio some e
--   libera o horário). Quem organiza — ou a diretoria — mexe em tudo até
--   confirmar: renomear/excluir grupo, mover pessoas, definir horário.
-- • Confirmar cria um evento (Reunião) por grupo com horário, visível para os
--   integrantes e para quem organizou; fica no nome de quem organizou. Como
--   tem convidados individuais, só a diretoria edita esses eventos (regra 0007).
-- • Também corrige pode_decidir_votacao (0010) para pedido sem dono.
-- • Toda escrita passa pelas funções abaixo; a RLS só libera leitura (e o
--   excluir de quem criou).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tabelas ────────────────────────────────────────────────────────────────
create table if not exists agendamentos (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null check (length(trim(titulo)) between 1 and 120),
  descricao     text not null default '' check (length(descricao) <= 1000),
  prazo         timestamptz not null,
  niveis        nivel[] not null default '{}',
  criado_por    uuid references members(id) on delete set null,
  confirmado_em timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists agendamento_convidados (
  agendamento_id uuid not null references agendamentos(id) on delete cascade,
  member_id      uuid not null references members(id) on delete cascade,
  primary key (agendamento_id, member_id)
);

create table if not exists agendamento_horarios (
  id             uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references agendamentos(id) on delete cascade,
  inicio         timestamptz not null,
  fim            timestamptz not null,
  constraint horario_ok check (fim > inicio and fim - inicio <= interval '8 hours'),
  unique (agendamento_id, inicio)
);

create table if not exists agendamento_grupos (
  id             uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references agendamentos(id) on delete cascade,
  nome           text not null check (length(trim(nome)) between 1 and 60),
  -- unique: um horário é de no máximo um grupo (é isto que impede sobreposição).
  horario_id     uuid unique references agendamento_horarios(id) on delete set null,
  evento_id      uuid references events(id) on delete set null,
  criado_por     uuid references members(id) on delete set null,
  created_at     timestamptz not null default now()
);
create unique index if not exists agendamento_grupos_nome on agendamento_grupos (agendamento_id, lower(trim(nome)));

create table if not exists agendamento_integrantes (
  agendamento_id uuid not null,
  member_id      uuid not null,
  grupo_id       uuid not null references agendamento_grupos(id) on delete cascade,
  primary key (agendamento_id, member_id),
  foreign key (agendamento_id, member_id) references agendamento_convidados (agendamento_id, member_id) on delete cascade
);
create index if not exists agendamento_integrantes_grupo on agendamento_integrantes (grupo_id);
create index if not exists agendamento_convidados_membro on agendamento_convidados (member_id);

-- O horário de um grupo é sempre do mesmo agendamento (defesa além das funções).
create or replace function ag_horario_do_mesmo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.horario_id is not null and not exists (
    select 1 from agendamento_horarios where id = new.horario_id and agendamento_id = new.agendamento_id
  ) then
    raise exception 'Horário inválido.';
  end if;
  return new;
end $$;
revoke execute on function ag_horario_do_mesmo() from anon, authenticated, public;
drop trigger if exists agendamento_grupos_horario on agendamento_grupos;
create trigger agendamento_grupos_horario before insert or update of horario_id on agendamento_grupos
  for each row execute function ag_horario_do_mesmo();

-- ── Auxiliares ─────────────────────────────────────────────────────────────
create or replace function ag_convidado(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from agendamento_convidados where agendamento_id = p_id and member_id = current_member_id())
$$;

-- Vê tudo: quem criou e a diretoria.
create or replace function ag_acompanha(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select pode_editar() or exists (select 1 from agendamentos where id = p_id and criado_por = current_member_id())
$$;

create or replace function ag_pode_ler(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_member() and (ag_convidado(p_id) or ag_acompanha(p_id))
$$;

-- Decide (mexe nos grupos, confirma): quem criou (se ainda cria eventos) ou a diretoria.
create or replace function ag_pode_decidir(a agendamentos) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(pode_editar() or (a.criado_por is not null and a.criado_por = current_member_id() and pode_criar_evento()), false)
$$;

-- Mesma proteção para os pedidos de disponibilidade (0010): pedido órfão (quem
-- criou foi removido) dava NULL e passava pelo "if not".
create or replace function pode_decidir_votacao(v votacoes) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(pode_editar() or (v.criado_por is not null and v.criado_por = current_member_id() and pode_criar_evento()), false)
$$;

revoke execute on function ag_convidado(uuid), ag_acompanha(uuid), ag_pode_ler(uuid) from anon, public;
grant execute on function ag_convidado(uuid), ag_acompanha(uuid), ag_pode_ler(uuid) to authenticated;
revoke execute on function ag_pode_decidir(agendamentos) from anon, authenticated, public;

-- ── RLS: só leitura (e excluir de quem criou) ──────────────────────────────
alter table agendamentos            enable row level security;
alter table agendamento_convidados  enable row level security;
alter table agendamento_horarios    enable row level security;
alter table agendamento_grupos      enable row level security;
alter table agendamento_integrantes enable row level security;

drop policy if exists agendamentos_read on agendamentos;
create policy agendamentos_read on agendamentos for select to authenticated using (ag_pode_ler(id));
drop policy if exists agendamentos_delete on agendamentos;
create policy agendamentos_delete on agendamentos for delete to authenticated
  using (criado_por = current_member_id());

-- Todo convidado vê os grupos, quem está em cada um e os horários (é o "Classroom").
drop policy if exists ag_convidados_read on agendamento_convidados;
create policy ag_convidados_read on agendamento_convidados for select to authenticated using (ag_pode_ler(agendamento_id));
drop policy if exists ag_horarios_read on agendamento_horarios;
create policy ag_horarios_read on agendamento_horarios for select to authenticated using (ag_pode_ler(agendamento_id));
drop policy if exists ag_grupos_read on agendamento_grupos;
create policy ag_grupos_read on agendamento_grupos for select to authenticated using (ag_pode_ler(agendamento_id));
drop policy if exists ag_integrantes_read on agendamento_integrantes;
create policy ag_integrantes_read on agendamento_integrantes for select to authenticated using (ag_pode_ler(agendamento_id));

-- ── Funções internas (sem acesso do cliente) ───────────────────────────────
-- Lê o agendamento travando a linha; erro se não existe.
create or replace function ag_travar(p_id uuid) returns agendamentos
language plpgsql security definer set search_path = public as $$
declare a agendamentos;
begin
  select * into a from agendamentos where id = p_id for no key update;
  if a.id is null then
    raise exception 'Agendamento não encontrado.';
  end if;
  return a;
end $$;

-- Para quem responde: convidado e ainda dentro do prazo.
create or replace function ag_exigir_aberto_para_mim(a agendamentos) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from agendamento_convidados where agendamento_id = a.id and member_id = current_member_id()) then
    raise exception 'Você não está entre os convidados deste agendamento.';
  end if;
  if a.confirmado_em is not null then
    raise exception 'Este agendamento já foi confirmado.';
  end if;
  if a.prazo <= now() then
    raise exception 'O prazo deste agendamento já acabou.';
  end if;
end $$;

-- Para quem organiza: pode decidir e ainda não confirmou.
create or replace function ag_exigir_organizador(a agendamentos) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(ag_pode_decidir(a), false) then
    raise exception 'Só quem organizou ou a diretoria pode fazer isso.';
  end if;
  if a.confirmado_em is not null then
    raise exception 'Este agendamento já foi confirmado.';
  end if;
end $$;

-- Tira a pessoa do grupo atual; se o grupo ficar vazio, ele some (e libera o horário).
create or replace function ag_tirar_do_grupo(p_ag uuid, p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_grupo uuid;
begin
  delete from agendamento_integrantes where agendamento_id = p_ag and member_id = p_member returning grupo_id into v_grupo;
  if v_grupo is not null and not exists (select 1 from agendamento_integrantes where grupo_id = v_grupo) then
    delete from agendamento_grupos where id = v_grupo;
  end if;
end $$;

revoke execute on function ag_travar(uuid), ag_exigir_aberto_para_mim(agendamentos), ag_exigir_organizador(agendamentos),
  ag_tirar_do_grupo(uuid, uuid) from anon, authenticated, public;

-- ── Criar ──────────────────────────────────────────────────────────────────
-- p_horarios: [{"inicio": "...Z", "fim": "...Z"}, ...] (gerados no cliente a partir das janelas).
create or replace function criar_agendamento(
  p_titulo text, p_descricao text, p_prazo timestamptz, p_niveis nivel[], p_incluir uuid[], p_excluir uuid[], p_horarios jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_eu uuid := current_member_id();
begin
  if not pode_criar_evento() then
    raise exception 'Trainees não criam agendamentos.';
  end if;
  if p_prazo <= now() then
    raise exception 'O prazo precisa ser no futuro.';
  end if;
  if jsonb_typeof(p_horarios) is distinct from 'array' or jsonb_array_length(p_horarios) not between 1 and 200 then
    raise exception 'Gere entre 1 e 200 horários.';
  end if;

  insert into agendamentos (titulo, descricao, prazo, niveis, criado_por)
  values (trim(p_titulo), coalesce(p_descricao, ''), p_prazo, coalesce(p_niveis, '{}'), v_eu)
  returning id into v_id;

  begin
    insert into agendamento_horarios (agendamento_id, inicio, fim)
    select v_id, (h->>'inicio')::timestamptz, (h->>'fim')::timestamptz from jsonb_array_elements(p_horarios) h;
  exception
    when unique_violation then raise exception 'Há horários repetidos.';
    when not_null_violation or check_violation or invalid_datetime_format then raise exception 'Há horários inválidos.';
  end;

  if exists (select 1 from agendamento_horarios where agendamento_id = v_id and inicio <= now()) then
    raise exception 'Os horários precisam ser no futuro.';
  end if;
  if exists (
    select 1 from agendamento_horarios a join agendamento_horarios b
      on a.agendamento_id = b.agendamento_id and a.id <> b.id and tstzrange(a.inicio, a.fim) && tstzrange(b.inicio, b.fim)
    where a.agendamento_id = v_id
  ) then
    raise exception 'Há horários sobrepostos.';
  end if;

  -- Quem organiza também entra (pode querer formar grupo, e recebe o evento).
  insert into agendamento_convidados (agendamento_id, member_id)
  select v_id, m.id from members m
  where (m.nivel = any (coalesce(p_niveis, '{}')) or m.id = any (coalesce(p_incluir, '{}')) or m.id = v_eu)
    and (m.id = v_eu or not (m.id = any (array_remove(coalesce(p_excluir, '{}'), null))));
  return v_id;
end $$;

-- ── Quem responde ──────────────────────────────────────────────────────────
create or replace function criar_grupo(p_ag uuid, p_nome text) returns uuid
language plpgsql security definer set search_path = public as $$
declare a agendamentos; v_grupo uuid; v_eu uuid := current_member_id();
begin
  a := ag_travar(p_ag);
  perform ag_exigir_aberto_para_mim(a);
  perform ag_tirar_do_grupo(a.id, v_eu);
  begin
    insert into agendamento_grupos (agendamento_id, nome, criado_por) values (a.id, trim(p_nome), v_eu) returning id into v_grupo;
  exception when unique_violation then
    raise exception 'Já existe um grupo com esse nome.';
  end;
  insert into agendamento_integrantes (agendamento_id, member_id, grupo_id) values (a.id, v_eu, v_grupo);
  return v_grupo;
end $$;

create or replace function entrar_grupo(p_grupo uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a agendamentos; v_ag uuid; v_eu uuid := current_member_id();
begin
  select agendamento_id into v_ag from agendamento_grupos where id = p_grupo;
  if v_ag is null then
    raise exception 'Grupo não encontrado.';
  end if;
  a := ag_travar(v_ag);
  perform ag_exigir_aberto_para_mim(a);
  if exists (select 1 from agendamento_integrantes where agendamento_id = a.id and member_id = v_eu and grupo_id = p_grupo) then
    return;
  end if;
  perform ag_tirar_do_grupo(a.id, v_eu);
  if not exists (select 1 from agendamento_grupos where id = p_grupo) then
    raise exception 'Grupo não encontrado.';
  end if;
  insert into agendamento_integrantes (agendamento_id, member_id, grupo_id) values (a.id, v_eu, p_grupo);
end $$;

create or replace function sair_grupo(p_ag uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a agendamentos;
begin
  a := ag_travar(p_ag);
  perform ag_exigir_aberto_para_mim(a);
  perform ag_tirar_do_grupo(a.id, current_member_id());
end $$;

-- Reserva (ou troca) o horário do meu grupo. p_horario nulo = soltar.
create or replace function reservar_horario(p_ag uuid, p_horario uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a agendamentos; v_grupo uuid;
begin
  a := ag_travar(p_ag);
  perform ag_exigir_aberto_para_mim(a);
  select grupo_id into v_grupo from agendamento_integrantes where agendamento_id = a.id and member_id = current_member_id();
  if v_grupo is null then
    raise exception 'Entre num grupo antes de reservar.';
  end if;
  if p_horario is not null and not exists (select 1 from agendamento_horarios where id = p_horario and agendamento_id = a.id) then
    raise exception 'Horário inválido.';
  end if;
  if p_horario is not null and exists (select 1 from agendamento_horarios where id = p_horario and inicio <= now()) then
    raise exception 'Esse horário já passou.';
  end if;
  begin
    update agendamento_grupos set horario_id = p_horario where id = v_grupo;
  exception when unique_violation then
    raise exception 'Outro grupo acabou de reservar esse horário.';
  end;
end $$;

-- ── Quem organiza (ou a diretoria) ─────────────────────────────────────────
create or replace function org_criar_grupo(p_ag uuid, p_nome text) returns uuid
language plpgsql security definer set search_path = public as $$
declare a agendamentos; v_grupo uuid;
begin
  a := ag_travar(p_ag);
  perform ag_exigir_organizador(a);
  begin
    insert into agendamento_grupos (agendamento_id, nome, criado_por) values (a.id, trim(p_nome), current_member_id()) returning id into v_grupo;
  exception when unique_violation then
    raise exception 'Já existe um grupo com esse nome.';
  end;
  return v_grupo;
end $$;

create or replace function org_renomear_grupo(p_grupo uuid, p_nome text) returns void
language plpgsql security definer set search_path = public as $$
declare a agendamentos; v_ag uuid;
begin
  select agendamento_id into v_ag from agendamento_grupos where id = p_grupo;
  if v_ag is null then raise exception 'Grupo não encontrado.'; end if;
  a := ag_travar(v_ag);
  perform ag_exigir_organizador(a);
  begin
    update agendamento_grupos set nome = trim(p_nome) where id = p_grupo;
  exception when unique_violation then
    raise exception 'Já existe um grupo com esse nome.';
  end;
end $$;

create or replace function org_excluir_grupo(p_grupo uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a agendamentos; v_ag uuid;
begin
  select agendamento_id into v_ag from agendamento_grupos where id = p_grupo;
  if v_ag is null then raise exception 'Grupo não encontrado.'; end if;
  a := ag_travar(v_ag);
  perform ag_exigir_organizador(a);
  delete from agendamento_grupos where id = p_grupo;  -- integrantes saem em cascata
end $$;

-- Move um convidado para um grupo (p_grupo nulo = tira de todos).
create or replace function org_mover_pessoa(p_ag uuid, p_member uuid, p_grupo uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a agendamentos;
begin
  a := ag_travar(p_ag);
  perform ag_exigir_organizador(a);
  if not exists (select 1 from agendamento_convidados where agendamento_id = a.id and member_id = p_member) then
    raise exception 'Essa pessoa não está entre os convidados.';
  end if;
  if p_grupo is not null and not exists (select 1 from agendamento_grupos where id = p_grupo and agendamento_id = a.id) then
    raise exception 'Grupo não encontrado.';
  end if;
  if p_grupo is not null and exists (select 1 from agendamento_integrantes where agendamento_id = a.id and member_id = p_member and grupo_id = p_grupo) then
    return;
  end if;
  perform ag_tirar_do_grupo(a.id, p_member);
  if p_grupo is not null then
    if not exists (select 1 from agendamento_grupos where id = p_grupo) then
      raise exception 'Grupo não encontrado.';
    end if;
    insert into agendamento_integrantes (agendamento_id, member_id, grupo_id) values (a.id, p_member, p_grupo);
  end if;
end $$;

-- Define (ou tira, com nulo) o horário de um grupo.
create or replace function org_definir_horario(p_grupo uuid, p_horario uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a agendamentos; v_ag uuid;
begin
  select agendamento_id into v_ag from agendamento_grupos where id = p_grupo;
  if v_ag is null then raise exception 'Grupo não encontrado.'; end if;
  a := ag_travar(v_ag);
  perform ag_exigir_organizador(a);
  if p_horario is not null and not exists (select 1 from agendamento_horarios where id = p_horario and agendamento_id = a.id) then
    raise exception 'Horário inválido.';
  end if;
  begin
    update agendamento_grupos set horario_id = p_horario where id = p_grupo;
  exception when unique_violation then
    raise exception 'Esse horário já é de outro grupo.';
  end;
end $$;

create or replace function org_estender_prazo(p_ag uuid, p_prazo timestamptz) returns void
language plpgsql security definer set search_path = public as $$
declare a agendamentos;
begin
  a := ag_travar(p_ag);
  perform ag_exigir_organizador(a);
  if p_prazo <= now() then
    raise exception 'O prazo precisa ser no futuro.';
  end if;
  update agendamentos set prazo = p_prazo where id = a.id;
end $$;

-- Um evento (Reunião) por grupo com horário e gente; fica no nome de quem organizou.
create or replace function confirmar_agendamento(p_ag uuid) returns int
language plpgsql security definer set search_path = public as $$
declare a agendamentos; g record; v_evento uuid; v_total int := 0;
begin
  a := ag_travar(p_ag);
  perform ag_exigir_organizador(a);
  if not exists (select 1 from agendamento_grupos where agendamento_id = a.id and horario_id is not null) then
    raise exception 'Nenhum grupo tem horário ainda.';
  end if;
  if exists (
    select 1 from agendamento_grupos gr
    where gr.agendamento_id = a.id and gr.horario_id is null
      and exists (select 1 from agendamento_integrantes i where i.grupo_id = gr.id)
  ) then
    raise exception 'Há grupos com gente e sem horário. Defina um horário ou exclua o grupo.';
  end if;

  perform set_config('agenda.autor', coalesce(a.criado_por::text, ''), true);
  for g in
    select gr.id, gr.nome, h.inicio, h.fim,
           array(select i.member_id from agendamento_integrantes i where i.grupo_id = gr.id) as pessoas
    from agendamento_grupos gr join agendamento_horarios h on h.id = gr.horario_id
    where gr.agendamento_id = a.id
  loop
    if cardinality(g.pessoas) = 0 then
      continue;
    end if;
    insert into events (title, category, start_at, end_at, description, publico, convidados)
    values (
      left(a.titulo || ' · ' || g.nome, 200), 'reuniao', g.inicio, g.fim, a.descricao, '{}',
      array(select distinct x from unnest(g.pessoas || a.criado_por) x where x is not null)
    )
    returning id into v_evento;
    update agendamento_grupos set evento_id = v_evento where id = g.id;
    v_total := v_total + 1;
  end loop;
  perform set_config('agenda.autor', '', true);

  update agendamentos set confirmado_em = now() where id = a.id;
  return v_total;
end $$;

revoke execute on function
  criar_agendamento(text, text, timestamptz, nivel[], uuid[], uuid[], jsonb),
  criar_grupo(uuid, text), entrar_grupo(uuid), sair_grupo(uuid), reservar_horario(uuid, uuid),
  org_criar_grupo(uuid, text), org_renomear_grupo(uuid, text), org_excluir_grupo(uuid),
  org_mover_pessoa(uuid, uuid, uuid), org_definir_horario(uuid, uuid), org_estender_prazo(uuid, timestamptz),
  confirmar_agendamento(uuid)
from anon, public;
grant execute on function
  criar_agendamento(text, text, timestamptz, nivel[], uuid[], uuid[], jsonb),
  criar_grupo(uuid, text), entrar_grupo(uuid), sair_grupo(uuid), reservar_horario(uuid, uuid),
  org_criar_grupo(uuid, text), org_renomear_grupo(uuid, text), org_excluir_grupo(uuid),
  org_mover_pessoa(uuid, uuid, uuid), org_definir_horario(uuid, uuid), org_estender_prazo(uuid, timestamptz),
  confirmar_agendamento(uuid)
to authenticated;

-- ── Novatos do nível também entram nos agendamentos abertos (como a 0011) ──
create or replace function convidar_novo_do_nivel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.nivel is not distinct from old.nivel then
    return new;
  end if;
  insert into votacao_convidados (votacao_id, member_id)
  select v.id, new.id from votacoes v
  where v.confirmada_em is null and v.prazo > now() and new.nivel = any (v.niveis)
  on conflict do nothing;
  insert into agendamento_convidados (agendamento_id, member_id)
  select a.id, new.id from agendamentos a
  where a.confirmado_em is null and a.prazo > now() and new.nivel = any (a.niveis)
  on conflict do nothing;
  return new;
end $$;

-- ── Contador da aba: agendamentos em que ainda não estou em grupo ──────────
create or replace function pendencias_votacao() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'responder', (
      select count(*) from votacoes v
      join votacao_convidados c on c.votacao_id = v.id and c.member_id = current_member_id()
      where v.confirmada_em is null and v.prazo > now()
        and not exists (select 1 from votacao_respostas r where r.votacao_id = v.id and r.member_id = c.member_id)
    ) + (
      select count(*) from agendamentos a
      join agendamento_convidados c on c.agendamento_id = a.id and c.member_id = current_member_id()
      where a.confirmado_em is null and a.prazo > now() and a.criado_por is distinct from c.member_id
        and not exists (select 1 from agendamento_integrantes i where i.agendamento_id = a.id and i.member_id = c.member_id)
    ),
    'resultados', (
      select count(*) from votacoes v
      where v.criado_por = current_member_id() and v.confirmada_em is null
        and v.prazo > now() - interval '7 days'
        and (v.prazo <= now()
             or (select count(*) from votacao_respostas r where r.votacao_id = v.id)
              = (select count(*) from votacao_convidados c where c.votacao_id = v.id))
    ) + (
      select count(*) from agendamentos a
      where a.criado_por = current_member_id() and a.confirmado_em is null
        and a.prazo <= now() and a.prazo > now() - interval '7 days'
    )
  )
$$;
