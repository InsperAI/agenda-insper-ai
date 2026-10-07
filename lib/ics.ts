import { endOfDay, format } from "date-fns";
import { CATEGORIA } from "./categorias";
import { FUSO, deChaveDia, sp } from "./fuso";
import type { Ocorrencia } from "./recorrencia";
import type { EventoRow } from "./supabase/tipos";

/**
 * Serializador iCalendar (RFC 5545) escrito à mão: precisamos de RRULE, EXDATE
 * e RECURRENCE-ID com TZID, que as bibliotecas pequenas não cobrem bem.
 *
 * Mapeamento do banco → iCal:
 *   mestre único            → VEVENT
 *   mestre com freq/until   → VEVENT + RRULE + um EXDATE por filha cancelada
 *   filha editada           → VEVENT separado, MESMO UID, RECURRENCE-ID = original_start
 */

const CRLF = "\r\n";
const DOMINIO = "agenda.insperai";
const codificador = new TextEncoder();
const dois = (n: number) => String(n).padStart(2, "0");

export function escapar(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Dobra em linhas de no máximo 75 octetos (a continuação começa com um espaço). */
export function dobrar(linha: string): string {
  const partes: string[] = [];
  let atual = "";
  let bytes = 0;
  let limite = 75;
  for (const ch of linha) {
    const n = codificador.encode(ch).length;
    if (bytes + n > limite) {
      partes.push(atual);
      atual = "";
      bytes = 0;
      limite = 74;
    }
    atual += ch;
    bytes += n;
  }
  partes.push(atual);
  return partes.join(`${CRLF} `);
}

const fmtLocal = (d: Date) => format(sp(d), "yyyyMMdd'T'HHmmss");
const fmtData = (d: Date) => format(sp(d), "yyyyMMdd");
const fmtUtc = (d: Date) =>
  `${d.getUTCFullYear()}${dois(d.getUTCMonth() + 1)}${dois(d.getUTCDate())}T${dois(d.getUTCHours())}${dois(d.getUTCMinutes())}${dois(d.getUTCSeconds())}Z`;

function propData(nome: string, d: Date, diaInteiro: boolean): string {
  return diaInteiro ? `${nome};VALUE=DATE:${fmtData(d)}` : `${nome};TZID=${FUSO}:${fmtLocal(d)}`;
}

// O Brasil não tem horário de verão desde 2019: um único bloco STANDARD basta.
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${FUSO}`,
  "BEGIN:STANDARD",
  "DTSTART:19700101T000000",
  "TZOFFSETFROM:-0300",
  "TZOFFSETTO:-0300",
  "TZNAME:-03",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function rrule(m: EventoRow): string | null {
  if (!m.freq || !m.until) return null;
  const limite = endOfDay(deChaveDia(m.until));
  // UNTIL tem de ter o mesmo tipo de valor de DTSTART: DATE para dia inteiro, UTC caso contrário.
  const until = m.all_day ? fmtData(limite) : fmtUtc(limite);
  switch (m.freq) {
    case "semanal":
      return `RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=${until}`;
    case "quinzenal":
      return `RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=${until}`;
    case "mensal":
      return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${sp(m.start_at).getDate()};UNTIL=${until}`;
  }
}

type OpcoesVevent = {
  uid: string;
  inicio: Date;
  fim: Date;
  recurrenceId?: Date | null;
  rrule?: string | null;
  exdates?: Date[];
};

function vevent(e: EventoRow, o: OpcoesVevent, agora: Date): string[] {
  const linhas = [
    "BEGIN:VEVENT",
    `UID:${o.uid}`,
    `DTSTAMP:${fmtUtc(agora)}`,
    `SEQUENCE:${Math.max(0, Math.floor(Date.parse(e.updated_at) / 1000) - 1_700_000_000)}`,
    propData("DTSTART", o.inicio, e.all_day),
    propData("DTEND", o.fim, e.all_day),
    `SUMMARY:${escapar(e.title)}`,
    `CATEGORIES:${escapar(CATEGORIA[e.category].rotulo)}`,
  ];
  if (o.recurrenceId) linhas.push(propData("RECURRENCE-ID", o.recurrenceId, e.all_day));
  if (o.rrule) linhas.push(o.rrule);
  for (const x of o.exdates ?? []) linhas.push(propData("EXDATE", x, e.all_day));
  if (e.location) linhas.push(`LOCATION:${escapar(e.location)}`);
  if (e.link) linhas.push(`URL:${e.link}`);
  if (e.description) linhas.push(`DESCRIPTION:${escapar(e.description)}`);
  linhas.push("END:VEVENT");
  return linhas;
}

function envolver(nome: string, corpo: string[]): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Insper AI//Agenda da Diretoria//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapar(nome)}`,
    `X-WR-TIMEZONE:${FUSO}`,
    ...VTIMEZONE,
    ...corpo,
    "END:VCALENDAR",
  ];
  return linhas.map(dobrar).join(CRLF) + CRLF;
}

const uid = (id: string) => `${id}@${DOMINIO}`;

/** O feed completo: todas as linhas que `events_in_range` devolveu para a janela do feed. */
export function serializarCalendario(linhas: EventoRow[], nome = "Insper AI · Diretoria", agora = new Date()): string {
  const corpo: string[] = [];
  const mestres = linhas.filter((l) => !l.series_id);
  const filhas = linhas.filter((l) => l.series_id);
  const idsMestres = new Set(mestres.map((m) => m.id));

  for (const m of mestres) {
    const minhas = filhas.filter((f) => f.series_id === m.id);
    const exdates = minhas.filter((f) => f.cancelled).map((f) => new Date(f.original_start!));
    corpo.push(...vevent(m, { uid: uid(m.id), inicio: new Date(m.start_at), fim: new Date(m.end_at), rrule: rrule(m), exdates }, agora));
    for (const f of minhas) {
      if (f.cancelled) continue;
      corpo.push(
        ...vevent(f, { uid: uid(m.id), inicio: new Date(f.start_at), fim: new Date(f.end_at), recurrenceId: new Date(f.original_start!) }, agora),
      );
    }
  }

  // Filha cujo mestre não veio (não deveria acontecer com events_in_range, mas não perdemos o evento).
  for (const f of filhas) {
    if (f.cancelled || idsMestres.has(f.series_id!)) continue;
    corpo.push(...vevent(f, { uid: uid(f.id), inicio: new Date(f.start_at), fim: new Date(f.end_at) }, agora));
  }

  return envolver(nome, corpo);
}

/** Um único VEVENT para "baixar .ics" de uma ocorrência (sem recorrência). */
export function serializarOcorrencia(occ: Ocorrencia, agora = new Date()): string {
  const id = occ.virtual ? `${occ.evento.id}_${occ.inicio.getTime()}` : occ.evento.id;
  return envolver(occ.evento.title, vevent(occ.evento, { uid: uid(id), inicio: occ.inicio, fim: occ.fim }, agora));
}
