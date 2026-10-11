import { describe, expect, it } from "vitest";
import { ehNivel, podeEditar, podeVer, visiveisPara } from "@/lib/niveis";
import type { Nivel } from "@/lib/supabase/tipos";

describe("podeVer", () => {
  const casos: [Nivel, Nivel, boolean][] = [
    ["diretoria", "diretoria", true],
    ["diretoria", "membro", true],
    ["diretoria", "trainee", true],
    ["membro", "diretoria", false],
    ["membro", "membro", true],
    ["membro", "trainee", true],
    ["trainee", "diretoria", false],
    ["trainee", "membro", false],
    ["trainee", "trainee", true],
  ];
  it.each(casos)("%s vendo evento de visibilidade %s → %s", (nivel, visibilidade, esperado) => {
    expect(podeVer(nivel, visibilidade)).toBe(esperado);
  });
});

describe("podeEditar", () => {
  it("só a diretoria edita", () => {
    expect(podeEditar("diretoria")).toBe(true);
    expect(podeEditar("membro")).toBe(false);
    expect(podeEditar("trainee")).toBe(false);
  });
});

describe("ehNivel", () => {
  it("reconhece só os três níveis", () => {
    expect(ehNivel("membro")).toBe(true);
    expect(ehNivel("admin")).toBe(false);
    expect(ehNivel("toString")).toBe(false);
  });
});

describe("visiveisPara (feed .ics)", () => {
  const linhas = [
    { id: "a", visibilidade: "diretoria" as const },
    { id: "b", visibilidade: "membro" as const },
    { id: "c", visibilidade: "trainee" as const },
  ];

  it("trainee só recebe eventos liberados para todos", () => {
    expect(visiveisPara(linhas, "trainee").map((l) => l.id)).toEqual(["c"]);
  });

  it("membro recebe membros e todos; diretoria recebe tudo", () => {
    expect(visiveisPara(linhas, "membro").map((l) => l.id)).toEqual(["b", "c"]);
    expect(visiveisPara(linhas, "diretoria").map((l) => l.id)).toEqual(["a", "b", "c"]);
  });
});
