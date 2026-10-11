-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — público por evento e pedidos de acesso
-- Rode inteiro no SQL Editor do Supabase, UMA vez, depois da 0002.
--
-- 1. `events.visibilidade` (escada: nível mínimo) vira `events.publico`
--    (conjunto): a diretoria sempre vê; o evento marca se membros e/ou
--    trainees também veem. Permite "só trainees" e "só membros".
-- 2. `access_requests`: quem entrou com o Google e não está em `members`
--    pede acesso; um admin aprova (vira membro) ou recusa.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Público por evento ──────────────────────────────────────────────────
alter table events add column publico nivel[] not null default '{}';
alter table events add constraint publico_sem_diretoria check (not ('diretoria' = any (publico)));

-- Mantém quem via antes: "membro" → membros; "trainee" (todos) → membros + trainees.
-- Sem o trigger de auditoria, para não marcar todo evento como "editado agora".
alter table events disable trigger events_audit;
update events set publico = case visibilidade
  when 'membro'  then '{membro}'::nivel[]
  when 'trainee' then '{membro,trainee}'::nivel[]
  else '{}'::nivel[]
end;
alter table events enable trigger events_audit;

-- O que dependia da coluna antiga sai antes dela.
drop trigger events_herdar_visibilidade on events;
drop trigger events_propagar_visibilidade on events;
drop policy events_read on events;
alter table events drop column visibilidade;

create or replace function pode_ver(p_publico nivel[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_nivel() = 'diretoria' or current_nivel() = any (p_publico), false)
$$;

create policy events_read on events for select to authenticated using (is_member() and pode_ver(publico));

-- Filhas de uma série sempre com o público do mestre (atômico, no banco).
create or replace function herdar_visibilidade() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.series_id is not null then
    select publico into new.publico from events where id = new.series_id;
  end if;
  return new;
end $$;
create trigger events_herdar_publico before insert or update of publico, series_id on events
  for each row execute function herdar_visibilidade();

create or replace function propagar_visibilidade() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.series_id is null and new.publico is distinct from old.publico then
    update events set publico = new.publico where series_id = new.id;
  end if;
  return new;
end $$;
create trigger events_propagar_publico after update of publico on events
  for each row execute function propagar_visibilidade();

-- ── 2. Pedidos de acesso ───────────────────────────────────────────────────
-- O e-mail vem do login do Google (JWT), nunca do formulário: ninguém pede em nome de outro.
create table access_requests (
  id         uuid primary key default gen_random_uuid(),
  email      citext not null unique default lower(auth.jwt() ->> 'email'),
  name       text not null check (length(trim(name)) between 1 and 120),
  cargo      text not null default '' check (length(cargo) <= 120),
  -- Pedir só membro ou trainee; diretoria é promoção feita por um admin.
  nivel      nivel not null default 'membro' check (nivel <> 'diretoria'),
  created_at timestamptz not null default now()
);
alter table access_requests enable row level security;

create or replace function email_logado() returns citext
language sql stable as $$
  select (auth.jwt() ->> 'email')::citext
$$;

-- Teto de pedidos abertos: qualquer conta Google consegue pedir, então limita o spam.
create or replace function pedidos_abertos() returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from access_requests
$$;

-- Quem pede: só para o próprio e-mail, só se ainda não for membro e com a fila abaixo do teto.
-- Pode cancelar o próprio.
create policy pedidos_insert on access_requests for insert to authenticated
  with check (email = email_logado() and not is_member() and pedidos_abertos() < 100);
create policy pedidos_read on access_requests for select to authenticated
  using (is_admin() or email = email_logado());
create policy pedidos_delete on access_requests for delete to authenticated
  using (is_admin() or email = email_logado());

-- Aprovar = criar o membro e apagar o pedido, numa transação.
create or replace function aprovar_pedido(p_id uuid, p_nivel nivel) returns members
language plpgsql security definer set search_path = public as $$
declare
  r access_requests;
  m members;
begin
  if not is_admin() then
    raise exception 'Só admins aprovam pedidos.';
  end if;
  delete from access_requests where id = p_id returning * into r;
  if r.id is null then
    raise exception 'Pedido não encontrado (talvez já tenha sido aprovado).';
  end if;
  if exists (select 1 from members where email = r.email) then
    raise exception 'Essa pessoa já é membro. Recuse o pedido e, se preciso, mude o nível dela na lista.';
  end if;
  insert into members (email, name, cargo, nivel)
  values (r.email, r.name, r.cargo, p_nivel)
  returning * into m;
  return m;
end $$;

-- Cadastrar alguém à mão também resolve um pedido pendente dessa pessoa.
create or replace function limpar_pedido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from access_requests where email = new.email;
  return new;
end $$;
create trigger members_limpa_pedido after insert on members
  for each row execute function limpar_pedido();

grant execute on function aprovar_pedido(uuid, nivel) to authenticated;
revoke execute on function aprovar_pedido(uuid, nivel) from anon, public;
