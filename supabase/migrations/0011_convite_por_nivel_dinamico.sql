-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — quem entra num nível depois também é convidado
-- Rode inteiro no SQL Editor do Supabase, depois da 0010. Pode rodar de novo.
--
-- • Um pedido aberto para um nível (ex.: Trainees) guardava os convidados de
--   quando foi criado: quem foi cadastrado depois não via o pedido. Agora,
--   quem é cadastrado num nível — ou muda para ele — entra como convidado nos
--   pedidos ainda abertos para esse nível.
-- • Quem foi tirado da lista na criação continua fora — a não ser que mude de
--   nível e volte (as exclusões não ficam guardadas). Mudar de nível não tira
--   convites antigos.
-- • Conserta os pedidos abertos de agora (ex.: o do Gustavo) de uma vez.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function convidar_novo_do_nivel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.nivel is not distinct from old.nivel then
    return new;
  end if;
  insert into votacao_convidados (votacao_id, member_id)
  select v.id, new.id from votacoes v
  where v.confirmada_em is null and v.prazo > now()
    and new.nivel = any (v.niveis)
  on conflict do nothing;
  return new;
end $$;
revoke execute on function convidar_novo_do_nivel() from anon, authenticated, public;

drop trigger if exists members_convidar_novo on members;
create trigger members_convidar_novo after insert or update of nivel on members
  for each row execute function convidar_novo_do_nivel();

-- Conserto dos pedidos abertos: entra quem é do nível e foi cadastrado depois do pedido.
insert into votacao_convidados (votacao_id, member_id)
select v.id, m.id
from votacoes v
join members m on m.nivel = any (v.niveis) and m.created_at > v.created_at
where v.confirmada_em is null and v.prazo > now()
on conflict do nothing;
