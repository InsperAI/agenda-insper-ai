import type { CorpoGoogle } from "../googleEvento";

/**
 * O mínimo da API do Google (OAuth + Calendar v3) por fetch, sem SDK.
 * Só servidor: usa GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
 *
 * Escopo `calendar.app.created`: a agenda só enxerga a agenda que ela mesma
 * criou na conta da Insper AI — não lê nem mexe em mais nada dessa conta.
 */
export const ESCOPOS = ["openid", "email", "https://www.googleapis.com/auth/calendar.app.created"];
const ESCOPO_AGENDA = ESCOPOS[2];
const API = "https://www.googleapis.com/calendar/v3";

export type CodigoErro = "falhou" | "config" | "revogado" | "sem_refresh" | "escopo" | "email";

export class ErroGoogle extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
    /** O acesso foi revogado ou expirou: só um admin conectando de novo resolve. */
    readonly revogado = false,
    /** Código curto para a tela de Membros (nunca texto vindo de URL). */
    readonly codigo: CodigoErro = "falhou",
  ) {
    super(mensagem);
  }
}

function credenciais() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const segredo = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !segredo) throw new ErroGoogle("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET não configuradas na Vercel.", 500, false, "config");
  return { id, segredo };
}

export function urlAutorizacao(redirectUri: string, estado: string): string {
  const q = new URLSearchParams({
    client_id: credenciais().id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: ESCOPOS.join(" "),
    access_type: "offline",
    // Sempre pedir consentimento: é o que garante um refresh_token novo.
    prompt: "consent",
    include_granted_scopes: "false",
    state: estado,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function token(corpo: Record<string, string>) {
  const { id, segredo } = credenciais();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: segredo, ...corpo }),
    cache: "no-store",
  });
  const dados = (await r.json().catch(() => ({}))) as Record<string, string>;
  if (!r.ok) {
    const revogado = dados.error === "invalid_grant";
    throw new ErroGoogle(revogado ? "O Google revogou o acesso da agenda. Conecte a conta de novo." : `Google OAuth: ${dados.error_description ?? dados.error ?? r.status}`, r.status, revogado, revogado ? "revogado" : "falhou");
  }
  return dados;
}

/** Troca o código do retorno do OAuth pelo refresh token e o e-mail da conta. */
export async function trocarCodigo(codigo: string, redirectUri: string): Promise<{ refreshToken: string; email: string; acesso: string }> {
  const d = await token({ code: codigo, redirect_uri: redirectUri, grant_type: "authorization_code" });
  if (!d.refresh_token) throw new ErroGoogle("O Google não mandou o refresh token. Tente conectar de novo.", 400, false, "sem_refresh");
  // O consentimento granular deixa desmarcar a agenda; sem ela não há o que fazer.
  if (!(d.scope ?? "").split(" ").includes(ESCOPO_AGENDA)) {
    throw new ErroGoogle("Marque a permissão de agendas na tela do Google para a sincronização funcionar.", 400, false, "escopo");
  }
  return { refreshToken: d.refresh_token, email: emailDoIdToken(d.id_token), acesso: d.access_token };
}

/** O id_token veio direto do Google por TLS, então basta ler o payload. */
function emailDoIdToken(idToken: string | undefined): string {
  try {
    const payload = JSON.parse(Buffer.from((idToken ?? "").split(".")[1], "base64url").toString("utf8"));
    if (typeof payload.email === "string") return payload.email.toLowerCase();
  } catch {
    /* cai no erro abaixo */
  }
  throw new ErroGoogle("Não deu para ler o e-mail da conta Google.", 400, false, "email");
}

export async function renovarAcesso(refreshToken: string): Promise<string> {
  const d = await token({ refresh_token: refreshToken, grant_type: "refresh_token" });
  return d.access_token;
}

export async function revogar(refreshToken: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: "POST", cache: "no-store" }).catch(() => undefined);
}

/* ── Calendar v3 ─────────────────────────────────────────────────────────── */

type Resposta<T> = { status: number; dados: T | null };

