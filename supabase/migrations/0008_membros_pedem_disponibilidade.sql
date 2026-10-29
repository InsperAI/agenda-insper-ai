-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — membros também pedem disponibilidade
-- Rode inteiro no SQL Editor do Supabase, UMA vez, depois da 0007.
--
-- • Membros (além da diretoria) abrem pedidos de disponibilidade e podem
--   convidar qualquer pessoa, inclusive a diretoria. Trainees continuam só
--   respondendo. A diretoria segue acompanhando todos (0005); só quem abriu
--   confirma, reabre ou exclui.
-- • O evento confirmado por um membro é dele e sempre visível para membros.
-- • 0007 proibia convidados individuais em eventos de membro; um pedido de
--   membro pode gerar convidados (ex.: um trainee específico), então isso sai —
--   sem risco novo, já que o membro pode liberar o evento para todos os trainees.
-- Funções recriadas com a mesma assinatura: as permissões (grant) continuam.
-- ═══════════════════════════════════════════════════════════════════════════

-- Diretoria ou membro (quem cria eventos e pedidos).
create or replace function pode_criar_evento() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_nivel() in ('diretoria', 'membro'), false)
$$;
revoke execute on function pode_criar_evento() from anon, public;
grant execute on function pode_criar_evento() to authenticated;

create or replace function evento_de_membro_ok(p_created_by uuid, p_publico nivel[], p_convidados uuid[], p_series_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select current_nivel() = 'membro'
     and (p_created_by = current_member_id() or (p_series_id is not null and serie_eh_minha(p_series_id)))
     and 'membro' = any (p_publico)
     and (p_series_id is null or serie_eh_minha(p_series_id))
$$;

create or replace function criar_votacao(
  p_titulo text, p_descricao text, p_modo modo_votacao, p_dias text[], p_duracao_min int,
  p_prazo timestamptz, p_niveis nivel[], p_incluir uuid[], p_excluir uuid[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_eu uuid := current_member_id();
begin
  if not pode_criar_evento() then
    raise exception 'Trainees não abrem pedidos de disponibilidade.';
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
  if v.id is null or v.criado_por is distinct from current_member_id() or not pode_criar_evento() then
    raise exception 'Só quem abriu a votação (e ainda pode criar eventos) pode confirmar.';
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
  -- Evento de membro é sempre visível para membros (mesma regra da 0007).
  if current_nivel() = 'membro' and not ('membro' = any (v_publico)) then
    v_publico := v_publico || 'membro'::nivel;
  end if;

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

create or replace function reabrir_votacao(p_id uuid, p_prazo timestamptz, p_dias text[]) returns void
language plpgsql security definer set search_path = public as $$
declare v votacoes;
begin
  select * into v from votacoes where id = p_id for update;
  if v.id is null or v.criado_por is distinct from current_member_id() or not pode_criar_evento() then
    raise exception 'Só quem abriu a votação (e ainda pode criar eventos) pode reabrir.';
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
