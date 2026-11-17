import { planejarReenvio, type Assinante, type Reenvio } from "../googleEvento";
import { maisAntigosPrimeiro, precisaReconvite, type ResultadoReenvio } from "../reenvio";
import { supabaseAdmin } from "../supabase/admin";
import type { EventoRow, GoogleEspelhoRow } from "../supabase/tipos";
import { agendaExiste, ErroGoogle, lerConvite, regravarEvento, renovarAcesso } from "./api";
import { lerAssinantes, pedirOutraRodada } from "./sincronizar";

/**
 * "Reenviar convites" de UMA pessoa: em cada evento já enviado em que ela é
 * convidada e ainda não respondeu, tira e põe de volta. É o que faz o Google
 * reavaliar "Adicionar convites à minha agenda" (ele só olha quando a pessoa
 * entra como convidada).
 *
 * Nunca deixar alguém de fora:
 *  • antes de mexer, todas as séries envolvidas vão para a fila;
 *  • o espelho do evento vira "reenviando" antes de tirar a pessoa, então a
 *    sincronização normal (que compara plano × espelho) a devolve se algo parar
 *    no meio;
 *  • depois de mexer num evento, a série volta para a fila de novo: uma
 *    sincronização que rodou no meio pode ter consumido a entrada de antes;
 *  • no fim, sempre pede uma rodada da sincronização para conferir tudo;
 *  • prazo curto + limite de 8 s por chamada ao Google: a função termina antes
 *    dos 60 s da Vercel.
 */

type Admin = ReturnType<typeof supabaseAdmin>;
type Item = { serieId: string; r: Reenvio };
type Espelho = Pick<GoogleEspelhoRow, "evento_id" | "serie_id" | "atualizado_em">;

const REENVIANDO = "reenviando";
const EM_PARALELO = 3;
const ENFILEIRAR_EM_PARALELO = 10;
/** Mestre + filhas de 25 séries cabem folgados no limite de 1000 linhas do PostgREST. */
const SERIES_POR_CONSULTA = 25;
const PAGINA = 1000;
const NADA: ResultadoReenvio = { eventos: 0, faltaram: 0, falhas: 0 };

export async function reenviarConvites(memberId: string, { prazoMs = 20_000 }: { prazoMs?: number } = {}): Promise<ResultadoReenvio> {
  const fim = Date.now() + prazoMs;
  const admin = supabaseAdmin();
  const { data: conta } = await admin.from("google_conta").select("refresh_token,calendario_id,site_url").maybeSingle();
  if (!conta?.calendario_id) return NADA;
  const calendario = conta.calendario_id;

  const acesso = await renovarAcesso(conta.refresh_token);
  if (!(await agendaExiste(acesso, calendario))) return NADA;

  const assinantes = await lerAssinantes(admin);
  const pessoa = assinantes.find((a) => a.member_id === memberId);
  if (!pessoa) return NADA;

  const itens = await planejar(admin, assinantes, pessoa.email, conta.site_url);
  if (itens.length === 0) return NADA;
  await enfileirar(admin, [...new Set(itens.map((i) => i.serieId))]);

  let eventos = 0;
  let falhas = 0;
  let feitos = 0;
  let revogado: unknown = null;
  try {
    while (feitos < itens.length && Date.now() < fim && !revogado) {
      const lote = itens.slice(feitos, feitos + EM_PARALELO);
      const resultados = await Promise.allSettled(lote.map((item) => reconvidar(admin, acesso, calendario, pessoa.email, item)));
      feitos += lote.length;
      for (const r of resultados) {
        if (r.status === "fulfilled") eventos += r.value ? 1 : 0;
        else {
          falhas++;
          console.error("[google] reenviar:", r.reason instanceof Error ? r.reason.message : r.reason);
          if (r.reason instanceof ErroGoogle && r.reason.revogado) revogado = r.reason;
        }
      }
    }
  } finally {
    await pedirOutraRodada().catch(() => undefined);
  }
  if (revogado) throw revogado;
  return { eventos, faltaram: itens.length - feitos, falhas };
}

