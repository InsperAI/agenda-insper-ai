# Estado do projeto

_Atualizado em 29/10/2026. Atualize este arquivo quando algo daqui mudar._

## No ar

- **Site:** https://agenda-insper-ai.vercel.app (instalável como app: Safari → Compartilhar → Adicionar à Tela de Início)
- **Código:** github.com/InsperAI/agenda-insper-ai (público, `main`). O remote `upstream` aponta para o repo original `gsleal78/agenda-insper-ai`.

## Infraestrutura (sem segredos aqui)

| Peça | Detalhe |
|---|---|
| Supabase | Projeto `agenda-insper-ai` (ref `tddcdurvejczrnntwoeb`), org "InsperAI", plano Free, região São Paulo. Chaves novas (`sb_publishable_…` / `sb_secret_…`). |
| Auth | Google (OAuth publicado, "In production"); e-mail com código (OTP, 6 dígitos, vale 1 h) **ativo desde 30/10/2026** — SMTP do Gmail `agendainsperai@gmail.com` (senha de app; 2FA por passkey), templates "Confirm sign up" e "Magic link or OTP" com `{{ .Token }}`. Redirect URLs: produção + `http://localhost:3001/**` (adicione `http://localhost:3002/**` se ainda não estiver, para logar no dev local). |
| Google Cloud | Projeto "Agenda Insper AI", Google Auth Platform publicado; cliente OAuth "Agenda Supabase" com o callback do Supabase. |
| Vercel | Time `chequer70117-gmailcom` (Hobby), projeto `agenda-insper-ai`. Funções em `gru1` (`vercel.json`). Cron diário `/api/ping` mantém o Supabase Free acordado. 5 variáveis de ambiente (as do `.env.local.example`). |
| Domínios | `insperai.com.br` = Google Workspace; `insperai.com` = Microsoft; `al.insper.edu.br` (alunos) = Microsoft 365 → por isso o login por código existe. |

## Migrações aplicadas em produção

Todas de `0001` a `0009` (rodadas à mão no SQL Editor, em ordem):

| # | O quê |
|---|---|
| 0001 | Esquema, auditoria, RLS, feed |
| 0002 | Níveis `diretoria`/`membro`/`trainee`; admin só da diretoria |
| 0003 | `events.publico` (membros/trainees, diretoria sempre vê); pedidos de acesso (`access_requests`) |
| 0004 | Pedidos de disponibilidade (`votacoes`…); `events.convidados` |
| 0005 | Diretoria acompanha todos os pedidos |
| 0006 | Link curto `/d/<codigo>` + resumo público; corrige `gen_random_bytes` (`extensions.`), inclusive `rotate_feed_token` |
| 0007 | Membros criam eventos e mexem só nos seus (e nas suas séries) |
| 0008 | Membros também abrem pedidos de disponibilidade e convidam qualquer pessoa |
| 0009 | Pedido vencido e não confirmado sai do contador da aba 7 dias depois do prazo |

## Regras de acesso (resumo)

- **Ver:** cada nível vê os eventos cujo `publico` o inclui (+ convidados individuais); a diretoria vê tudo.
- **Eventos:** diretoria cria/edita/exclui tudo; membro cria (sempre visível para membros) e mexe só no que criou; trainee só vê.
- **Disponibilidade:** diretoria e membros abrem; só convidados respondem; convidados veem o mapa sem nomes; diretoria e quem abriu veem nomes; só quem abriu confirma/reabre/exclui.
- **Membros:** só admins (que são da diretoria) cadastram, editam, aprovam pedidos de acesso.

## Pendências

1. **Trocar o remetente para `contato@insperai.com.br`** (opcional, quando o dono da conta responder): na conta `contato@`, ativar Verificação em 2 etapas → criar **senha de app** (myaccount.google.com/apppasswords; se não aparecer, o admin do Workspace precisa permitir). Depois, em Supabase → Authentication → Emails → **SMTP Settings**, trocar remetente, usuário e senha. Nada mais muda.
2. **Testar com gente de verdade:** fluxo de disponibilidade completo (pedir → link no grupo → marcar → confirmar → aparece na agenda), um membro criando evento, "Gerar novo link" em Conectar (corrigido na 0006), e se a navegação ficou rápida depois do `gru1`.
3. Confirmar em **Membros** que André Daud, Gustavo Pacheco e Maria Clara Motta estão como **Diretoria** (foram deixados fora da importação em lote) e se Leonardo Moretti é membro ou diretoria.

Template do e-mail (já aplicado em "Magic link or OTP" e "Confirm sign up"):

```html
<p>Olá!</p>
<p>Seu código para entrar na Agenda Insper AI:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>O código vale por 1 hora. Se você não pediu, pode ignorar este e-mail.</p>
```

## Desempenho

- Sessão conferida com `auth.getClaims()` (JWT ES256 verificado localmente) em `proxy.ts`, `lib/membro.ts` e `/d/[codigo]` — sem ida ao servidor de Auth por navegação. Se as chaves de assinatura do Supabase voltarem a ser simétricas, isso volta a custar uma ida.
- `useEventos` guarda os períodos em cache (`lib/cache.ts`), mostra na hora e confirma com o banco; pré-carrega o mês/semana vizinhos (`lib/periodo.ts`).
- `/agenda` já vem do servidor com os eventos do período visível (`eventosIniciais`); o cliente pula a primeira consulta.
- Vercel Speed Insights ligado (`<SpeedInsights />` em `app/layout.tsx`); olhar Mobile → Routes → LCP da `/agenda` (bom: < 2,5 s).

## Ideias levantadas (não feitas)

- **Notificações push** (PWA no iPhone suporta): avisar pedido de disponibilidade pendente/confirmado. Precisa de serviço de push e chaves VAPID.
- **"Copiar link" sempre com o domínio de produção**, mesmo rodando local (o usuário dispensou por ora).
- **Domínio próprio** (ex.: `agenda.insperai.com.br`) na Vercel; tela do Google mostraria esse domínio em vez de `…supabase.co` só com domínio customizado no Supabase (pago).
- Trainees criarem eventos / pedidos: hoje não podem (decisão do usuário).

## Mensagem modelo para o grupo

> Pessoal, a agenda da Insper AI tá no ar: https://agenda-insper-ai.vercel.app
>
> É só entrar com o Google. Lá dá pra ver os eventos, aulas e reuniões.
>
> 📲 No iPhone: abram no Safari → Compartilhar → "Adicionar à Tela de Início" que vira um app.
> 📅 Pra ver tudo no seu Google Agenda/Apple Calendar: dentro do site, vão em "Conectar".
