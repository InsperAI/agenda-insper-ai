# Estado do projeto

_Atualizado em 14/11/2026. Atualize este arquivo quando algo daqui mudar._

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

Todas de `0001` a `0015` (rodadas à mão no SQL Editor, em ordem):

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
| 0010 | Diretoria também confirma/reabre qualquer pedido; evento fica no nome de quem pediu |
| 0011 | Quem entra num nível (cadastro ou mudança) vira convidado dos pedidos abertos para esse nível |
| 0012 | **Horários por grupo** (agendamentos): grupos estilo Classroom, um horário por grupo; corrige `pode_decidir_votacao` para pedido sem dono |
| 0013 | `feed_buscas`: o feed anota, por pessoa e por app (Google/Apple/Outlook), a primeira e a última busca e quantas foram; a página Conectar mostra "buscou há 9 h · em média a cada 13 h". O código funciona sem ela (o bloco só não aparece). |
| 0014 | **Google Agenda na hora** — `google_conta`, `google_inscricoes`, `google_fila`, `google_espelho`, triggers que enfileiram e chamam `/api/google/sincronizar` pelo pg_net. Aplicada em 16/11/2026; conta organizadora `agendainsperai@gmail.com`. |
| 0015 | "Reenviar convites" (aplicada em 16/11/2026): `google_inscricoes.reenviado_em` (trava de 2 min, só o servidor grava); logado só escreve `member_id`/`email` na própria inscrição; gravar a trava não re-enfileira tudo. |

## Google Agenda "na hora" (0014)

O link .ics é **puxado** (Google: 12–24 h). Para o Google, agora a agenda **empurra**, como o SIGE fazia: uma conta Google da Insper AI (conectada por um admin em **Membros**) é a organizadora; cada evento vira um evento na agenda "Insper AI · Agenda" dessa conta, com quem pode vê-lo e ativou em **Conectar** como convidado. Aparece na agenda da pessoa segundos depois de salvo.

- **Fluxo:** qualquer insert/update/delete em `events` (ou mudança em `google_inscricoes` / nível de quem recebe) → trigger enfileira a série em `google_fila` → uma vez por comando o pg_net chama `POST /api/google/sincronizar` (header `x-agenda-segredo` = `google_conta.segredo`) → a rota responde 202 e, em `after()`, `lib/google/sincronizar.ts` esvazia a fila. O cron diário (`/api/ping`) varre o que sobrar.
- **Mapeamento** (`lib/googleEvento.ts`): mestre → 1 evento (id = uuid sem hífens) com RRULE + EXDATE por filha; filha editada → evento avulso; cancelada → só o EXDATE. `google_espelho` guarda o hash do que foi enviado: só vai ao Google o que mudou; o que sumiu é apagado.
- **Melhor que o SIGE:** escopo mínimo (`calendar.app.created`: só a agenda que o app criou), cada pessoa escolhe ativar e qual e-mail Google usar, ninguém vê a lista de convidados, mantém a resposta Sim/Não de quem respondeu, fila com nova tentativa (1 min → 6 h), e o feed .ics deixa de repetir para o Google quem ativou (Apple/Outlook seguem recebendo tudo).
- **Ninguém recebe e-mail** (`sendUpdates=none`). O convite chega como "Insper AI · Agenda" (o endereço `…@group.calendar.google.com` da agenda, não o Gmail). Se a pessoa tiver "Adicionar convites à minha agenda" ≠ "De todos", o Google não põe o evento na agenda dela, e **mudar depois não adianta**: o Google só olha isso quando a pessoa entra como convidada (testado em 16/11/2026). Por isso Conectar pede "De todos" **antes** de ativar, e quem já ativou tem **Reenviar convites** (`/api/google/reenviar`, `lib/google/reenviar.ts`): tira e põe a pessoa de volta em cada evento, no máximo a cada 2 min contados desde o último reenvio **e** desde que ativou (`reenviado_em`, 0015). Só reenvia evento que a pessoa não respondeu (quem respondeu Sim/Não recebeu) e que ainda existe; marca o espelho como `reenviando` e enfileira as séries antes de mexer, e no fim pede uma rodada da sincronização, então ninguém fica de fora se algo parar no meio. Não testado: se pôr o Gmail da conta nos contatos basta no lugar de "De todos".
- **Diagnóstico:** Membros mostra conta, inscritos, fila e último erro, com "Sincronizar agora". No SQL Editor: `select serie_id, tentativas, erro, proxima_em from google_fila order by proxima_em;` e `select * from net._http_response order by created desc limit 20;` (respostas do pg_net).
- **Limites:** só séries que não acabaram há mais de 30 dias e começam nos próximos 18 meses (o que já foi enviado continua sendo atualizado mesmo saindo da janela). Desconectar ou trocar de conta apaga a agenda "Insper AI · Agenda" da conta antiga (os convites somem de todos) antes de revogar o acesso.
- **Sem laço:** se o token ou a agenda falham, a rota não se chama de novo; só encadeia outra rodada quando a anterior andou. Série com erro espera 1, 2, 4… min (até 6 h).
- **Em aberto (decisão do dono):** o e-mail que cada um digita em Conectar não é verificado — alguém pode mandar para outro endereço o que **ele mesmo** já vê (não amplia o acesso). O segredo do pg_net fica nos headers de `net.http_request_queue`; só dispara sincronizações, sem dano além disso.

### Para ligar (uma vez)

