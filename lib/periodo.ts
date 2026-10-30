import { addDays, addMonths, addWeeks } from "date-fns";
import { gradeDoMes, inicioDaSemana, inicioDoDia, inicioDoMes } from "./fuso";
import type { Vista } from "./url";

/** Dias carregados em "Próximos". */
const DIAS_PROXIMOS = 60;

export type Intervalo = { ini: Date; fim: Date };

/**
 * Intervalo [ini, fim) de eventos a buscar para uma vista. Mês e semana pegam
 * uma semana de folga de cada lado (a animação de troca mostra as bordas).
 */
export function intervaloDaVista(vista: Vista, ancora: Date, agora: Date = new Date()): Intervalo {
  if (vista === "mes") {
    const grade = gradeDoMes(ancora);
    return { ini: addDays(grade[0], -7), fim: addDays(grade[41], 8) };
  }
  if (vista === "semana") {
    const ini = inicioDaSemana(ancora);
    return { ini: addDays(ini, -7), fim: addDays(ini, 14) };
  }
  const ini = inicioDoDia(agora);
  return { ini, fim: addDays(ini, DIAS_PROXIMOS) };
}

/** Âncora do período seguinte (delta 1) ou anterior (-1); null em "Próximos". */
export function ancoraVizinha(vista: Vista, ancora: Date, delta: number): Date | null {
  if (vista === "mes") return addMonths(inicioDoMes(ancora), delta);
  if (vista === "semana") return addWeeks(inicioDaSemana(ancora), delta);
  return null;
}
