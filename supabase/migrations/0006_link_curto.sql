-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — link curto e prévia pública dos pedidos de disponibilidade
-- Rode inteiro no SQL Editor do Supabase, depois da 0005. Pode ser rodada de
-- novo sem erro (útil se uma tentativa anterior parou no meio).
--
-- • votacoes.codigo: 7 caracteres (sem 0/o/1/l/i) para o link /d/<codigo>.
-- • resumo_votacao(codigo): o MÍNIMO para a prévia do WhatsApp, sem login —
--   título, prazo, duração, modo e se já foi confirmado. Nada de nomes ou
--   respostas; o resto continua protegido pela RLS.
-- • Correção: no Supabase o pgcrypto fica no schema `extensions`; funções com
--   search_path = public não acham gen_random_bytes. Vale também para
--   rotate_feed_token (0001), usada pelo "gerar novo link" em Assinar.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function gerar_codigo_votacao() returns text
language plpgsql volatile set search_path = public, extensions as $$
declare
  alfabeto constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  v text;
begin
  loop
    v := '';
    for i in 1..7 loop
      v := v || substr(alfabeto, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(alfabeto)), 1);
    end loop;
    exit when not exists (select 1 from votacoes where codigo = v);
  end loop;
  return v;
end $$;

alter table votacoes add column if not exists codigo text;
update votacoes set codigo = gerar_codigo_votacao() where codigo is null;
alter table votacoes alter column codigo set default gerar_codigo_votacao();
alter table votacoes alter column codigo set not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'votacoes_codigo_key') then
    alter table votacoes add constraint votacoes_codigo_key unique (codigo);
  end if;
end $$;

create or replace function resumo_votacao(p_codigo text) returns table (
  id uuid, titulo text, prazo timestamptz, duracao_min int, modo modo_votacao, confirmada boolean
)
language sql stable security definer set search_path = public as $$
  select v.id, v.titulo, v.prazo, v.duracao_min, v.modo, v.confirmada_em is not null
  from votacoes v
  where v.codigo = lower(p_codigo)
$$;

-- Mesmo problema na 0001: "gerar novo link" do feed .ics falhava.
create or replace function rotate_feed_token() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text;
begin
  update feed_tokens
     set token = encode(extensions.gen_random_bytes(24), 'hex'), created_at = now()
   where member_id = current_member_id()
   returning token into t;
  return t;
end $$;

revoke execute on function gerar_codigo_votacao() from anon, public;
grant execute on function resumo_votacao(text) to anon, authenticated;
