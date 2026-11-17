import { emJanela, idGoogle, planejarSerie, type Assinante } from "../googleEvento";
import { supabaseAdmin } from "../supabase/admin";
import type { EventoRow } from "../supabase/tipos";
import { agendaExiste, apagarEvento, criarAgenda, ErroGoogle, gravarEvento, renovarAcesso } from "./api";

/**
 * Esvazia a fila `google_fila` (0014): para cada série que mudou, lê o estado
 * atual no banco, compara com o espelho do que já está no Google e manda só a
 * diferença. Chamada pelo pg_net logo depois de cada mudança, pelo botão
 * "Sincronizar agora" e pelo cron diário.
 */

type Admin = ReturnType<typeof supabaseAdmin>;
export type ResultadoSincronia = { ok: boolean; series: number; falhas: number; restam: boolean; erro?: string };

const LOTE = 10;
const EM_PARALELO = 3;

export async function sincronizarGoogle({ prazoMs = 45_000 }: { prazoMs?: number } = {}): Promise<ResultadoSincronia> {
  const fim = Date.now() + prazoMs;
  const admin = supabaseAdmin();
  const { data: conta } = await admin.from("google_conta").select("*").maybeSingle();
  if (!conta) return { ok: false, series: 0, falhas: 0, restam: false, erro: "Nenhuma conta Google conectada." };

  let acesso: string;
  let calendario: string;
  try {
    acesso = await renovarAcesso(conta.refresh_token);
    calendario = await garantirAgenda(admin, acesso, conta.calendario_id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("google_conta").update({ erro: msg, erro_em: new Date().toISOString() }).eq("id", true);
    // Sem token ou sem agenda nada anda: NÃO pedir outra rodada (viraria um laço). Fica para a próxima mudança ou o cron.
    return { ok: false, series: 0, falhas: 0, restam: false, erro: msg };
  }

  const assinantes = await lerAssinantes(admin);
  let series = 0;
  let falhas = 0;
  let revogado: string | null = null;

  while (Date.now() < fim && !revogado) {
    const { data: lote, error } = await admin.rpc("google_pegar_fila", { p_limite: LOTE });
    if (error) throw new Error(`google_pegar_fila: ${error.message}`);
    if (!lote?.length) break;

    for (let i = 0; i < lote.length; i += EM_PARALELO) {
      await Promise.all(
        lote.slice(i, i + EM_PARALELO).map(async (item) => {
          try {
            await sincronizarSerie(admin, acesso, calendario, item.serie_id, assinantes, conta.site_url);
            await admin.rpc("google_concluir", { p_serie: item.serie_id, p_pedido_em: item.pedido_em });
            series++;
          } catch (e) {
            falhas++;
            const msg = e instanceof Error ? e.message : String(e);
            if (e instanceof ErroGoogle && e.revogado) revogado = msg;
            console.error(`[google] série ${item.serie_id}:`, msg);
            await admin.rpc("google_falhou", { p_serie: item.serie_id, p_erro: msg });
          }
        }),
      );
    }
  }

  const { count } = await admin.from("google_fila").select("serie_id", { count: "exact", head: true }).lte("proxima_em", new Date().toISOString());
  await admin
    .from("google_conta")
    .update(revogado ? { erro: revogado, erro_em: new Date().toISOString() } : { erro: null, erro_em: null, sincronizada_em: new Date().toISOString() })
    .eq("id", true);
  // Só encadeia outra rodada se esta andou: o que falhou já está adiado pela própria fila.
  return { ok: !revogado, series, falhas, restam: (count ?? 0) > 0 && !revogado && series > 0, ...(revogado ? { erro: revogado } : {}) };
}

/** A agenda "Insper AI · Agenda" da conta. Se alguém a apagou no Google, cria outra e reenvia tudo. */
async function garantirAgenda(admin: Admin, acesso: string, atual: string | null): Promise<string> {
  if (atual && (await agendaExiste(acesso, atual))) return atual;
  const nova = await criarAgenda(acesso);
  await admin.from("google_conta").update({ calendario_id: nova }).eq("id", true);
  await admin.from("google_espelho").delete().not("evento_id", "is", null);
  await admin.rpc("google_enfileirar_tudo");
  return nova;
}

export async function lerAssinantes(admin: Admin): Promise<Assinante[]> {
  const { data: inscricoes, error } = await admin.from("google_inscricoes").select("member_id,email");
  if (error) throw new Error(`google_inscricoes: ${error.message}`);
  if (!inscricoes?.length) return [];
  const { data: membros } = await admin.from("members").select("id,nivel").in("id", inscricoes.map((i) => i.member_id));
  const nivel = new Map((membros ?? []).map((m) => [m.id, m.nivel]));
  return inscricoes.flatMap((i) => (nivel.has(i.member_id) ? [{ member_id: i.member_id, email: i.email, nivel: nivel.get(i.member_id)! }] : []));
}

async function sincronizarSerie(admin: Admin, acesso: string, calendario: string, serieId: string, assinantes: Assinante[], site: string) {
  const [{ data: linhas, error }, { data: espelho, error: erroEspelho }] = await Promise.all([
    admin.from("events").select("*").or(`id.eq.${serieId},series_id.eq.${serieId}`),
    admin.from("google_espelho").select("evento_id,assinatura").eq("serie_id", serieId),
  ]);
  if (error || erroEspelho) throw new Error((error ?? erroEspelho)!.message);

  const mestre = (linhas as EventoRow[]).find((l) => l.id === serieId && !l.series_id);
  const jaEnviados = new Map((espelho ?? []).map((e) => [e.evento_id, e.assinatura]));

  // Série antiga que nunca foi mandada: não vale mandar agora. Se já foi, segue: mudou e precisa
  // ser atualizada (ex.: remarcada para longe ou com o fim puxado para trás).
  if (mestre && !emJanela(mestre, new Date()) && jaEnviados.size === 0) return;

  const planos = mestre ? planejarSerie(linhas as EventoRow[], assinantes, site) : [];
  for (const p of planos) {
    if (jaEnviados.get(p.eventoId) === p.assinatura) continue;
    await gravarEvento(acesso, calendario, p.corpo);
    const { error: e } = await admin
      .from("google_espelho")
      .upsert({ evento_id: p.eventoId, serie_id: serieId, assinatura: p.assinatura, atualizado_em: new Date().toISOString() });
    if (e) throw new Error(e.message);
  }

  // O que está no Google e não deveria mais: série apagada, ocorrência cancelada.
  const desejados = new Set(planos.map((p) => p.eventoId));
  for (const eventoId of jaEnviados.keys()) {
    if (desejados.has(eventoId)) continue;
    await apagarEvento(acesso, calendario, idGoogle(eventoId));
    await admin.from("google_espelho").delete().eq("evento_id", eventoId);
  }
}

/** Pede outra rodada (outra invocação da função) quando o prazo desta acabou com fila. */
export async function pedirOutraRodada(): Promise<void> {
  const admin = supabaseAdmin();
  const { data: conta } = await admin.from("google_conta").select("site_url,segredo").maybeSingle();
  if (!conta) return;
  await fetch(`${conta.site_url}/api/google/sincronizar`, {
    method: "POST",
    headers: { "x-agenda-segredo": conta.segredo },
    cache: "no-store",
    // A rota responde 202 na hora; não deixar quem chamou preso se ela demorar.
    signal: AbortSignal.timeout(5_000),
  }).catch(() => undefined);
}
