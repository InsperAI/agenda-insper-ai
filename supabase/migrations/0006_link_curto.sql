-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — link curto e prévia pública dos pedidos de disponibilidade
-- Rode inteiro no SQL Editor do Supabase, UMA vez, depois da 0005.
--
-- • votacoes.codigo: 7 caracteres (sem 0/o/1/l/i) para o link /d/<codigo>.
-- • resumo_votacao(codigo): o MÍNIMO para a prévia do WhatsApp, sem login —
--   título, prazo, duração, modo e se já foi confirmado. Nada de nomes ou
--   respostas; o resto continua protegido pela RLS.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function gerar_codigo_votacao() returns text
language plpgsql volatile set search_path = public as $$
declare
  alfabeto constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  v text;
begin
  loop
    v := '';
    for i in 1..7 loop
      v := v || substr(alfabeto, 1 + (get_byte(gen_random_bytes(1), 0) % length(alfabeto)), 1);
    end loop;
    exit when not exists (select 1 from votacoes where codigo = v);
  end loop;
  return v;
end $$;

alter table votacoes add column codigo text;
update votacoes set codigo = gerar_codigo_votacao() where codigo is null;
alter table votacoes alter column codigo set default gerar_codigo_votacao();
alter table votacoes alter column codigo set not null;
alter table votacoes add constraint votacoes_codigo_key unique (codigo);

create or replace function resumo_votacao(p_codigo text) returns table (
  id uuid, titulo text, prazo timestamptz, duracao_min int, modo modo_votacao, confirmada boolean
)
language sql stable security definer set search_path = public as $$
  select v.id, v.titulo, v.prazo, v.duracao_min, v.modo, v.confirmada_em is not null
  from votacoes v
  where v.codigo = lower(p_codigo)
$$;

revoke execute on function gerar_codigo_votacao() from anon, public;
grant execute on function resumo_votacao(text) to anon, authenticated;
