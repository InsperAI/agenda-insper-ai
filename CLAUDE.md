# CLAUDE.md — Agenda Insper AI

Calendário compartilhado da Insper AI (diretoria, membros, trainees). Next.js 16 (App Router) na Vercel + Supabase (Postgres, Auth, RLS). Interface e código em **português**; o dono do projeto conversa em PT ou EN.

- **Estado atual, infraestrutura e pendências:** [`docs/estado.md`](docs/estado.md) — leia antes de mexer.
- **Setup do zero e arquitetura:** [`README.md`](README.md).

## Comandos

```bash
npm run dev -- -p 3002   # a 3001 costuma estar ocupada por um container Docker do usuário
npm test                 # Vitest (tests/*.test.ts), lógica pura
npm run typecheck && npm run lint
npm run build            # rode antes de cada push; também regenera .next/types
```

Depois de **renomear uma rota**, o typecheck acusa `.next/types/validator.ts` apontando para a pasta antiga: é cache. `npm run build` resolve.

## Como trabalhar aqui

- **Deploy:** push em `main` → Vercel publica sozinha (1–2 min). Funções em `gru1` (São Paulo, `vercel.json`), junto do banco — não remova `regions`.
- **Banco = migrações numeradas** em `supabase/migrations/NNNN_nome.sql`. Não há Supabase CLI: o usuário **cola no SQL Editor e roda**. Fluxo:
  1. escreva a próxima `NNNN` (nunca edite uma já aplicada; corrija numa nova);
  2. `pbcopy < supabase/migrations/NNNN_….sql` e peça para o usuário rodar;
  3. se o código novo depende da migração (coluna/tabela nova), **só faça push depois** que ele confirmar; se o código funciona com e sem, pode subir antes e diga isso.
  - `drop policy` faz o SQL Editor mostrar "destructive operations" — explique que é esperado.
  - Prefira migrações re-executáveis (`if not exists`, `create or replace`, `do $$ … $$`).
- **pgcrypto no Supabase fica no schema `extensions`.** Em funções com `set search_path = public`, chame `extensions.gen_random_bytes(...)` (a 0006 corrigiu isso).
- **Segurança vive na RLS.** Toda regra de permissão vale no banco; o app só esconde botões. Funções `security definer` sempre com `set search_path` e `revoke … from anon, public` + `grant … to authenticated`. O feed `.ics` usa a service role (ignora RLS) e filtra à mão com `visiveisPara()`.
- **Mensagens do banco** (`raise exception`) chegam ao usuário: traduza/ajuste no cliente (`traduzirErroVotacao`, `traduzirErroMembro`, `traduzirErroLogin`) em vez de criar migração só para texto.
- **Lógica pura em `lib/` com teste em `tests/`** (TDD: teste primeiro). Componentes em `components/<área>/`, rotas logadas em `app/(app)/`.
- **Nomes de domínio:** no banco/código "votação" (`votacoes`, `lib/votacao.ts`); na interface é **"Disponibilidade" / "pedido de disponibilidade"**. A aba "Conectar" (feed .ics) é `app/(app)/conectar` — antes era "Assinar" (há redirect em `next.config.ts`).
- **Revisão:** para mudanças em RLS/permissões, rode uma revisão de segurança (agente `code-reviewer`) antes de entregar a migração.
- **Commits:** conventional (`feat:`, `fix:`, `perf:`…), em inglês, com o trailer de co-autoria.
- **Segredos:** nunca leia nem imprima as chaves do `.env.local`; não há acesso direto ao banco de produção daqui — dados (ex.: cadastrar membros) se fazem pelo app ou pelo usuário no SQL Editor.

## Mapa rápido

| Assunto | Onde |
|---|---|
| Níveis, quem vê/cria/edita | `lib/niveis.ts`, migrações 0002, 0003, 0007, 0008 |
| Eventos, séries, exceções | `lib/eventos.ts`, `lib/recorrencia.ts`, `components/agenda/` |
| Disponibilidade (when2meet) | `lib/votacao.ts`, `components/votacao/`, `app/(app)/disponibilidade/`, 0004–0006 |
| Link curto + prévia WhatsApp | `app/d/[codigo]/`, `lib/og.tsx`, `lib/resumoVotacao.ts`, 0006 |
| Membros, pedidos de acesso | `components/admin/`, `app/sem-acesso/`, 0003 |
| Login (Google + código no e-mail) | `app/entrar/`, `lib/login.ts`, `proxy.ts`, `app/auth/` |
| Tema, tokens, mobile (abas, folhas, safe areas) | `app/globals.css`, `lib/tema.ts`, `components/layout/` |
| PWA (ícones, manifest) | `app/manifest.ts`, `app/apple-icon.tsx`, `app/icone/[tamanho]/` |
| Tipos do banco (escritos à mão) | `lib/supabase/tipos.ts` — atualize junto com cada migração |