async function chamar<T>(acesso: string, metodo: string, caminho: string, corpo?: unknown): Promise<Resposta<T>> {
  const r = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${acesso}`, ...(corpo ? { "Content-Type": "application/json" } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: "no-store",
  });
  const texto = await r.text();
  const dados = texto ? (JSON.parse(texto) as T & { error?: { message?: string } }) : null;
  if (r.ok || r.status === 404 || r.status === 410) return { status: r.status, dados: r.ok ? dados : null };
  const msg = (dados as { error?: { message?: string } } | null)?.error?.message ?? texto.slice(0, 200);
  throw new ErroGoogle(`Google Agenda ${r.status}: ${msg}`, r.status, r.status === 401);
}

export async function agendaExiste(acesso: string, calendarioId: string): Promise<boolean> {
  const r = await chamar(acesso, "GET", `/calendars/${encodeURIComponent(calendarioId)}`);
  return r.status === 200;
}

export async function criarAgenda(acesso: string): Promise<string> {
  const r = await chamar<{ id: string }>(acesso, "POST", "/calendars", {
    summary: "Insper AI · Agenda",
    description: "Eventos da agenda da Insper AI (agenda-insper-ai.vercel.app). Mantida pelo app: edite lá, não aqui.",
    timeZone: "America/Sao_Paulo",
  });
  if (!r.dados?.id) throw new ErroGoogle("O Google não criou a agenda.", r.status);
  return r.dados.id;
}

type EventoExistente = { attendees?: { email: string; responseStatus?: string }[] };

/**
 * Cria ou atualiza pelo id próprio. Mantém a resposta (Sim/Não/Talvez) de quem
 * já respondeu. `sendUpdates=none`: ninguém recebe e-mail do Google; o evento
 * só aparece na agenda de cada convidado.
 */
export async function gravarEvento(acesso: string, calendarioId: string, corpo: CorpoGoogle): Promise<void> {
  const base = `/calendars/${encodeURIComponent(calendarioId)}/events`;
  const atual = await chamar<EventoExistente>(acesso, "GET", `${base}/${corpo.id}`);
  if (atual.status !== 200) {
    try {
      await chamar(acesso, "POST", `${base}?sendUpdates=none`, corpo);
      return;
    } catch (e) {
      // Id já usado (evento apagado que o Google ainda guarda): atualizar o reaproveita.
      if (!(e instanceof ErroGoogle && e.status === 409)) throw e;
    }
    await chamar(acesso, "PUT", `${base}/${corpo.id}?sendUpdates=none`, corpo);
    return;
  }
  const respostas = new Map((atual.dados?.attendees ?? []).map((a) => [a.email.toLowerCase(), a.responseStatus]));
  const attendees = corpo.attendees.map((a) => {
    const r = respostas.get(a.email);
    return r && r !== "needsAction" ? { ...a, responseStatus: r } : a;
  });
  await chamar(acesso, "PUT", `${base}/${corpo.id}?sendUpdates=none`, { ...corpo, attendees });
}

export async function apagarEvento(acesso: string, calendarioId: string, idGoogle: string): Promise<void> {
  await chamar(acesso, "DELETE", `/calendars/${encodeURIComponent(calendarioId)}/events/${idGoogle}?sendUpdates=none`);
}

/**
 * Apaga a agenda "Insper AI · Agenda" inteira — e com ela os convites na agenda
 * de cada convidado. Usado ao desconectar ou trocar de conta, antes de revogar.
 */
export async function apagarAgenda(acesso: string, calendarioId: string): Promise<void> {
  await chamar(acesso, "DELETE", `/calendars/${encodeURIComponent(calendarioId)}`);
}

/** Melhor esforço: com o token antigo, apaga a agenda antiga e revoga o acesso. */
export async function encerrarConta(refreshToken: string, calendarioId: string | null): Promise<void> {
  try {
    if (calendarioId) await apagarAgenda(await renovarAcesso(refreshToken), calendarioId);
  } catch (e) {
    console.error("[google] não apagou a agenda antiga:", e instanceof Error ? e.message : e);
  }
  await revogar(refreshToken);
}
