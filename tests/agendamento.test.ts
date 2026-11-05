import { describe, expect, it } from "vitest";
import { gerarHorarios, montarVisao, nomeGrupoValido, porDia, traduzirErroAgendamento } from "@/lib/agendamento";
import type { AgendamentoRow } from "@/lib/supabase/tipos";
import { SEM_CONEXAO } from "@/lib/erros";
import { hora } from "@/lib/datas";

const horas = (lista: { inicio: Date; fim: Date }[]) => lista.map((h) => `${hora(h.inicio)}–${hora(h.fim)}`);

describe("gerarHorarios", () => {
  it("fatia a janela pela duração, com intervalo, e só cabe o que termina dentro", () => {
    const r = gerarHorarios([{ dia: "2026-11-12", inicio: "14:00", fim: "15:00" }], 20, 5);
    expect(horas(r)).toEqual(["14h–14h20", "14h25–14h45"]);
  });

  it("sem intervalo, emenda um no outro", () => {
    const r = gerarHorarios([{ dia: "2026-11-12", inicio: "09:00", fim: "10:00" }], 30, 0);
    expect(horas(r)).toEqual(["9h–9h30", "9h30–10h"]);
  });

  it("usa o fuso de São Paulo (14h em SP = 17h UTC)", () => {
    const [h] = gerarHorarios([{ dia: "2026-11-12", inicio: "14:00", fim: "15:00" }], 60, 0);
    expect(h.inicio.toISOString()).toBe("2026-11-12T17:00:00.000Z");
  });

  it("junta várias janelas em ordem e descarta sobreposições", () => {
    const r = gerarHorarios(
      [
        { dia: "2026-11-13", inicio: "10:00", fim: "11:00" },
        { dia: "2026-11-12", inicio: "14:00", fim: "15:00" },
        { dia: "2026-11-12", inicio: "14:30", fim: "15:30" },
      ],
      30,
      0,
    );
    expect(r.map((h) => h.inicio.toISOString())).toEqual([
      "2026-11-12T17:00:00.000Z",
      "2026-11-12T17:30:00.000Z",
      "2026-11-12T18:00:00.000Z",
      "2026-11-13T13:00:00.000Z",
      "2026-11-13T13:30:00.000Z",
    ]);
  });

  it("ignora janela inválida (fim antes do início, hora malformada) e duração zero", () => {
    expect(gerarHorarios([{ dia: "2026-11-12", inicio: "15:00", fim: "14:00" }], 20, 0)).toEqual([]);
    expect(gerarHorarios([{ dia: "2026-11-12", inicio: "xx", fim: "14:00" }], 20, 0)).toEqual([]);
    expect(gerarHorarios([{ dia: "2026-11-12", inicio: "14:00", fim: "15:00" }], 0, 0)).toEqual([]);
  });
});

describe("nomeGrupoValido", () => {
  it("aceita de 1 a 60 caracteres depois de tirar espaços", () => {
    expect(nomeGrupoValido("  Grupo 3 ")).toBe(true);
    expect(nomeGrupoValido("   ")).toBe(false);
    expect(nomeGrupoValido("x".repeat(61))).toBe(false);
  });
});

describe("traduzirErroAgendamento", () => {
  it("troca erro de nome repetido e falha de rede", () => {
    expect(traduzirErroAgendamento("Já existe um grupo com esse nome.")).toBe("Já existe um grupo com esse nome.");
    expect(traduzirErroAgendamento("Load failed")).toBe(SEM_CONEXAO);
    expect(traduzirErroAgendamento('new row for relation "agendamentos" violates check constraint "agendamentos_titulo_check"')).toBe(
      "Dê um título com até 120 caracteres.",
    );
  });
});

describe("porDia", () => {
  it("agrupa horários pelo dia de São Paulo, em ordem", () => {
    const r = porDia(gerarHorarios(
      [
        { dia: "2026-11-13", inicio: "10:00", fim: "11:00" },
        { dia: "2026-11-12", inicio: "22:00", fim: "23:00" },
      ],
      30,
      0,
    ));
    expect(r.map((d) => [d.dia, d.horarios.length])).toEqual([
      ["2026-11-12", 2],
      ["2026-11-13", 2],
    ]);
  });
});

describe("montarVisao", () => {
  const ag = {
    id: "a",
    titulo: "Apresentações",
    descricao: "",
    prazo: "2026-11-10T21:00:00Z",
    niveis: [],
    criado_por: "org",
    confirmado_em: null,
    created_at: "2026-11-01T00:00:00Z",
  } satisfies AgendamentoRow;
  const horarios = [
    { id: "h1", agendamento_id: "a", inicio: "2026-11-12T17:00:00Z", fim: "2026-11-12T17:20:00Z" },
    { id: "h2", agendamento_id: "a", inicio: "2026-11-12T17:25:00Z", fim: "2026-11-12T17:45:00Z" },
  ];
  const grupo = (id: string, nome: string, horario_id: string | null) => ({ id, agendamento_id: "a", nome, horario_id, evento_id: null, criado_por: null, created_at: "" });
  const dados = {
    ag,
    horarios,
    grupos: [grupo("gB", "Beta", null), grupo("gA", "Alfa", "h2")],
    integrantes: [
      { agendamento_id: "a", member_id: "eu", grupo_id: "gA" },
      { agendamento_id: "a", member_id: "ana", grupo_id: "gB" },
    ],
    convidados: ["eu", "ana", "bia", "org"],
    nomes: { eu: "Eu", ana: "Ana", bia: "Bia", org: "Org" },
  };

  it("acha meu grupo, quem está sem grupo e o dono de cada horário", () => {
    const v = montarVisao(dados, "eu", Date.parse("2026-11-05T12:00:00Z"));
    expect(v.aberto).toBe(true);
    expect(v.meuGrupo?.nome).toBe("Alfa");
    expect(v.semGrupo.map((p) => p.nome)).toEqual(["Bia", "Org"]);
    expect(v.horarios.map((h) => h.grupo?.nome ?? null)).toEqual([null, "Alfa"]);
    // Com horário primeiro (na ordem do horário), depois os sem horário por nome.
    expect(v.grupos.map((g) => g.nome)).toEqual(["Alfa", "Beta"]);
  });

  it("fecha depois do prazo ou da confirmação, e marca horário passado", () => {
    expect(montarVisao(dados, "eu", Date.parse("2026-11-11T00:00:00Z")).aberto).toBe(false);
    expect(montarVisao({ ...dados, ag: { ...ag, confirmado_em: "2026-11-06T00:00:00Z" } }, "eu", Date.parse("2026-11-05T12:00:00Z")).aberto).toBe(false);
    const depois = montarVisao(dados, "eu", Date.parse("2026-11-12T17:10:00Z"));
    expect(depois.horarios.map((h) => h.passado)).toEqual([true, false]);
  });
});
