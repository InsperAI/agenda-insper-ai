-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — membros criam eventos (e só mexem nos próprios)
-- Rode inteiro no SQL Editor do Supabase, UMA vez, depois da 0006.
--
-- Diretoria: continua criando, editando e excluindo tudo.
-- Membro: cria eventos que ele mesmo vê ("membro" no publico; pode incluir
--   trainees), sem convidados individuais, e só edita/exclui os que criou.
--   Numa série dele, manda na série inteira — inclusive em ocorrências que a
--   diretoria tenha editado ou cancelado —, e só cria ocorrências em séries dele.
-- Trainee: continua só vendo. Ver continua como antes (events_read não muda),
--   então membro nunca vê evento "só diretoria".
-- created_by é preenchido pelo trigger events_audit (0001) e a RLS confere
-- a linha já com ele, então ninguém se passa por outro.
-- ═══════════════════════════════════════════════════════════════════════════

-- A série (mestre, e não uma ocorrência) foi criada por mim?
create or replace function serie_eh_minha(p_series_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from events
    where id = p_series_id and series_id is null and created_by = current_member_id()
  )
$$;

-- Linha que um membro pode ter: dele (ou ocorrência de uma série dele), visível
-- para membros, sem convidados avulsos e, se for ocorrência, de uma série dele.
create or replace function evento_de_membro_ok(p_created_by uuid, p_publico nivel[], p_convidados uuid[], p_series_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select current_nivel() = 'membro'
     and (p_created_by = current_member_id() or (p_series_id is not null and serie_eh_minha(p_series_id)))
     and 'membro' = any (p_publico)
     and cardinality(p_convidados) = 0
     and (p_series_id is null or serie_eh_minha(p_series_id))
$$;

revoke execute on function serie_eh_minha(uuid), evento_de_membro_ok(uuid, nivel[], uuid[], uuid) from anon, public;
grant execute on function serie_eh_minha(uuid), evento_de_membro_ok(uuid, nivel[], uuid[], uuid) to authenticated;

drop policy events_insert on events;
drop policy events_update on events;
drop policy events_delete on events;

create policy events_insert on events for insert to authenticated
  with check (pode_editar() or evento_de_membro_ok(created_by, publico, convidados, series_id));

create policy events_update on events for update to authenticated
  using (pode_editar() or (current_nivel() = 'membro' and (created_by = current_member_id() or (series_id is not null and serie_eh_minha(series_id)))))
  with check (pode_editar() or evento_de_membro_ok(created_by, publico, convidados, series_id));

create policy events_delete on events for delete to authenticated
  using (pode_editar() or (current_nivel() = 'membro' and (created_by = current_member_id() or (series_id is not null and serie_eh_minha(series_id)))));
