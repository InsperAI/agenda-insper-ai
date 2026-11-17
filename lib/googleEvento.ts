import { createHash } from "node:crypto";
import { addDays, addMonths, endOfDay, format } from "date-fns";
import { CATEGORIA } from "./categorias";
import { FUSO, deChaveDia, sp } from "./fuso";
import { propData, rrule } from "./ics";
import { podeVer } from "./niveis";
import type { EventoRow, Nivel } from "./supabase/tipos";

/**
 * Como uma série da agenda vira eventos no Google Agenda da Insper AI (0014).
 * Lógica pura: quem fala com o Google é lib/google/sincronizar.ts.
 *
 *   mestre (único ou série) → 1 evento do Google, id = uuid sem hífens,
 *                             RRULE + um EXDATE por filha (cancelada ou editada)
 *   filha editada            → 1 evento avulso, id = uuid da filha sem hífens
 *   filha cancelada          → só o EXDATE no mestre
 *
 * Ids próprios (o Google aceita base32hex, e hex é um subconjunto) deixam o
 * envio idempotente: mandar de novo atualiza em vez de duplicar.
 */

export type Assinante = { member_id: string; email: string; nivel: Nivel };

type Quando = { dateTime: string; timeZone: string } | { date: string };

export type CorpoGoogle = {
  id: string;
  status: "confirmed";
  summary: string;
  description: string;
  location: string;
  start: Quando;
  end: Quando;
  recurrence?: string[];
  attendees: { email: string; responseStatus?: string }[];
  guestsCanSeeOtherGuests: false;
  guestsCanInviteOthers: false;
  guestsCanModify: false;
  source?: { title: string; url: string };
  extendedProperties: { private: { agendaEvento: string } };
};

export type Plano = { eventoId: string; corpo: CorpoGoogle; assinatura: string };

export const idGoogle = (uuid: string) => uuid.replace(/-/g, "").toLowerCase();

/** E-mails Google de quem pode ver a linha: a diretoria sempre, os outros pelo público ou por convite. */
export function convidadosDe(e: Pick<EventoRow, "publico" | "convidados">, assinantes: readonly Assinante[]): string[] {
  const emails = assinantes.filter((a) => podeVer(a.nivel, e.publico) || e.convidados.includes(a.member_id)).map((a) => a.email.trim().toLowerCase());
  return [...new Set(emails)].sort();
}

function quando(d: Date, diaInteiro: boolean): Quando {
  return diaInteiro ? { date: format(sp(d), "yyyy-MM-dd") } : { dateTime: format(sp(d), "yyyy-MM-dd'T'HH:mm:ss"), timeZone: FUSO };
}

function corpo(e: EventoRow, inicio: Date, fim: Date, assinantes: readonly Assinante[], site: string, recurrence?: string[]): CorpoGoogle {
  const endereco = `${site}/agenda?v=semana&d=${format(sp(inicio), "yyyy-MM-dd")}`;
  const descricao = [e.description.trim(), e.link ? `Link: ${e.link}` : "", `${CATEGORIA[e.category].singular} · Agenda Insper AI: ${endereco}`].filter(Boolean).join("\n\n");
  return {
    id: idGoogle(e.id),
    status: "confirmed",
    summary: e.title,
    description: descricao,
    location: e.location,
    start: quando(inicio, e.all_day),
    end: quando(fim, e.all_day),
    ...(recurrence ? { recurrence } : {}),
    attendees: convidadosDe(e, assinantes).map((email) => ({ email })),
    // A lista de convidados é a agenda inteira de um nível: ninguém precisa vê-la nem mexer nela.
    guestsCanSeeOtherGuests: false,
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    ...(/^https:\/\//.test(site) ? { source: { title: "Agenda Insper AI", url: endereco } } : {}),
    extendedProperties: { private: { agendaEvento: e.id } },
  };
}

function assinar(c: CorpoGoogle): string {
  return createHash("sha256").update(JSON.stringify(c)).digest("hex");
}

/** Todas as linhas de UMA série (mestre + filhas) → o que deve existir no Google. */
export function planejarSerie(linhas: readonly EventoRow[], assinantes: readonly Assinante[], site: string): Plano[] {
  const mestre = linhas.find((l) => !l.series_id);
  if (!mestre) return [];
  const filhas = linhas.filter((l) => l.series_id === mestre.id).sort((a, b) => Date.parse(a.original_start!) - Date.parse(b.original_start!));

  const regra = rrule(mestre);
  const recurrence = regra ? [regra, ...filhas.map((f) => propData("EXDATE", new Date(f.original_start!), mestre.all_day))] : undefined;

  const corpos = [corpo(mestre, new Date(mestre.start_at), new Date(mestre.end_at), assinantes, site, recurrence)];
  for (const f of filhas) {
    if (!f.cancelled) corpos.push(corpo(f, new Date(f.start_at), new Date(f.end_at), assinantes, site));
  }
  return corpos.map((c) => ({ eventoId: c.extendedProperties.private.agendaEvento, corpo: c, assinatura: assinar(c) }));
}

export type Reenvio = { sem: CorpoGoogle; com: Plano };

/**
 * "Reenviar convites": o Google só decide se põe um convite na agenda da pessoa
 * quando ela ENTRA como convidada. Quem mudou a configuração "Adicionar convites
 * à minha agenda" depois de ativar precisa sair e entrar de novo. Para cada evento
 * da série em que `email` é convidado: o corpo sem ela e o plano normal (com ela).
 */
export function planejarReenvio(linhas: readonly EventoRow[], assinantes: readonly Assinante[], email: string, site: string): Reenvio[] {
  const alvo = email.trim().toLowerCase();
  const outros = assinantes.filter((a) => a.email.trim().toLowerCase() !== alvo);
  const semEla = new Map(planejarSerie(linhas, outros, site).map((p) => [p.eventoId, p.corpo]));
  return planejarSerie(linhas, assinantes, site)
    .filter((p) => p.corpo.attendees.some((a) => a.email === alvo))
    .map((com) => ({ sem: semEla.get(com.eventoId)!, com }));
}

/**
 * O que vale mandar: séries que não acabaram há mais de 30 dias e começam nos
 * próximos 18 meses (a mesma janela do feed .ics, mais curta no passado).
 */
export function emJanela(mestre: Pick<EventoRow, "start_at" | "end_at" | "freq" | "until">, agora: Date): boolean {
  const fim = mestre.freq && mestre.until ? endOfDay(deChaveDia(mestre.until)) : new Date(mestre.end_at);
  return fim.getTime() > addDays(agora, -30).getTime() && Date.parse(mestre.start_at) < addMonths(agora, 18).getTime();
}
