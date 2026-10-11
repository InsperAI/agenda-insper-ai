import { describe, expect, it } from "vitest";
import { atributoTema, lerTema } from "@/lib/tema";

describe("lerTema", () => {
  it("aceita claro e escuro", () => {
    expect(lerTema("claro")).toBe("claro");
    expect(lerTema("escuro")).toBe("escuro");
  });

  it("cai para sistema quando o cookie falta ou é inválido", () => {
    expect(lerTema(undefined)).toBe("sistema");
    expect(lerTema("")).toBe("sistema");
    expect(lerTema("dark")).toBe("sistema");
    expect(lerTema("sistema")).toBe("sistema");
  });
});

describe("atributoTema", () => {
  it("mapeia para o data-theme do <html>", () => {
    expect(atributoTema("claro")).toBe("light");
    expect(atributoTema("escuro")).toBe("dark");
    expect(atributoTema("sistema")).toBeUndefined();
  });
});
