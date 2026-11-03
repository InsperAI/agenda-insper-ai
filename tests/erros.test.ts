import { describe, expect, it } from "vitest";
import { ehFalhaDeRede, SEM_CONEXAO } from "@/lib/erros";

describe("ehFalhaDeRede", () => {
  it("reconhece as mensagens de rede de cada navegador", () => {
    expect(ehFalhaDeRede("TypeError: Failed to fetch")).toBe(true); // Chrome
    expect(ehFalhaDeRede("NetworkError when attempting to fetch resource.")).toBe(true); // Firefox
    expect(ehFalhaDeRede("Load failed")).toBe(true); // Safari / iPhone
    expect(ehFalhaDeRede("fetch failed")).toBe(true); // Node
  });

  it("não confunde erro do banco com falta de conexão", () => {
    expect(ehFalhaDeRede("new row violates row-level security policy")).toBe(false);
    expect(ehFalhaDeRede("")).toBe(false);
  });

  it("tem uma mensagem pronta em português", () => {
    expect(SEM_CONEXAO).toMatch(/conexão/);
  });
});

describe("tradutores de erro", () => {
  it("todos trocam falha de rede pela mensagem de sem conexão", async () => {
    const { traduzirErroLogin } = await import("@/lib/login");
    const { traduzirErroMembro } = await import("@/lib/membros");
    const { traduzirErroVotacao } = await import("@/lib/votacao");
    for (const traduzir of [traduzirErroLogin, traduzirErroMembro, traduzirErroVotacao]) {
      expect(traduzir("Load failed")).toBe(SEM_CONEXAO);
    }
  });
});
