import { describe, expect, it } from "vitest";
import { maisAntigosPrimeiro, mensagemReenvio, precisaReconvite } from "@/lib/reenvio";

describe("mensagemReenvio", () => {
  it("conta os convites reenviados", () => {
    expect(mensagemReenvio(200, { eventos: 12, faltaram: 0, falhas: 0 })).toBe("Pronto: 12 convites reenviados. Confira o Google Agenda em instantes.");
    expect(mensagemReenvio(200, { eventos: 1, faltaram: 0, falhas: 0 })).toBe("Pronto: 1 convite reenviado. Confira o Google Agenda em instantes.");
  });

  it("avisa quando não deu tempo de reenviar tudo ou algum falhou", () => {
    expect(mensagemReenvio(200, { eventos: 30, faltaram: 8, falhas: 0 })).toBe("Reenviamos 30 convites e faltaram 8. Toque de novo daqui a 2 minutos.");
    expect(mensagemReenvio(200, { eventos: 5, faltaram: 0, falhas: 2 })).toBe("Reenviamos 5 convites e faltaram 2. Toque de novo daqui a 2 minutos.");
  });

  it("nada a reenviar", () => {
    expect(mensagemReenvio(200, { eventos: 0, faltaram: 0, falhas: 0 })).toBe("Não há eventos seus no Google Agenda para reenviar agora.");
  });

  it("traduz os erros do servidor", () => {
    expect(mensagemReenvio(429, null)).toBe("Você acabou de ativar ou reenviar. Espere 2 minutos e tente de novo.");
    expect(mensagemReenvio(404, null)).toBe("Ative o Google Agenda · na hora primeiro.");
    expect(mensagemReenvio(502, null)).toBe("Não deu para falar com o Google agora. Tente de novo em alguns minutos.");
    expect(mensagemReenvio(500, null)).toBe("Não deu para reenviar. Tente de novo em alguns minutos.");
  });
});

describe("precisaReconvite", () => {
  it("só reenvia evento que ainda existe no Google e que a pessoa não respondeu", () => {
    expect(precisaReconvite(true, undefined)).toBe(true);
    expect(precisaReconvite(true, "needsAction")).toBe(true);
    // Respondeu: o convite chegou. Reenviar só apagaria o Sim/Não dela.
    expect(precisaReconvite(true, "accepted")).toBe(false);
    expect(precisaReconvite(true, "declined")).toBe(false);
    expect(precisaReconvite(true, "tentative")).toBe(false);
    // Apagado (ou cancelado) no meio do caminho: não ressuscitar.
    expect(precisaReconvite(false, undefined)).toBe(false);
  });
});

describe("maisAntigosPrimeiro", () => {
  it("sem data primeiro, depois do mais antigo ao mais novo, sem mexer na lista original", () => {
    const itens = [
      { id: "novo", em: "2026-11-16T23:00:00Z" },
      { id: "sem", em: undefined },
      { id: "velho", em: "2026-11-10T12:00:00Z" },
    ];
    const ordenados = maisAntigosPrimeiro(itens, (i) => i.em);
    expect(ordenados.map((i) => i.id)).toEqual(["sem", "velho", "novo"]);
    expect(itens.map((i) => i.id)).toEqual(["novo", "sem", "velho"]);
  });
});
