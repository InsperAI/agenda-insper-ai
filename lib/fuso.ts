import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";

/**
 * Tudo que é "dia" ou "hora de relógio" na agenda é em São Paulo, não importa
 * onde o navegador esteja. `TZDate` carrega o fuso junto com o instante, e as
 * funções do date-fns v4 preservam a classe — então addDays/startOfWeek operam
 * em horário de parede de SP.
 */
export const FUSO = "America/Sao_Paulo";
/** Segunda-feira. */
export const INICIO_SEMANA = 1 as const;

/** Mesmo instante, visto em São Paulo. */
export function sp(d: Date | string | number = Date.now()): TZDate {
  if (d instanceof Date) return new TZDate(d, FUSO);
  if (typeof d === "string") return new TZDate(d, FUSO);
  return new TZDate(d, FUSO);
}

export function agoraSP(): TZDate {
  return TZDate.tz(FUSO);
}

/** Horário de parede em SP → instante. `mes1` é 1–12. */
export function spDe(ano: number, mes1: number, dia: number, h = 0, min = 0): TZDate {
  return new TZDate(ano, mes1 - 1, dia, h, min, 0, 0, FUSO);
}

/** "2026-10-07" — a data-calendário de SP do instante. */
export function chaveDia(d: Date): string {
  return format(sp(d), "yyyy-MM-dd");
}

/** "2026-10-07" → meia-noite de SP desse dia. */
export function deChaveDia(chave: string): TZDate {
  const [y, m, d] = chave.split("-").map(Number);
  return spDe(y, m, d);
}

export function inicioDoDia(d: Date): TZDate {
  return startOfDay(sp(d));
}

export function inicioDaSemana(d: Date): TZDate {
  return startOfWeek(sp(d), { weekStartsOn: INICIO_SEMANA });
}

export function inicioDoMes(d: Date): TZDate {
  return startOfMonth(sp(d));
}

/** As 42 células (6 semanas) da grade do mês, começando na segunda. */
export function gradeDoMes(d: Date): TZDate[] {
  const ini = startOfWeek(startOfMonth(sp(d)), { weekStartsOn: INICIO_SEMANA });
  return Array.from({ length: 42 }, (_, i) => addDays(ini, i));
}

/** Para <input type="datetime-local">: "2026-10-07T19:00" em SP. */
export function paraInputDataHora(d: Date): string {
  return format(sp(d), "yyyy-MM-dd'T'HH:mm");
}

/** Para <input type="date">: "2026-10-07" em SP. */
export function paraInputData(d: Date): string {
  return format(sp(d), "yyyy-MM-dd");
}

/** Inverso de paraInputDataHora. Aceita também só a data ("2026-10-07"). Inválido → NaN. */
export function deInputDataHora(s: string): TZDate {
  const [data = "", hora = "00:00"] = s.split("T");
  const [y, m, d] = data.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return new TZDate(NaN, FUSO);
  return spDe(y, m, d, hh, mm);
}

export function mesmoDia(a: Date, b: Date): boolean {
  return chaveDia(a) === chaveDia(b);
}
