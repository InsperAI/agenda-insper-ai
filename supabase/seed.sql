-- Primeiro admin. Troque pelo e-mail da conta Google com a qual você vai entrar.
-- Rode UMA vez no SQL Editor, depois da migração 0001_init.sql.
insert into members (email, name, cargo, is_admin)
values ('seu-email@gmail.com', 'Seu Nome', 'Presidente', true)
on conflict (email) do update set is_admin = true;
