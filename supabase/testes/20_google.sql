\set ON_ERROR_STOP 1
\set QUIET 1
set client_min_messages = notice;
-- Roda depois de 10_cenario.sql (usa o schema `teste` e as pessoas de lá).

\echo '── 0014: Google Agenda na hora ──'

-- Inscrições: cada um só a sua.
select teste.como('gu@t'); set role authenticated;
insert into google_inscricoes (email) values ('gustavo@gmail.com');
select teste.ok((select member_id from google_inscricoes) = teste.v('gu'), 'membro ativa o Google com o próprio id (default current_member_id)');
select teste.erro(format($$insert into google_inscricoes (member_id, email) values (%L, 'x@gmail.com')$$, teste.v('alex')), 'row-level security', 'ninguém ativa em nome de outra pessoa');
select teste.erro($$insert into google_inscricoes (member_id, email) values (current_member_id(), 'sem-arroba')$$, 'check', 'e-mail inválido é recusado');
reset role;
select teste.como('t1@t'); set role authenticated;
select teste.ok((select count(*) from google_inscricoes) = 0, 'trainee não vê a inscrição dos outros');
select teste.erro('select * from google_conta', 'permission denied', 'ninguém logado lê a conta Google (refresh token)');
select teste.erro('select * from google_fila', 'permission denied', 'ninguém logado lê a fila');
select teste.erro('select * from google_espelho', 'permission denied', 'ninguém logado lê o espelho');
select teste.erro('select google_pegar_fila(10)', 'permission denied', 'ninguém logado mexe na fila');
select teste.erro('select google_enfileirar_tudo()', 'permission denied', 'ninguém logado enfileira tudo');
select teste.ok(google_status() = '{"conectada": false}'::jsonb, 'membro comum só sabe se está conectada');
reset role;
select teste.como('alex@t'); set role authenticated;
select teste.ok(google_status() ? 'pendentes' and google_status() ? 'inscritos', 'admin vê fila e inscritos');
reset role;
select teste.como('ninguem@t'); set role authenticated;
select teste.ok(google_status() is null, 'quem não é membro não vê nada');
reset role;

-- Fila: toda mudança em events enfileira a SÉRIE (o mestre).
delete from google_fila;
insert into events (title, category, start_at, end_at, freq, until)
values ('Reunião semanal', 'reuniao', now() + interval '1 day', now() + interval '1 day 1 hour', 'semanal', (now() + interval '60 days')::date)
returning teste.guarda('serie', id);
select teste.ok(exists (select 1 from google_fila where serie_id = teste.v('serie')), 'criar evento enfileira a série');
delete from google_fila;
insert into events (title, category, start_at, end_at, series_id, original_start, cancelled)
select title, category, start_at + interval '7 days', end_at + interval '7 days', id, start_at + interval '7 days', true from events where id = teste.v('serie')
returning teste.guarda('filha', id);
select teste.ok((select array_agg(serie_id) from google_fila) = array[teste.v('serie')], 'mexer numa ocorrência enfileira o mestre, não a filha');

-- Pegar, re-enfileirar no meio, concluir.
select teste.ok((select count(*) from google_pegar_fila(10)) = 1, 'o servidor pega o lote');
select teste.ok((select count(*) from google_pegar_fila(10)) = 0, 'o lote fica travado para outra invocação');
select set_config('t.pedido', (select pedido_em::text from google_fila where serie_id = teste.v('serie')), false);
update events set title = 'Reunião semanal (sala nova)' where id = teste.v('serie');
select google_concluir(teste.v('serie'), current_setting('t.pedido')::timestamptz);
select teste.ok(exists (select 1 from google_fila where serie_id = teste.v('serie') and travada_ate is null),
  'mudança durante o envio não se perde: a linha fica e destrava');
select teste.ok((select count(*) from google_pegar_fila(10)) = 1, 'e é pega de novo');
select google_concluir(teste.v('serie'), (select pedido_em from google_fila where serie_id = teste.v('serie')));
select teste.ok(not exists (select 1 from google_fila where serie_id = teste.v('serie')), 'concluir sem mudança no meio tira da fila');

-- Falha: espera antes de tentar de novo.
select google_enfileirar(teste.v('serie'));
select google_pegar_fila(10);
select google_falhou(teste.v('serie'), 'Google Agenda 500: erro');
select teste.ok((select tentativas = 1 and proxima_em > now() and erro like 'Google%' from google_fila where serie_id = teste.v('serie')), 'falha registra o erro e adia');
select teste.ok((select count(*) from google_pegar_fila(10)) = 0, 'série adiada não é pega antes da hora');

-- Apagar a série enfileira (para apagar no Google).
delete from google_fila;
delete from events where id = teste.v('serie');
select teste.ok(exists (select 1 from google_fila where serie_id = teste.v('serie')), 'apagar a série enfileira o id (o servidor apaga no Google)');

-- Mudanças em quem recebe re-enfileiram tudo.
insert into events (title, category, start_at, end_at) values ('Workshop', 'evento', now() + interval '3 days', now() + interval '3 days 2 hours')
returning teste.guarda('ws', id);
insert into events (title, category, start_at, end_at) values ('Antigo', 'evento', now() - interval '90 days', now() - interval '90 days' + interval '1 hour')
returning teste.guarda('antigo', id);
delete from google_fila;
update members set nivel = 'trainee' where email = 'gu@t';
select teste.ok(exists (select 1 from google_fila where serie_id = teste.v('ws')), 'quem recebe mudou de nível: re-enfileira o que vem pela frente');
select teste.ok(not exists (select 1 from google_fila where serie_id = teste.v('antigo')), 'evento de 3 meses atrás não volta para a fila');
delete from google_fila;
update members set nivel = 'trainee' where email = 'm2@t';
select teste.ok(not exists (select 1 from google_fila), 'quem não recebe no Google mudar de nível não mexe na fila');
update members set nivel = 'membro' where email = 'gu@t';
delete from google_fila;
select teste.como('gu@t'); set role authenticated;
update google_inscricoes set email = 'gustavo.novo@gmail.com';
reset role;
select teste.ok(exists (select 1 from google_fila where serie_id = teste.v('ws')), 'trocar o e-mail re-enfileira');

-- Aviso pelo pg_net (só quando há uma conta conectada).
do $$
begin
  if to_regproc('net.http_post') is null then
    raise notice 'ok  (sem pg_net neste banco: aviso imediato não testado; a fila acima cobre o cron)';
    return;
  end if;
  delete from net.chamadas;
  insert into events (title, category, start_at, end_at) values ('Sem conta', 'evento', now() + interval '1 day', now() + interval '1 day 1 hour');
  perform teste.ok(not exists (select 1 from net.chamadas), 'sem conta conectada, não chama ninguém');
  insert into google_conta (email, refresh_token, site_url) values ('agenda@insperai.com.br', 'r', 'https://agenda.exemplo');
  update events set title = 'Com conta' where title = 'Sem conta';
  perform teste.ok((select count(*) from net.chamadas) = 1, 'uma chamada por comando');
  perform teste.ok((select url = 'https://agenda.exemplo/api/google/sincronizar'
                     and headers ->> 'x-agenda-segredo' = (select segredo from google_conta)
                    from net.chamadas), 'chama /api/google/sincronizar com o segredo');
end $$;

\echo 'TUDO OK (0014)'
select teste.ok(true, 'TUDO OK (0014)');
