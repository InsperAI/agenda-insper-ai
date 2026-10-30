-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — pedido vencido e esquecido para de cobrar
-- Rode inteiro no SQL Editor do Supabase, depois da 0008. Pode rodar de novo.
--
-- • O contador da aba Disponibilidade soma "resultados prontos" dos pedidos
--   que eu abri e ainda não confirmei. Um pedido abandonado (ex.: um teste)
--   ficava cobrando para sempre. Agora, 7 dias depois do prazo, ele sai do
--   contador — continua na lista, e quem abriu ainda pode confirmar ou excluir.
-- • "responder" não muda: já só contava pedidos dentro do prazo.
-- ═══════════════════════════════════════════════════════════════════════════

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
        and v.prazo > now() - interval '7 days'
        and (v.prazo <= now()
             or (select count(*) from votacao_respostas r where r.votacao_id = v.id)
              = (select count(*) from votacao_convidados c where c.votacao_id = v.id))
    )
  )
$$;

revoke execute on function pendencias_votacao() from anon, public;
grant execute on function pendencias_votacao() to authenticated;
