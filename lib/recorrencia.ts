import type { TZDate } from "@date-fns/tz";
import { addMonths, addWeeks, endOfDay } from "date-fns";
import { deChaveDia, sp } from "./fuso";
import type { EventoRow, Frequencia } from "./supabase/tipos";

/**
 * Uma ocorrência visível na agenda.
 *
 * - Evento único: `evento` é a própria linha, `mestre` nulo, `virtual` falso.
 * - Ocorrência gerada de uma série: `evento` e `mestre` são a linha mestre,
 *   `virtual` verdadeiro, `originalStart` é o instante desta ocorrência.
 * - Ocorrência editada individualmente (linha filha): `evento` é a filha,
 *   `mestre` é a linha mestre (se foi carregada), `virtual` falso.
 */
export type Ocorrencia = {
  /** Única dentro de um intervalo. Linha real → id; gerada → `${idMestre}_${instante}`. */
  chave: string;
  evento: EventoRow;
  mestre: EventoRow | null;
  /** ISO do instante original da ocorrência dentro da série (nulo em evento único). */
  originalStart: string | null;
  inicio: Date;
  fim: Date;
  virtual: boolean;
};

const LIMITE_ITERACOES = 2000;

function passo(base: TZDate, freq: Frequencia, k: number): TZDate {
  switch (freq) {
    case "semanal":
      return addWeeks(base, k);
    case "quinzenal":
      return addWeeks(base, 2 * k);
    case "mensal":
      return addMonths(base, k);
  }
}

/**
 * Expande as linhas devolvidas por `events_in_range` nas ocorrências que tocam
 * [ini, fim). Puro: mesma entrada, mesma saída. Usado pela UI e pelo download
 * de uma ocorrência em .ics.
 *
 * Regras:
 *  - A aritmética é em horário de parede de SP (19H continua 19H).
 *  - Mensal: meses sem o dia (31 em abril) são pulados, como manda a RFC 5545.
 *  - Uma filha com o mesmo `original_start` substitui a ocorrência gerada;
 *    se estiver cancelada, a ocorrência some.
 *  - `until` é inclusivo e é uma data-calendário de SP.
 */
export function expandir(linhas: EventoRow[], ini: Date, fim: Date): Ocorrencia[] {
  const saida: Ocorrencia[] = [];
  const mestres = new Map<string, EventoRow>();
  const filhasPorSerie = new Map<string, EventoRow[]>();

  for (const l of linhas) {
    if (l.series_id) {
      const lista = filhasPorSerie.get(l.series_id);
      if (lista) lista.push(l);
      else filhasPorSerie.set(l.series_id, [l]);
    } else {
      mestres.set(l.id, l);
    }
  }

  const tIni = ini.getTime();
  const tFim = fim.getTime();
  const toca = (a: number, b: number) => a < tFim && b > tIni;

  for (const m of mestres.values()) {
    const inicioMestre = Date.parse(m.start_at);
    const duracao = Date.parse(m.end_at) - inicioMestre;

    if (!m.freq || !m.until) {
      if (toca(inicioMestre, inicioMestre + duracao)) {
        saida.push({
          chave: m.id,
          evento: m,
          mestre: null,
          originalStart: null,
          inicio: new Date(inicioMestre),
          fim: new Date(inicioMestre + duracao),
          virtual: false,
        });
      }
      continue;
    }

    const substituidas = new Set((filhasPorSerie.get(m.id) ?? []).map((f) => Date.parse(f.original_start!)));
    const base = sp(m.start_at);
    const limite = endOfDay(deChaveDia(m.until)).getTime();

    for (let k = 0; k < LIMITE_ITERACOES; k++) {
      const occ = passo(base, m.freq, k);
      const t = occ.getTime();
      if (t > limite || t >= tFim) break;
      if (m.freq === "mensal" && occ.getDate() !== base.getDate()) continue;
      if (substituidas.has(t)) continue;
      if (t + duracao <= tIni) continue;
      saida.push({
        chave: `${m.id}_${t}`,
        evento: m,
        mestre: m,
        originalStart: new Date(t).toISOString(),
        inicio: new Date(t),
        fim: new Date(t + duracao),
        virtual: true,
      });
    }
  }

  for (const [serieId, filhas] of filhasPorSerie) {
    const mestre = mestres.get(serieId) ?? null;
    for (const f of filhas) {
      if (f.cancelled) continue;
      const a = Date.parse(f.start_at);
      const b = Date.parse(f.end_at);
      if (!toca(a, b)) continue;
      saida.push({
        chave: f.id,
        evento: f,
        mestre,
        originalStart: f.original_start,
        inicio: new Date(a),
        fim: new Date(b),
        virtual: false,
      });
    }
  }

  saida.sort((x, y) => {
    // Dia inteiro antes dos com hora, no mesmo instante de início.
    if (x.inicio.getTime() !== y.inicio.getTime()) return x.inicio.getTime() - y.inicio.getTime();
    if (x.evento.all_day !== y.evento.all_day) return x.evento.all_day ? -1 : 1;
    return x.evento.title.localeCompare(y.evento.title, "pt-BR");
  });
  return saida;
}

/** Verdadeiro se a ocorrência pertence a uma série (gerada ou editada). */
export function ehDeSerie(occ: Ocorrencia): boolean {
  return occ.virtual || occ.evento.series_id !== null;
}

/** A ocorrência ocupa um ou mais dias inteiros (marcado como dia inteiro ou ≥ 24 h). */
export function ocupaDiaInteiro(occ: Ocorrencia): boolean {
  return occ.evento.all_day || occ.fim.getTime() - occ.inicio.getTime() >= 24 * 60 * 60 * 1000;
}
