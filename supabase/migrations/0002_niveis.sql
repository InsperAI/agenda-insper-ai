-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — níveis de acesso (diretoria / membro / trainee)
-- Rode inteiro no SQL Editor do Supabase, UMA vez, depois da 0001.
--
-- • members.nivel: quem é a pessoa. Só a diretoria cria/edita eventos.
-- • events.visibilidade: nível MÍNIMO para ver o evento.
-- A ordem do enum importa: trainee < membro < diretoria (permite `<=`).
-- ═══════════════════════════════════════════════════════════════════════════

create type nivel as enum ('trainee', 'membro', 'diretoria');

-- Quem já está cadastrado hoje é da diretoria; novos cadastros nascem "membro".
alter table members add column nivel nivel not null default 'diretoria';
alter table members alter column nivel set default 'membro';
alter table members add constraint admin_e_diretoria check (not is_admin or nivel = 'diretoria');

-- Eventos existentes continuam visíveis só para a diretoria.
alter table events add column visibilidade nivel not null default 'diretoria';

-- ── Funções auxiliares (mesmo padrão de is_member/is_admin) ────────────────
create or replace function current_nivel() returns nivel
language sql stable security definer set search_path = public as $$
  select nivel from members where id = current_member_id()
$$;

create or replace function pode_editar() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_nivel() = 'diretoria', false)
$$;

-- ── Filhas de uma série sempre com a visibilidade do mestre ────────────────
-- No banco (e não no cliente) para ser atômico: uma filha cancelada que ficasse
-- invisível faria a ocorrência "voltar" para quem não a vê.
create or replace function herdar_visibilidade() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.series_id is not null then
    select visibilidade into new.visibilidade from events where id = new.series_id;
  end if;
  return new;
end $$;
create trigger events_herdar_visibilidade before insert or update of visibilidade, series_id on events
  for each row execute function herdar_visibilidade();

create or replace function propagar_visibilidade() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.series_id is null and new.visibilidade is distinct from old.visibilidade then
    update events set visibilidade = new.visibilidade where series_id = new.id;
  end if;
  return new;
end $$;
create trigger events_propagar_visibilidade after update of visibilidade on events
  for each row execute function propagar_visibilidade();

-- ── RLS de eventos: ver depende do nível; escrever só a diretoria ──────────
drop policy events_read   on events;
drop policy events_insert on events;
drop policy events_update on events;
drop policy events_delete on events;

create policy events_read   on events for select to authenticated using (is_member() and visibilidade <= current_nivel());
create policy events_insert on events for insert to authenticated with check (pode_editar());
create policy events_update on events for update to authenticated using (pode_editar()) with check (pode_editar());
create policy events_delete on events for delete to authenticated using (pode_editar());
