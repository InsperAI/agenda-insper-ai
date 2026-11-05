\set ON_ERROR_STOP 1
\set QUIET 1
set client_min_messages = notice;

-- ── Ferramentas de teste ────────────────────────────────────────────────────
create schema teste;
grant usage on schema teste to authenticated;
create function teste.como(p_email text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('email', p_email)::text, false)
$$;
create function teste.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FALHA: %', msg; end if;
  raise notice 'ok  %', msg;
end $$;
-- Roda um SQL como o papel atual e exige um erro contendo `trecho`.
create function teste.erro(sql text, trecho text, msg text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    if position(trecho in sqlerrm) = 0 then raise exception 'FALHA: % (erro inesperado: %)', msg, sqlerrm; end if;
    raise notice 'ok  % → "%"', msg, sqlerrm;
    return;
  end;
  raise exception 'FALHA: % (esperava erro "%", passou)', msg, trecho;
end $$;
create function teste.v(nome text) returns uuid language sql as $$ select current_setting('t.' || nome)::uuid $$;
create function teste.guarda(nome text, valor uuid) returns uuid language sql as $$ select set_config('t.' || nome, valor::text, false)::uuid $$;
grant execute on all functions in schema teste to authenticated;

-- ── Pessoas ─────────────────────────────────────────────────────────────────
insert into members (email, name, nivel, is_admin) values
  ('alex@t', 'Alex', 'diretoria', true),
  ('gu@t', 'Gustavo', 'membro', false),
  ('m2@t', 'Membro Fora', 'membro', false),
  ('t1@t', 'Trainee 1', 'trainee', false),
  ('t2@t', 'Trainee 2', 'trainee', false),
  ('t3@t', 'Trainee 3', 'trainee', false);
select teste.guarda(split_part(email, '@', 1), id) from members;

\echo '── 0011: quem chega depois no nível é convidado ──'
select teste.como('gu@t'); set role authenticated;
select teste.guarda('vot', criar_votacao('Pedido do Gustavo', '', 'unica', array[to_char(now() + interval '10 days', 'YYYY-MM-DD')], 60, now() + interval '5 days', array['trainee']::nivel[], '{}', '{}'));
reset role;
insert into members (email, name, nivel) values ('t4@t', 'Trainee Novo', 'trainee');
select teste.guarda('t4', id) from members where email = 't4@t';
select teste.ok(exists (select 1 from votacao_convidados where votacao_id = teste.v('vot') and member_id = teste.v('t4')), 'trainee cadastrado depois vira convidado do pedido aberto');
update members set nivel = 'trainee' where email = 'm2@t';
select teste.ok(exists (select 1 from votacao_convidados where votacao_id = teste.v('vot') and member_id = teste.v('m2')), 'membro promovido/rebaixado para trainee vira convidado');
delete from votacao_convidados where votacao_id = teste.v('vot') and member_id = teste.v('m2');
update members set nivel = 'membro' where email = 'm2@t';
select teste.como('t4@t'); set role authenticated;
select teste.ok((select count(*) from votacoes where id = teste.v('vot')) = 1, 'o trainee novo VÊ o pedido (RLS)');
reset role;

\echo '── Criar horários por grupo ──'
select teste.como('gu@t'); set role authenticated;
select teste.guarda('ag', criar_agendamento('Apresentação intermediária', 'Sala 405', now() + interval '2 days', array['trainee']::nivel[], '{}', '{}',
  jsonb_build_array(
    jsonb_build_object('inicio', now() + interval '7 days', 'fim', now() + interval '7 days 20 minutes'),
    jsonb_build_object('inicio', now() + interval '7 days 25 minutes', 'fim', now() + interval '7 days 45 minutes'),
    jsonb_build_object('inicio', now() + interval '7 days 50 minutes', 'fim', now() + interval '7 days 70 minutes'),
    jsonb_build_object('inicio', now() + interval '8 days', 'fim', now() + interval '8 days 20 minutes'))));
select teste.erro($$select criar_agendamento('x', '', now() + interval '1 day', '{}', '{}', '{}', jsonb_build_array(
  jsonb_build_object('inicio', now() + interval '3 days', 'fim', now() + interval '3 days 30 minutes'),
  jsonb_build_object('inicio', now() + interval '3 days 10 minutes', 'fim', now() + interval '3 days 40 minutes')))$$, 'sobrepostos', 'recusa horários sobrepostos');
select teste.erro($$select criar_agendamento('x', '', now() + interval '1 day', '{}', '{}', '{}', jsonb_build_array(
  jsonb_build_object('inicio', now() + interval '3 days', 'fim', now() + interval '3 days 30 minutes'),
  jsonb_build_object('inicio', now() + interval '3 days', 'fim', now() + interval '3 days 30 minutes')))$$, 'repetidos', 'recusa horários repetidos');
select teste.erro($$select criar_agendamento('x', '', now() + interval '1 day', '{}', '{}', '{}', jsonb_build_array(
  jsonb_build_object('inicio', now() - interval '1 day', 'fim', now() - interval '23 hours')))$$, 'futuro', 'recusa horário no passado');
reset role;
select teste.guarda('h' || n, id) from (select id, row_number() over (order by inicio) n from agendamento_horarios where agendamento_id = teste.v('ag')) x;
select teste.ok((select count(*) from agendamento_convidados where agendamento_id = teste.v('ag')) = 5, 'convidados = 4 trainees + quem organizou');
select teste.como('t1@t'); set role authenticated;
select teste.erro($$select criar_agendamento('x', '', now() + interval '1 day', '{}', '{}', '{}', '[]')$$, 'Trainees não criam', 'trainee não cria agendamento');
reset role;

\echo '── Quem vê ──'
select teste.como('m2@t'); set role authenticated;
select teste.ok((select count(*) from agendamentos where id = teste.v('ag')) = 0, 'membro NÃO convidado não vê');
select teste.ok((select count(*) from agendamento_horarios where agendamento_id = teste.v('ag')) = 0, '…nem os horários');
reset role;
select teste.como('alex@t'); set role authenticated;
select teste.ok((select count(*) from agendamentos where id = teste.v('ag')) = 1, 'diretoria vê mesmo sem convite');
reset role;
select teste.como('t1@t'); set role authenticated;
select teste.ok((select count(*) from agendamento_horarios where agendamento_id = teste.v('ag')) = 4, 'trainee convidado vê os 4 horários');

\echo '── Grupos (estilo Classroom) ──'
select teste.guarda('g1', criar_grupo(teste.v('ag'), 'Alfa'));
reset role; select teste.como('t2@t'); set role authenticated;
select entrar_grupo(teste.v('g1'));
reset role; select teste.como('t3@t'); set role authenticated;
select teste.erro(format('select criar_grupo(%L, %L)', teste.v('ag'), ' alfa '), 'Já existe', 'nome de grupo repetido (sem diferenciar maiúscula/espaço)');
select teste.guarda('g2', criar_grupo(teste.v('ag'), 'Beta'));
reset role; select teste.como('m2@t'); set role authenticated;
select teste.erro(format('select entrar_grupo(%L)', teste.v('g1')), 'convidados', 'não convidado não entra em grupo');
reset role;
select teste.ok((select count(*) from agendamento_integrantes where grupo_id = teste.v('g1')) = 2, 'Alfa tem 2 pessoas');

\echo '── Reservas sem sobreposição ──'
select teste.como('t1@t'); set role authenticated;
select reservar_horario(teste.v('ag'), teste.v('h1'));
reset role; select teste.como('t3@t'); set role authenticated;
select teste.erro(format('select reservar_horario(%L, %L)', teste.v('ag'), teste.v('h1')), 'Outro grupo', 'dois grupos não pegam o mesmo horário');
select reservar_horario(teste.v('ag'), teste.v('h2'));
select reservar_horario(teste.v('ag'), teste.v('h3'));
reset role;
select teste.ok((select horario_id from agendamento_grupos where id = teste.v('g2')) = teste.v('h3'), 'trocar de horário: Beta foi de h2 para h3');
select teste.ok(not exists (select 1 from agendamento_grupos where horario_id = teste.v('h2')), '…e h2 ficou livre');
select teste.como('t4@t'); set role authenticated;
select teste.erro(format('select reservar_horario(%L, %L)', teste.v('ag'), teste.v('h4')), 'Entre num grupo', 'sem grupo não reserva');
reset role;

\echo '── Não dá para burlar pelas tabelas ──'
select teste.como('t1@t'); set role authenticated;
update agendamento_grupos set horario_id = teste.v('h4') where id = teste.v('g1');
select teste.erro(format('insert into agendamento_integrantes values (%L, %L, %L)', teste.v('ag'), teste.v('t4'), teste.v('g1')), 'row-level security', 'INSERT direto em grupo é barrado pela RLS');
reset role;
select teste.ok((select horario_id from agendamento_grupos where id = teste.v('g1')) = teste.v('h1'), 'UPDATE direto não muda nada (sem política de escrita)');
select teste.ok(not exists (select 1 from agendamento_integrantes where member_id = teste.v('t4')), 'INSERT direto não põe ninguém em grupo');

\echo '── Horário de outro agendamento ──'
select teste.como('alex@t'); set role authenticated;
select teste.guarda('ag2', criar_agendamento('Outro', '', now() + interval '1 day', '{}', '{}', '{}', jsonb_build_array(jsonb_build_object('inicio', now() + interval '5 days', 'fim', now() + interval '5 days 1 hour'))));
reset role;
select teste.guarda('hx', id) from agendamento_horarios where agendamento_id = teste.v('ag2');
select teste.como('t1@t'); set role authenticated;
select teste.erro(format('select reservar_horario(%L, %L)', teste.v('ag'), teste.v('hx')), 'Horário inválido', 'não reserva horário de OUTRO agendamento');
reset role;
select teste.erro(format('update agendamento_grupos set horario_id = %L where id = %L', teste.v('hx'), teste.v('g1')), 'Horário inválido', 'nem o dono do banco liga grupo a horário de outro agendamento (trigger)');

\echo '── Sair do grupo ──'
select teste.como('t2@t'); set role authenticated; select sair_grupo(teste.v('ag')); reset role;
select teste.ok(exists (select 1 from agendamento_grupos where id = teste.v('g1')), 'Alfa continua (ainda tem o Trainee 1)');
select teste.como('t1@t'); set role authenticated; select sair_grupo(teste.v('ag')); reset role;
select teste.ok(not exists (select 1 from agendamento_grupos where id = teste.v('g1')), 'último a sair: grupo some');
select teste.ok(not exists (select 1 from agendamento_grupos where horario_id = teste.v('h1')), '…e o horário h1 fica livre');
select teste.como('t1@t'); set role authenticated;
select teste.guarda('g1', criar_grupo(teste.v('ag'), 'Alfa'));
reset role; select teste.como('t2@t'); set role authenticated; select entrar_grupo(teste.v('g1')); reset role;
select teste.como('t2@t'); set role authenticated;
select teste.guarda('g9', criar_grupo(teste.v('ag'), 'Gama'));
reset role;
select teste.ok((select grupo_id from agendamento_integrantes where agendamento_id = teste.v('ag') and member_id = teste.v('t2')) = teste.v('g9'), 'criar outro grupo tira a pessoa do anterior (um grupo por pessoa)');
select teste.como('t2@t'); set role authenticated; select entrar_grupo(teste.v('g1')); reset role;
select teste.ok(not exists (select 1 from agendamento_grupos where id = teste.v('g9')), 'grupo Gama vazio sumiu quando ela voltou para Alfa');

\echo '── Quem organiza ──'
select teste.como('t1@t'); set role authenticated;
select teste.erro(format('select org_mover_pessoa(%L, %L, %L)', teste.v('ag'), teste.v('t4'), teste.v('g2')), 'Só quem organizou', 'trainee não move ninguém');
reset role; select teste.como('m2@t'); set role authenticated;
select teste.erro(format('select org_renomear_grupo(%L, %L)', teste.v('g2'), 'Hack'), 'Só quem organizou', 'membro que não organizou não mexe');
reset role; select teste.como('gu@t'); set role authenticated;
select org_mover_pessoa(teste.v('ag'), teste.v('t4'), teste.v('g2'));
select teste.erro(format('select org_definir_horario(%L, %L)', teste.v('g1'), teste.v('h3')), 'outro grupo', 'organizador também não sobrepõe');
select org_definir_horario(teste.v('g1'), teste.v('h1'));
reset role; select teste.como('alex@t'); set role authenticated;
select org_renomear_grupo(teste.v('g2'), 'Beta 2');
reset role;
select teste.ok((select nome from agendamento_grupos where id = teste.v('g2')) = 'Beta 2', 'diretoria (sem ter criado) renomeia');
select teste.ok((select grupo_id from agendamento_integrantes where member_id = teste.v('t4') and agendamento_id = teste.v('ag')) = teste.v('g2'), 'organizador moveu o Trainee Novo para Beta');

\echo '── Contador da aba ──'
insert into members (email, name, nivel) values ('t5@t', 'Trainee 5', 'trainee');
select teste.guarda('t5', id) from members where email = 't5@t';
select teste.como('t5@t'); set role authenticated;
select teste.ok((pendencias_votacao() ->> 'responder')::int = 2, 'trainee recém-chegado tem 2 pendências (pedido + agendamento)');
reset role; select teste.como('t1@t'); set role authenticated;
select teste.ok((pendencias_votacao() ->> 'responder')::int = 1, 'quem já tem grupo só tem o pedido pendente');
reset role;

\echo '── Confirmar ──'
select teste.como('gu@t'); set role authenticated;
select org_mover_pessoa(teste.v('ag'), teste.v('t5'), null);
select teste.guarda('gv', org_criar_grupo(teste.v('ag'), 'Delta'));
select org_mover_pessoa(teste.v('ag'), teste.v('t5'), teste.v('gv'));
select teste.erro(format('select confirmar_agendamento(%L)', teste.v('ag')), 'sem horário', 'não confirma com grupo com gente e sem horário');
select org_mover_pessoa(teste.v('ag'), teste.v('t5'), null);
select teste.ok((select confirmar_agendamento(teste.v('ag'))) = 2, 'confirmou: 2 eventos (Alfa e Beta 2)');
reset role;
select teste.ok(not exists (select 1 from agendamento_grupos where id = teste.v('gv')), 'grupo Delta vazio sumiu ao tirar a última pessoa');
select teste.ok((select count(*) from events where title like 'Apresentação intermediária · %' and created_by = teste.v('gu')) = 2, 'eventos no nome de quem organizou');
select teste.ok((select convidados @> array[teste.v('t1'), teste.v('t2'), teste.v('gu')] from events where title = 'Apresentação intermediária · Alfa'), 'evento do Alfa tem os integrantes + organizador');
select teste.como('t3@t'); set role authenticated;
select teste.ok((select count(*) from events where title like 'Apresentação intermediária%') = 1, 'Trainee 3 vê só o evento do grupo dele');
select teste.erro(format('select reservar_horario(%L, %L)', teste.v('ag'), teste.v('h4')), 'confirmado', 'depois de confirmar ninguém muda');
reset role;
select teste.ok(current_setting('agenda.autor', true) is null or current_setting('agenda.autor', true) = '', 'variável de autoria não vaza para fora da confirmação');

\echo '── Prazo vencido ──'
update agendamentos set prazo = now() - interval '1 minute' where id = teste.v('ag2');
select teste.como('t1@t'); set role authenticated;
reset role; insert into agendamento_convidados values (teste.v('ag2'), teste.v('t1'));
select teste.como('t1@t'); set role authenticated;
select teste.erro(format('select criar_grupo(%L, %L)', teste.v('ag2'), 'Tarde'), 'prazo', 'depois do prazo, convidado não mexe');
reset role;

\echo '── Sem dono (quem criou foi removido) ──'
insert into members (email, name, nivel) values ('m3@t', 'Membro 3', 'membro');
select teste.como('m3@t'); set role authenticated;
select teste.guarda('ag3', criar_agendamento('Órfão', '', now() + interval '1 day', '{}', '{}', '{}', jsonb_build_array(jsonb_build_object('inicio', now() + interval '5 days', 'fim', now() + interval '5 days 1 hour'))));
select teste.guarda('g3', org_criar_grupo(teste.v('ag3'), 'X'));
select teste.guarda('vot3', criar_votacao('Pedido órfão', '', 'unica', array[to_char(now() + interval '10 days', 'YYYY-MM-DD')], 60, now() + interval '5 days', '{}', array[teste.v('m2')], '{}'));
reset role;
delete from members where email = 'm3@t';
select teste.como('m2@t'); set role authenticated;
select teste.erro(format('select org_renomear_grupo(%L, %L)', teste.v('g3'), 'Hack'), 'Só quem organizou', 'agendamento sem dono: membro qualquer NÃO vira organizador (correção da revisão)');
select teste.erro(format('select reabrir_votacao(%L, %L, null)', teste.v('vot3'), now() + interval '9 days'), 'diretoria', 'pedido sem dono: membro qualquer NÃO reabre (correção da revisão)');
reset role;

\echo '── Excluir ──'
select teste.como('t1@t'); set role authenticated;
delete from agendamentos where id = teste.v('ag');
reset role;
select teste.ok(exists (select 1 from agendamentos where id = teste.v('ag')), 'trainee não exclui');
select teste.como('gu@t'); set role authenticated;
delete from agendamentos where id = teste.v('ag');
reset role;
select teste.ok(not exists (select 1 from agendamentos where id = teste.v('ag')), 'quem criou exclui');
select teste.ok((select count(*) from events where title like 'Apresentação intermediária · %') = 2, '…e os eventos continuam na agenda');

\echo 'TUDO OK'
