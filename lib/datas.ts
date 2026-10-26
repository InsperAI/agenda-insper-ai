import { addDays, differenceInCalendarDays } from "date-fns";
import { agoraSP, mesmoDia, sp } from "./fuso";

/**
 * Formatos do playbook (§09 · Convenções fixas), em cima de instantes vistos em SP.
 *
 *   Data curta     19/08
 *   Período        19/08 — 20/08   (travessão com espaços, nunca hífen)
 *   Hora           19h · 19h30     (h minúsculo, sem espaço)
 */

export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
export const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
export const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
/** Cabeçalho da grade, começando na segunda. */
export const DIAS_SEMANA_GRADE = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

const dois = (n: number) => String(n).padStart(2, "0");
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** 19h · 19h30 */
export function hora(d: Date): string {
  const t = sp(d);
  const h = t.getHours();
  const m = t.getMinutes();
  return m ? `${h}h${dois(m)}` : `${h}h`;
}

/** 19/08 */
export function dataCurta(d: Date): string {
  const t = sp(d);
  return `${dois(t.getDate())}/${dois(t.getMonth() + 1)}`;
}

/** 19/08/2026 */
export function dataComAno(d: Date): string {
  return `${dataCurta(d)}/${sp(d).getFullYear()}`;
}

/** quinta-feira */
export function diaSemana(d: Date): string {
  return DIAS[sp(d).getDay()];
}

/** qui */
export function diaSemanaCurto(d: Date): string {
  return DIAS_CURTOS[sp(d).getDay()];
}

/** 19 de agosto de 2026 */
export function dataPorExtenso(d: Date): string {
  const t = sp(d);
  return `${t.getDate()} de ${MESES[t.getMonth()]} de ${t.getFullYear()}`;
}

/** quinta-feira, 19 de agosto */
export function diaPorExtenso(d: Date): string {
  const t = sp(d);
  return `${DIAS[t.getDay()]}, ${t.getDate()} de ${MESES[t.getMonth()]}`;
}

/** Outubro de 2026 */
export function tituloMes(d: Date): string {
  const t = sp(d);
  return `${capitalizar(MESES[t.getMonth()])} de ${t.getFullYear()}`;
}

/** 5 — 11 de outubro de 2026 · 28 de set — 4 de out de 2026 */
export function tituloSemana(inicioSemana: Date): string {
  const a = sp(inicioSemana);
  const b = addDays(a, 6);
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()} — ${b.getDate()} de ${MESES[a.getMonth()]} de ${b.getFullYear()}`;
  }
  return `${a.getDate()} de ${MESES_CURTOS[a.getMonth()]} — ${b.getDate()} de ${MESES_CURTOS[b.getMonth()]} de ${b.getFullYear()}`;
}

/** Hoje · Amanhã · quarta-feira, 8 de out */
export function rotuloDia(d: Date, hoje: Date = agoraSP()): string {
  const diff = differenceInCalendarDays(sp(d), sp(hoje));
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  const t = sp(d);
  return `${DIAS[t.getDay()]}, ${t.getDate()} de ${MESES_CURTOS[t.getMonth()]}`;
}

/**
 * Faixa de horário de uma ocorrência.
 *   Dia inteiro (um dia)      → "Dia inteiro"
 *   Dia inteiro (vários dias) → "19/08 — 21/08"
 *   Mesmo dia                 → "19h — 20h30"
 *   Vira o dia                → "19/08 19h — 20/08 2h"
 */
export function faixaHorario(inicio: Date, fim: Date, diaInteiro: boolean): string {
  if (diaInteiro) {
    const ultimo = addDays(sp(fim), -1); // fim é exclusivo
    return mesmoDia(inicio, ultimo) ? "Dia inteiro" : `${dataCurta(inicio)} — ${dataCurta(ultimo)}`;
  }
  const fimMeiaNoiteSeguinte = sp(fim).getHours() === 0 && sp(fim).getMinutes() === 0 && mesmoDia(addDays(sp(fim), -1), inicio);
  if (mesmoDia(inicio, fim) || fimMeiaNoiteSeguinte) return `${hora(inicio)} — ${fimMeiaNoiteSeguinte ? "24h" : hora(fim)}`;
  return `${dataCurta(inicio)} ${hora(inicio)} — ${dataCurta(fim)} ${hora(fim)}`;
}

/** Linha completa para o painel: "quarta-feira, 7 de outubro · 19h — 20h30". */
export function linhaQuando(inicio: Date, fim: Date, diaInteiro: boolean): string {
  const faixa = faixaHorario(inicio, fim, diaInteiro);
  if (diaInteiro && faixa !== "Dia inteiro") return faixa;
  return `${diaPorExtenso(inicio)} · ${faixa}`;
}

/** "19/08/2026 às 19H30" — para auditoria. */
export function dataHoraCurta(d: Date): string {
  return `${dataComAno(d)} às ${hora(d)}`;
}

/** Fim do semestre letivo em que `d` cai: 30/06 ou 20/12. */
export function fimDoSemestre(d: Date): string {
  const t = sp(d);
  return t.getMonth() < 6 ? `${t.getFullYear()}-06-30` : `${t.getFullYear()}-12-20`;
}
