import { describe, expect, it } from "vitest";
import { alternarPublico, ehNivel, frasePublico, podeEditar, podeVer, visiveisPara } from "@/lib/niveis";
import type { Nivel, NivelPublico } from "@/lib/supabase/tipos";

describe("podeVer", () => {
  const casos: [Nivel, NivelPublico[], boolean][] = [
    ["diretoria", [], true],
    ["diretoria", ["trainee"], true],
    ["membro", [], false],
    ["membro", ["membro"], true],
    ["membro", ["trainee"], false],
    ["membro", ["membro", "trainee"], true],
    ["trainee", [], false],
    ["trainee", ["membro"], false],
    ["trainee", ["trainee"], true],
    ["trainee", ["membro", "trainee"], true],
  ];
  it.each(casos)("%s vendo evento com público %j → %s", (nivel, publico, esperado) => {
    expect(podeVer(nivel, publico)).toBe(esperado);
  });
});

describe("visiveisPara (feed .ics)", () => {
  const linhas: { id: string; publico: NivelPublico[] }[] = [
    { id: "so-diretoria", publico: [] },
    { id: "membros", publico: ["membro"] },
    { id: "trainees", publico: ["trainee"] },
    { id: "todos", publico: ["membro", "trainee"] },
  ];

  it("trainee não vê o que é só de membros, e vice-versa", () => {
    expect(visiveisPara(linhas, "trainee").map((l) => l.id)).toEqual(["trainees", "todos"]);
    expect(visiveisPara(linhas, "membro").map((l) => l.id)).toEqual(["membros", "todos"]);
  });

  it("diretoria recebe tudo", () => {
    expect(visiveisPara(linhas, "diretoria")).toHaveLength(4);
  });
});

describe("frasePublico", () => {
  it("descreve cada combinação", () => {
    expect(frasePublico([])).toBe("só a diretoria");
    expect(frasePublico(["membro"])).toBe("diretoria e membros");
    expect(frasePublico(["trainee"])).toBe("diretoria e trainees");
    expect(frasePublico(["trainee", "membro"])).toBe("diretoria, membros e trainees");
  });
});

describe("alternarPublico", () => {
  it("liga e desliga mantendo a ordem membro, trainee", () => {
    expect(alternarPublico([], "trainee")).toEqual(["trainee"]);
    expect(alternarPublico(["trainee"], "membro")).toEqual(["membro", "trainee"]);
    expect(alternarPublico(["membro", "trainee"], "membro")).toEqual(["trainee"]);
  });

  it("não altera a lista original", () => {
    const original: NivelPublico[] = ["membro"];
    alternarPublico(original, "trainee");
    expect(original).toEqual(["membro"]);
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
