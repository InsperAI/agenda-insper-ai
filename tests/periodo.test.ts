import { describe, expect, it } from "vitest";
import { criarCache } from "@/lib/cache";
import { chaveDia, spDe } from "@/lib/fuso";
import { ancoraVizinha, intervaloDaVista } from "@/lib/periodo";

const dia = (d: Date) => chaveDia(d);

describe("intervaloDaVista", () => {
  it("mês: grade de 6 semanas com uma semana de folga de cada lado", () => {
    // Out/2026: grade começa seg 28/09 e termina dom 08/11.
    const { ini, fim } = intervaloDaVista("mes", spDe(2026, 10, 15));
    expect(dia(ini)).toBe("2026-09-21");
    expect(dia(fim)).toBe("2026-11-16");
  });

  it("semana: a semana com uma de folga de cada lado", () => {
    const { ini, fim } = intervaloDaVista("semana", spDe(2026, 10, 29));
    expect(dia(ini)).toBe("2026-10-19");
    expect(dia(fim)).toBe("2026-11-09");
  });

  it("próximos: 60 dias a partir de hoje, ignorando a âncora", () => {
    const { ini, fim } = intervaloDaVista("proximos", spDe(2020, 1, 1), spDe(2026, 10, 29, 15));
    expect(dia(ini)).toBe("2026-10-29");
    expect(dia(fim)).toBe("2026-12-28");
  });
});

describe("ancoraVizinha", () => {
  it("mês: primeiro dia do mês seguinte/anterior", () => {
    expect(dia(ancoraVizinha("mes", spDe(2026, 10, 15), 1)!)).toBe("2026-11-01");
    expect(dia(ancoraVizinha("mes", spDe(2026, 10, 15), -1)!)).toBe("2026-09-01");
  });

  it("semana: segunda-feira da semana seguinte/anterior", () => {
    expect(dia(ancoraVizinha("semana", spDe(2026, 10, 29), 1)!)).toBe("2026-11-02");
    expect(dia(ancoraVizinha("semana", spDe(2026, 10, 29), -1)!)).toBe("2026-10-19");
  });

  it("próximos não tem vizinhos", () => {
    expect(ancoraVizinha("proximos", spDe(2026, 10, 29), 1)).toBeNull();
  });
});

describe("criarCache", () => {
  it("guarda e devolve valores", () => {
    const c = criarCache<number>(3);
    c.guardar("a", 1);
    expect(c.ler("a")).toBe(1);
    expect(c.ler("b")).toBeUndefined();
  });

  it("descarta o menos usado quando passa do limite", () => {
    const c = criarCache<number>(2);
    c.guardar("a", 1);
    c.guardar("b", 2);
    c.ler("a"); // "a" fica mais recente que "b"
    c.guardar("c", 3);
    expect(c.ler("b")).toBeUndefined();
    expect(c.ler("a")).toBe(1);
    expect(c.ler("c")).toBe(3);
  });

  it("limpar esvazia tudo", () => {
    const c = criarCache<number>(2);
    c.guardar("a", 1);
    c.limpar();
    expect(c.ler("a")).toBeUndefined();
  });
});