/** Os eventos já enviados em que a pessoa é convidada, quem esperou mais primeiro. */
async function planejar(admin: Admin, assinantes: Assinante[], email: string, site: string): Promise<Item[]> {
  const espelho = await lerEspelho(admin);
  const series = [...new Set(espelho.map((e) => e.serie_id))];

  const porSerie = new Map<string, EventoRow[]>();
  for (let i = 0; i < series.length; i += SERIES_POR_CONSULTA) {
    const lote = series.slice(i, i + SERIES_POR_CONSULTA);
    const [mestres, filhas] = await Promise.all([
      todasAsLinhas<EventoRow>("events", (de, ate) => admin.from("events").select("*").in("id", lote).order("id").range(de, ate)),
      todasAsLinhas<EventoRow>("events", (de, ate) => admin.from("events").select("*").in("series_id", lote).order("id").range(de, ate)),
    ]);
    for (const l of [...mestres, ...filhas]) {
      const serie = l.series_id ?? l.id;
      porSerie.set(serie, [...(porSerie.get(serie) ?? []), l]);
    }
  }

  const itens = [...porSerie].flatMap(([serieId, linhas]) => planejarReenvio(linhas, assinantes, email, site).map((r) => ({ serieId, r })));
  const quando = new Map(espelho.map((e) => [e.evento_id, e.atualizado_em]));
  return maisAntigosPrimeiro(itens, (i) => quando.get(i.r.com.eventoId));
}

function lerEspelho(admin: Admin): Promise<Espelho[]> {
  return todasAsLinhas<Espelho>("google_espelho", (de, ate) => admin.from("google_espelho").select("evento_id,serie_id,atualizado_em").order("evento_id").range(de, ate));
}

/** O PostgREST devolve no máximo 1000 linhas por consulta: pagina até acabar. */
async function todasAsLinhas<T>(nome: string, pagina: (de: number, ate: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await pagina(de, de + PAGINA - 1);
    if (error) throw new Error(`${nome}: ${error.message}`);
    const linhas = (data ?? []) as T[];
    todas.push(...linhas);
    if (linhas.length < PAGINA) return todas;
  }
}

async function enfileirar(admin: Admin, series: string[]) {
  for (let i = 0; i < series.length; i += ENFILEIRAR_EM_PARALELO) {
    const lote = series.slice(i, i + ENFILEIRAR_EM_PARALELO);
    const erros = (await Promise.all(lote.map((serie) => admin.rpc("google_enfileirar", { p_serie: serie })))).filter((r) => r.error);
    if (erros.length) throw new Error(`google_enfileirar: ${erros[0].error!.message}`);
  }
}

/** true = tirou e pôs de volta; false = não precisava (respondeu, ou o evento sumiu). */
async function reconvidar(admin: Admin, acesso: string, calendario: string, email: string, { serieId, r }: Item): Promise<boolean> {
  const atual = await lerConvite(acesso, calendario, r.com.corpo.id);
  if (!precisaReconvite(atual.existe, atual.respostas.get(email.trim().toLowerCase()))) {
    await carimbar(admin, r.com.eventoId);
    return false;
  }
  await espelhar(admin, serieId, r.com.eventoId, REENVIANDO);
  try {
    await regravarEvento(acesso, calendario, r.sem, atual.respostas);
    await regravarEvento(acesso, calendario, r.com.corpo, atual.respostas);
    await espelhar(admin, serieId, r.com.eventoId, r.com.assinatura);
    return true;
  } finally {
    // Garante a série na fila DEPOIS de mexer: se parou no meio (ou o plano ficou velho), a sincronização conserta.
    await enfileirar(admin, [serieId]).catch((e) => console.error(`[google] reenviar: série ${serieId} fora da fila:`, e instanceof Error ? e.message : e));
  }
}

async function espelhar(admin: Admin, serieId: string, eventoId: string, assinatura: string) {
  const { error } = await admin.from("google_espelho").upsert({ evento_id: eventoId, serie_id: serieId, assinatura, atualizado_em: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** Só a hora: "toque de novo" passa adiante deste evento, sem esconder da sincronização uma mudança pendente. */
async function carimbar(admin: Admin, eventoId: string) {
  const { error } = await admin.from("google_espelho").update({ atualizado_em: new Date().toISOString() }).eq("evento_id", eventoId);
  if (error) throw new Error(error.message);
}
