# Agenda da Diretoria · Insper AI

Calendário compartilhado da diretoria: eventos, aulas, reuniões e prazos. Todo membro cadastrado vê e edita tudo; cada alteração fica registrada com quem fez. Feed `.ics` por pessoa para assinar no Google Agenda / Apple Calendar.

**Stack:** Next.js 16 (App Router) na Vercel · Supabase (Postgres + Auth com Google) · Tailwind v4 com os tokens do Playbook de Marca.

---

## 1. Rodar localmente

```bash
npm install
cp .env.local.example .env.local   # preencha com as chaves do passo 2
npm run dev                        # http://localhost:3000
npm test                           # testes de recorrência e .ics
npm run lint && npm run typecheck
```

## 2. Configurar as contas (uma vez)

Nenhuma das contas existe ainda. A ordem importa: Supabase → Google Cloud → Vercel.

### A. GitHub
1. Crie um repositório **privado** `agenda-insper-ai`.
2. Dentro desta pasta: `git init && git add -A && git commit -m "Agenda da Diretoria" && git branch -M main && git remote add origin <url> && git push -u origin main`.

### B. Supabase (supabase.com, plano Free)
1. **New project** → região `South America (São Paulo)`. Guarde a senha do banco.
2. **SQL Editor** → cole `supabase/migrations/0001_init.sql` inteiro → **Run**.
3. Abra `supabase/seed.sql`, troque o e-mail pelo da **sua conta Google** e o nome, cole no SQL Editor → **Run**. Você é o primeiro admin.
4. **Project Settings → API**: copie *Project URL*, a chave *anon / publishable* e a chave *service_role / secret* para o `.env.local`.
5. **Authentication → URL Configuration**:
   - *Site URL*: `http://localhost:3000` (depois do deploy, troque pela URL da Vercel).
   - *Redirect URLs*: `http://localhost:3000/**` e `https://agenda-insper-ai.vercel.app/**` (ajuste ao domínio real).
6. **Authentication → Providers → Google** → *Enable*. Copie a **Callback URL** mostrada (`https://<ref>.supabase.co/auth/v1/callback`). Deixe a aba aberta para colar o Client ID/Secret do passo C.

### C. Google Cloud (console.cloud.google.com, grátis)
1. Novo projeto **Agenda Insper AI**.
2. **APIs & Services → OAuth consent screen**: tipo *External*, nome "Agenda da Diretoria — Insper AI", e-mail de suporte, escopos padrão (`openid`, `email`, `profile`). Depois **Publish app** (sem isso, só 100 "test users" conseguem entrar). Não precisa de verificação para esses escopos.
3. **Credentials → Create credentials → OAuth client ID → Web application**. Em *Authorized redirect URIs* cole **só** a Callback URL do Supabase (B.6).
4. Copie *Client ID* e *Client secret* → cole no provider Google do Supabase → **Save**.

Pronto para testar local: `npm run dev` → `/entrar` → Google → `/agenda`.

### D. Vercel (vercel.com, plano Hobby)
1. Entre com o GitHub → **Add New → Project** → importe `agenda-insper-ai`. Framework: Next.js.
2. **Environment Variables** (Production e Preview): as cinco do `.env.local.example`. `NEXT_PUBLIC_SITE_URL` = URL de produção; `CRON_SECRET` = qualquer string longa aleatória.
3. **Deploy**. Copie o domínio gerado.
4. Volte ao Supabase (B.5): *Site URL* = domínio da Vercel; confirme que ele está nas *Redirect URLs*. Na Vercel, ajuste `NEXT_PUBLIC_SITE_URL` se mudou e faça **Redeploy**.

Para adicionar o resto da diretoria: entre no app → **Membros** → e-mail da conta Google + nome + cargo.

## 3. Como funciona

| Peça | Onde |
|---|---|
| Esquema, triggers de auditoria, RLS | `supabase/migrations/0001_init.sql` |
| Portão de membro (logado mas fora da lista → `/sem-acesso`) | `app/(app)/layout.tsx`, `proxy.ts` |
| Expansão de séries (semanal/quinzenal/mensal + exceções) | `lib/recorrencia.ts` |
| Serializador `.ics` (RRULE / EXDATE / RECURRENCE-ID) | `lib/ics.ts`, `app/api/feed/[token]/route.ts` |
| Cores das categorias | `app/globals.css` (`--cat-*`) + `lib/categorias.ts` |
| Vistas mês / semana / próximos | `components/agenda/Vista*.tsx` |

**Recorrência:** uma linha "mestre" guarda `freq` + `until`. Editar/excluir *só esta ocorrência* cria uma linha filha com `series_id` + `original_start` (ou `cancelled = true`). Editar *toda a série* atualiza o mestre e propaga título/local/etc. para as filhas; mudar horário ou repetição apaga as filhas (o app avisa antes).

**Permissões:** só e-mails em `members` leem e escrevem (RLS). Só admins alteram `members`. O último admin não pode ser removido (trigger). `created_by/updated_by` são preenchidos por trigger, não pelo cliente.

**Feed:** `GET /api/feed/<token>` é público, autenticado só pelo token (48 hex) do membro. Em *Assinar* dá para copiar, abrir no Google/Apple e gerar um novo token.

## 4. Verificação manual

- Dois perfis do Chrome: A (admin do seed) e B (não cadastrado). B entra → `/sem-acesso`. A adiciona B em Membros → B recarrega → vê a agenda. A remove B → próxima navegação de B cai em `/sem-acesso`.
- Crie uma reunião semanal; exclua *só esta* numa semana; mova outra para o dia seguinte; confira em Mês, Semana e Próximos.
- `curl -i https://<site>/api/feed/<token>` → `200` + `text/calendar`; token errado → `404`. Cole o corpo em https://icalendar.org/validator.html.
- Google Agenda → *Outras agendas → + → Por URL*: a série aparece sem a ocorrência excluída e com a movida no dia certo.
