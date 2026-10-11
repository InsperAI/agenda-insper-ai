import { describe, expect, it } from "vitest";
import { chaveDia, spDe } from "@/lib/fuso";
import { expandir } from "@/lib/recorrencia";
import type { EventoRow } from "@/lib/supabase/tipos";

function linha(p: Partial<EventoRow> & Pick<EventoRow, "id" | "start_at" | "end_at">): EventoRow {
  return {
    title: "Reunião geral",
    category: "reuniao",
    all_day: false,
    location: "",
    link: "",
    description: "",
    freq: null,
    until: null,
    series_id: null,
    original_start: null,
    cancelled: false,
    visibilidade: "diretoria",
    created_by: null,
    updated_by: null,
    created_at: "2026-08-01T12:00:00+00:00",
    updated_at: "2026-08-01T12:00:00+00:00",
    ...p,
  };
}

// Terça 01/09/2026 às 19h (SP) → 22:00Z
const TER_19H = spDe(2026, 9, 1, 19).toISOString();
const TER_20H30 = spDe(2026, 9, 1, 20, 30).toISOString();

const semanal = linha({ id: "s", start_at: TER_19H, end_at: TER_20H30, freq: "semanal", until: "2026-12-15" });
const outubro = { ini: spDe(2026, 10, 1), fim: spDe(2026, 11, 1) };
const dias = (o: ReturnType<typeof expandir>) => o.map((x) => chaveDia(x.inicio));

describe("expandir — séries", () => {
  it("semanal: toda terça de outubro, às 19h de SP", () => {
    const occ = expandir([semanal], outubro.ini, outubro.fim);
    expect(dias(occ)).toEqual(["2026-10-06", "2026-10-13", "2026-10-20", "2026-10-27"]);
    for (const o of occ) {
      expect(o.inicio.toISOString().endsWith("T22:00:00.000Z")).toBe(true);
      expect(o.virtual).toBe(true);
      expect(o.mestre?.id).toBe("s");
    }
  });

  it("respeita o until (inclusivo) e conta 16 ocorrências no total", () => {
    const occ = expandir([semanal], spDe(2026, 1, 1), spDe(2027, 1, 1));
    expect(occ).toHaveLength(16);
    expect(dias(occ).at(-1)).toBe("2026-12-15");
  });

  it("quinzenal: terças alternadas", () => {
    const q = { ...semanal, id: "q", freq: "quinzenal" as const };
    expect(dias(expandir([q], outubro.ini, outubro.fim))).toEqual(["2026-10-13", "2026-10-27"]);
  });

  it("mensal no dia 31 pula os meses curtos", () => {
    const m = linha({ id: "m", start_at: spDe(2026, 1, 31, 10).toISOString(), end_at: spDe(2026, 1, 31, 11).toISOString(), freq: "mensal", until: "2026-06-30" });
    expect(dias(expandir([m], spDe(2026, 1, 1), spDe(2027, 1, 1)))).toEqual(["2026-01-31", "2026-03-31", "2026-05-31"]);
  });

  it("ocorrência cancelada some; ocorrência movida aparece no novo horário e não no antigo", () => {
    const cancelada = linha({
      id: "c",
      series_id: "s",
      original_start: spDe(2026, 10, 13, 19).toISOString(),
      start_at: spDe(2026, 10, 13, 19).toISOString(),
      end_at: spDe(2026, 10, 13, 20, 30).toISOString(),
      cancelled: true,
    });
    const movida = linha({
      id: "v",
      title: "Reunião geral (adiada)",
      series_id: "s",
      original_start: spDe(2026, 10, 20, 19).toISOString(),
      start_at: spDe(2026, 10, 21, 19).toISOString(),
      end_at: spDe(2026, 10, 21, 20).toISOString(),
    });
    const occ = expandir([semanal, cancelada, movida], outubro.ini, outubro.fim);
    expect(dias(occ)).toEqual(["2026-10-06", "2026-10-21", "2026-10-27"]);
    const dia21 = occ.find((o) => chaveDia(o.inicio) === "2026-10-21")!;
    expect(dia21.virtual).toBe(false);
    expect(dia21.evento.id).toBe("v");
    expect(dia21.mestre?.id).toBe("s");
  });

  it("evento único entra só se tocar o intervalo", () => {
    const u = linha({ id: "u", start_at: spDe(2026, 9, 30, 23).toISOString(), end_at: spDe(2026, 10, 1, 1).toISOString() });
    expect(expandir([u], outubro.ini, outubro.fim)).toHaveLength(1);
    expect(expandir([u], spDe(2026, 10, 2), outubro.fim)).toHaveLength(0);
  });

  it("ordena por início, dia inteiro primeiro", () => {
    const a = linha({ id: "a", title: "B", start_at: spDe(2026, 10, 5, 9).toISOString(), end_at: spDe(2026, 10, 5, 10).toISOString() });
    const b = linha({ id: "b", title: "A", all_day: true, start_at: spDe(2026, 10, 5).toISOString(), end_at: spDe(2026, 10, 6).toISOString() });
    const c = linha({ id: "c", title: "C", start_at: spDe(2026, 10, 4, 9).toISOString(), end_at: spDe(2026, 10, 4, 10).toISOString() });
    expect(expandir([a, b, c], outubro.ini, outubro.fim).map((o) => o.evento.id)).toEqual(["c", "b", "a"]);
  });
});
