import { describe, expect, it } from "vitest";
import { chaveDia, spDe } from "@/lib/fuso";
import { chaveBloco, diasDaSemana, inicioDoHorario, melhoresHorarios, N_BLOCOS, proximaData, rotuloBloco, rotuloDuracao, statusVotacao } from "@/lib/votacao";

describe("blocos", () => {
  it("vão das 8h às 21h em 30 min", () => {
    expect(N_BLOCOS).toBe(26);
    expect(rotuloBloco(0)).toBe("8h");
    expect(rotuloBloco(1)).toBe("8h30");
    expect(rotuloBloco(25)).toBe("20h30");
    expect(rotuloBloco(26)).toBe("21h");
  });

  it("rotuloDuracao escreve como se fala", () => {
    expect(rotuloDuracao(30)).toBe("30 min");
    expect(rotuloDuracao(60)).toBe("1h");
    expect(rotuloDuracao(90)).toBe("1h30");
    expect(rotuloDuracao(240)).toBe("4h");
  });
});

describe("melhoresHorarios", () => {
  // Reunião de 1h (2 blocos), dois dias.
  const base = { dias: ["2026-11-03", "2026-11-04"], duracaoMin: 60 };
  const k = chaveBloco;

  it("junta inícios seguidos em que todos podem numa faixa", () => {
    const r = melhoresHorarios({
      ...base,
      respostas: [
        { member_id: "a", blocos: [k("2026-11-03", 2), k("2026-11-03", 3), k("2026-11-03", 4)] },
        { member_id: "b", blocos: [k("2026-11-03", 2), k("2026-11-03", 3), k("2026-11-03", 4), k("2026-11-04", 0), k("2026-11-04", 1)] },
      ],
    });
    expect(r.todosPodem).toBe(true);
    // Inícios 9h e 9h30 cabem 1h para os dois → faixa 9h–10h30.
    expect(r.faixas).toEqual([{ dia: "2026-11-03", inicio: 2, fim: 5, podem: ["a", "b"], naoPodem: [] }]);
  });

  it("sem horário para todos, mostra onde mais gente pode e quem fica de fora", () => {
    const r = melhoresHorarios({
      ...base,
      respostas: [
        { member_id: "a", blocos: [k("2026-11-03", 0), k("2026-11-03", 1)] },
        { member_id: "b", blocos: [k("2026-11-03", 0), k("2026-11-03", 1)] },
        { member_id: "c", blocos: [k("2026-11-04", 10), k("2026-11-04", 11)] },
      ],
    });
    expect(r.todosPodem).toBe(false);
    expect(r.faixas[0]).toEqual({ dia: "2026-11-03", inicio: 0, fim: 2, podem: ["a", "b"], naoPodem: ["c"] });
  });

  it("um bloco solto não basta para uma reunião de 1h", () => {
    const r = melhoresHorarios({ ...base, respostas: [{ member_id: "a", blocos: [k("2026-11-03", 5)] }] });
    expect(r.faixas).toEqual([]);
  });

  it("ninguém respondeu → sem sugestão", () => {
    expect(melhoresHorarios({ ...base, respostas: [] })).toEqual({ todosPodem: false, faixas: [] });
  });
});

describe("statusVotacao", () => {
  const agora = new Date("2026-11-01T12:00:00Z");
  const futuro = "2026-11-05T12:00:00Z";
  it("confirmada quando já virou evento, mesmo que o evento tenha sido apagado depois", () => {
    expect(statusVotacao({ confirmada_em: "2026-10-31T12:00:00Z", prazo: futuro }, 1, 3, agora)).toBe("confirmada");
  });
  it("pronta quando todos responderam ou o prazo venceu", () => {
    expect(statusVotacao({ confirmada_em: null, prazo: futuro }, 3, 3, agora)).toBe("pronta");
    expect(statusVotacao({ confirmada_em: null, prazo: "2026-10-30T12:00:00Z" }, 1, 3, agora)).toBe("pronta");
  });
  it("aberta caso contrário", () => {
    expect(statusVotacao({ confirmada_em: null, prazo: futuro }, 1, 3, agora)).toBe("aberta");
  });
});

describe("datas", () => {
  it("diasDaSemana devolve as datas dos dias escolhidos da semana", () => {
    // Semana de segunda 2/11/2026; ter (2) e qui (4).
    expect(diasDaSemana("2026-11-02", ["2", "4"])).toEqual(["2026-11-03", "2026-11-05"]);
  });

  it("proximaData acha o próximo dia da semana a partir de hoje (inclusive)", () => {
    const hoje = spDe(2026, 11, 4); // quarta
    expect(proximaData("3", hoje)).toBe("2026-11-04");
    expect(proximaData("1", hoje)).toBe("2026-11-09");
  });

  it("inicioDoHorario monta o instante em São Paulo", () => {
    const d = inicioDoHorario("2026-11-03", 3); // 9h30
    expect(chaveDia(d)).toBe("2026-11-03");
    expect(d.toISOString()).toBe(spDe(2026, 11, 3, 9, 30).toISOString());
  });
});
