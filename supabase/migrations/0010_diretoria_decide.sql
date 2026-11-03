-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — a diretoria também decide os pedidos de disponibilidade
-- Rode inteiro no SQL Editor do Supabase, depois da 0009. Pode rodar de novo.
--
-- • Além de quem abriu, qualquer pessoa da diretoria confirma o horário ou
--   reabre/estende o prazo de qualquer pedido (inclusive os abertos por
--   membros). Excluir continua só com quem abriu.
-- • O evento criado na confirmação fica no nome de quem FEZ o pedido, não de
--   quem confirmou: assim um membro continua podendo editar a reunião dele.
--   Para isso, set_audit aceita um autor indicado pela própria transação
--   (variável local `agenda.autor`, que só confirmar_votacao define — o
--   cliente não tem como mexer em variáveis de sessão pela API). NUNCA crie
--   uma função pública que chame set_config('agenda.*') — isso abriria a porta.
-- • Funções recriadas com a mesma assinatura: as permissões (grant) continuam.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function set_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(nullif(current_setting('agenda.autor', true), '')::uuid, current_member_id());
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_by := current_member_id();
  new.updated_at := now();
  return new;
end $$;

-- Quem decide um pedido: quem abriu (se ainda cria eventos) ou a diretoria.
-- Uso interno de confirmar/reabrir (rodam como dono); o cliente não chama.
create or replace function pode_decidir_votacao(v votacoes) returns boolean
language sql stable security definer set search_path = public as $$
  select pode_editar() or (v.criado_por = current_member_id() and pode_criar_evento())
$$;
revoke execute on function pode_decidir_votacao(votacoes) from anon, authenticated, public;

create or replace function confirmar_votacao(p_id uuid, p_inicio timestamptz, p_freq frequencia, p_until date)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v votacoes;
  v_local timestamp := p_inicio at time zone 'America/Sao_Paulo';
  v_minutos int := extract(hour from v_local) * 60 + extract(minute from v_local);
  v_evento uuid;
  v_publico nivel[];
  v_nivel_autor nivel;
begin
  select * into v from votacoes where id = p_id for update;
  if v.id is null or not pode_decidir_votacao(v) then
    raise exception 'Só quem abriu o pedido ou a diretoria pode confirmar.';
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
  -- Evento de membro é sempre visível para membros (regra da 0007) — vale o
  -- nível de quem pediu, já que o evento fica no nome dele.
  select nivel into v_nivel_autor from members where id = v.criado_por;
  if v_nivel_autor = 'membro' and not ('membro' = any (v_publico)) then
    v_publico := v_publico || 'membro'::nivel;
  end if;

  -- Autor do evento = quem pediu (se ainda existe); senão, quem confirmou.
  perform set_config('agenda.autor', coalesce(v.criado_por::text, ''), true);
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
  perform set_config('agenda.autor', '', true);

  update votacoes set evento_id = v_evento, confirmada_em = now() where id = v.id;
  return v_evento;
end $$;

create or replace function reabrir_votacao(p_id uuid, p_prazo timestamptz, p_dias text[]) returns void
language plpgsql security definer set search_path = public as $$
declare v votacoes;
begin
  select * into v from votacoes where id = p_id for update;
  if v.id is null or not pode_decidir_votacao(v) then
    raise exception 'Só quem abriu o pedido ou a diretoria pode reabrir.';
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
