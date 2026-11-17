-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda · Insper AI — "Reenviar convites" (Conectar → Google Agenda · na hora)
-- Rode inteiro no SQL Editor do Supabase, depois da 0014. Pode rodar de novo.
--
-- • O Google só olha "Adicionar convites à minha agenda" quando a pessoa ENTRA
--   como convidada. Quem muda a configuração depois toca em "Reenviar convites":
--   o app a tira e põe de volta em cada evento (lib/google/reenviar.ts).
-- • reenviado_em: trava de 2 min entre reenvios. Só o servidor escreve nela.
-- • Logado agora só escreve member_id e email na própria inscrição (a RLS da
--   0014 continua prendendo member_id a quem está logado). Antes dava para mexer
--   em criada_em e, com isso, em qualquer trava baseada nela.
-- • Só entrar, sair ou trocar e-mail re-enfileira tudo; gravar a trava não.
-- • O aviso de "destructive operations" vem dos `drop trigger if exists`. É esperado.
-- ═══════════════════════════════════════════════════════════════════════════

alter table google_inscricoes add column if not exists reenviado_em timestamptz;

revoke insert, update on google_inscricoes from authenticated;
grant insert (member_id, email), update (member_id, email) on google_inscricoes to authenticated;

drop trigger if exists google_inscricoes_fila on google_inscricoes;
create trigger google_inscricoes_fila after insert or delete or update of member_id, email on google_inscricoes
  for each row execute function google_publico_mudou();
drop trigger if exists google_inscricoes_avisar on google_inscricoes;
create trigger google_inscricoes_avisar after insert or delete or update of member_id, email on google_inscricoes
  for each statement execute function google_avisar();