1. Google Cloud → projeto "Agenda Insper AI" → **APIs e serviços → Biblioteca → Google Calendar API → Ativar**.
2. Google Auth Platform → **Acesso a dados → Adicionar escopo** `…/auth/calendar.app.created` (o Google pode pedir verificação; enquanto não verifica, quem conecta vê "app não verificado" → Avançado → continuar. Só o admin passa por essa tela).
3. Mesmo lugar → **Clientes → "Agenda Supabase"** → URIs de redirecionamento: adicionar `https://agenda-insper-ai.vercel.app/api/google/retorno` (e `http://localhost:3002/api/google/retorno` para testar local). Copiar o ID e a chave secreta do cliente (criar uma chave nova, se a antiga não aparecer).
4. Vercel → Settings → Environment Variables: `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` → Redeploy.
5. Supabase → SQL Editor → rodar `0014_google_agenda.sql` (ativa o pg_net).
6. No app, logado como admin: **Membros → Conectar conta Google** com a conta organizadora (de preferência uma @insperai.com.br só para isso; `agendainsperai@gmail.com` também serve).
7. Cada pessoa: **Conectar → Google Agenda · na hora → Ativar**.

## Sincronização do calendário (feed .ics)

- Assinatura por link é **puxada pelo app de calendário**, no ritmo dele: Google a cada ~12–24 h (sem botão de atualizar; remover e adicionar força uma busca), Apple segue o "Obter Dados" do aparelho, Outlook ~1 h. Não dá para empurrar mudanças por um link .ics.
- O feed sobe `SEQUENCE`/`LAST-MODIFIED` da série inteira quando qualquer linha dela muda (antes, "excluir somente esta" não subia a SEQUENCE e Google/Outlook podiam manter a ocorrência apagada) e manda `Cache-Control: no-store`.
- Para diagnosticar alguém: Supabase → SQL Editor →
  `select m.name, b.cliente, b.ultima_em, b.buscas, (b.ultima_em - b.primeira_em) / nullif(b.buscas - 1, 0) as intervalo_medio, b.agente from feed_buscas b join members m on m.id = b.member_id order by b.ultima_em desc;`
  Sem linha do Google para a pessoa = o Google nunca chegou ao feed (link errado/antigo ou bloqueio); `ultima_em` antiga = o Google parou de buscar.

## Regras de acesso (resumo)

- **Ver:** cada nível vê os eventos cujo `publico` o inclui (+ convidados individuais); a diretoria vê tudo.
- **Eventos:** diretoria cria/edita/exclui tudo; membro cria (sempre visível para membros) e mexe só no que criou; trainee só vê.
- **Disponibilidade:** diretoria e membros abrem; só convidados respondem; convidados veem o mapa sem nomes; diretoria e quem abriu veem nomes; quem abriu **ou qualquer pessoa da diretoria** confirma/reabre (0010 — o evento fica no nome de quem pediu); só quem abriu exclui. A página tem abas **Abertos / Encerrados** (`?aba=encerrados`); encerrado = confirmado ou vencido há mais de 7 dias (`lib/pedidos.ts`, mesma regra da 0009).
- **Horários por grupo** (`/disponibilidade/g/<id>`, 0012): diretoria e membros criam (janelas fatiadas em horários + prazo + convidados). Convidados criam um grupo ou entram num (um grupo por pessoa); qualquer integrante reserva/troca/solta o horário do grupo até o prazo; um horário tem no máximo um grupo. Quem criou ou a diretoria mexe em grupos/pessoas/horários e confirma → um evento por grupo, visível aos integrantes (e editável só pela diretoria, pela regra da 0007). Só quem criou exclui. Lógica pura em `lib/agendamento.ts`; UI em `components/agendamento/`.
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

## Estados de tela

- `app/not-found.tsx` (404), `app/error.tsx` (fora do app), `app/(app)/error.tsx` (dentro do app, mantém a barra) e `app/global-error.tsx` (layout raiz falhou). Corpo comum em `components/estados/` (`TelaEstado`, `TelaErro` — detecta offline e mostra o código do erro para casar com o log da Vercel).
- Esqueletos por aba: `loading.tsx` em `(app)`, `agenda`, `disponibilidade`, `disponibilidade/[id]`, `disponibilidade/nova` (peças em `components/estados/Esqueleto.tsx`; pulso desligado com "reduzir movimento").
- Falha de rede vira "Sem conexão…" em todos os tradutores de erro (`lib/erros.ts`). A agenda tem "Tentar de novo" no aviso de erro e explica quando a busca/filtros escondem tudo (`AvisoFiltro`).

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
- **Confirmar presença (vou / não vou)** — pedido de um membro em 13/11/2026: ver quem vai a cada evento. Um link .ics é só leitura: o "Sim/Não" do calendário só existe em **convite** (organizador + convidados). Caminhos: (a) botão no app + lista de quem vai; (b) convites de verdade pela API do Google Agenda com uma conta da Insper AI como organizadora (resposta no próprio calendário e mudanças na hora, mas exige OAuth, sincronizar cada edição e mandar convite a todo mundo). Em discussão.

## Mensagem modelo para o grupo

> Pessoal, a agenda da Insper AI tá no ar: https://agenda-insper-ai.vercel.app
>
> É só entrar com o Google. Lá dá pra ver os eventos, aulas e reuniões.
>
> 📲 No iPhone: abram no Safari → Compartilhar → "Adicionar à Tela de Início" que vira um app.
> 📅 Pra ver tudo no seu Google Agenda/Apple Calendar: dentro do site, vão em "Conectar".
