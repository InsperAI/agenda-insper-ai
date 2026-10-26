-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — a diretoria acompanha todos os pedidos de disponibilidade
-- Rode inteiro no SQL Editor do Supabase, UMA vez, depois da 0004.
--
-- Antes: um pedido (tabela votacoes) só aparecia para quem criou e para os
-- convidados. Agora toda a diretoria vê todos: o pedido, quem foi convidado,
-- as respostas (com nomes) e o mapa. Confirmar, reabrir e excluir continuam só
-- com quem criou (confirmar_votacao, reabrir_votacao e votacoes_delete não mudam).
-- Responder continua só para convidados (respostas_insert/update não mudam).
-- ═══════════════════════════════════════════════════════════════════════════

-- Quem criou ou qualquer pessoa da diretoria.
create or replace function acompanha_votacao(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_criador_votacao(p_id) or pode_editar()
$$;
revoke execute on function acompanha_votacao(uuid) from anon, public;
grant execute on function acompanha_votacao(uuid) to authenticated;

drop policy votacoes_read on votacoes;
create policy votacoes_read on votacoes for select to authenticated
  using (acompanha_votacao(id) or eh_convidado_votacao(id));

drop policy convidados_read on votacao_convidados;
create policy convidados_read on votacao_convidados for select to authenticated
  using (member_id = current_member_id() or acompanha_votacao(votacao_id));

drop policy respostas_read on votacao_respostas;
create policy respostas_read on votacao_respostas for select to authenticated
  using (member_id = current_member_id() or acompanha_votacao(votacao_id));

-- O mapa (contagem por bloco) também abre para a diretoria.
create or replace function mapa_votacao(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (eh_convidado_votacao(p_id) or acompanha_votacao(p_id)) then
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
