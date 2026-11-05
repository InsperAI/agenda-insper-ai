import { describe, expect, it } from "vitest";
import { pedidoDeAgendamento, pedidoDeVotacao, porCriacao } from "@/lib/itensPedidos";
import type { AgendamentoRow, VotacaoRow } from "@/lib/supabase/tipos";

const AGORA = Date.parse("2026-11-05T12:00:00Z");
const ctx = { meuId: "eu", agora: AGORA, nomes: new Map([["gu", "Gustavo"]]) };

const ag: AgendamentoRow = {
  id: "a1",
  titulo: "Apresentação intermediária",
  descricao: "",
  prazo: "2026-11-10T21:00:00Z",
  niveis: ["trainee"],
  criado_por: "gu",
  confirmado_em: null,
  created_at: "2026-11-04T12:00:00Z",
};

describe("pedidoDeAgendamento", () => {
  it("convidado sem grupo está pendente; link e selo de grupos", () => {
    const p = pedidoDeAgendamento(ag, { ...ctx, convidado: true, meuGrupo: null, grupos: 3, reservados: 2, horarios: 12 });
    expect(p.pendente).toBe(true);
    expect(p.item.href).toBe("/disponibilidade/g/a1");
    expect(p.item.selo).toBe("grupos");
    expect(p.item.detalhe).toContain("12 horários · 3 grupos (2 com horário)");
    expect(p.item.detalhe).toContain("pedido por Gustavo");
  });

  it("quem já está num grupo não está pendente e vê o nome do grupo", () => {
    const p = pedidoDeAgendamento(ag, { ...ctx, convidado: true, meuGrupo: "Grupo Azul", grupos: 1, reservados: 0, horarios: 1 });
    expect(p.pendente).toBe(false);
    expect(p.item.feito).toBe("Grupo Azul");
    expect(p.item.detalhe).toContain("1 horário · 1 grupo (0 com horário)");
  });

  it("quem organizou não fica pendente mesmo sem grupo", () => {
    const p = pedidoDeAgendamento({ ...ag, criado_por: "eu" }, { ...ctx, convidado: true, meuGrupo: null, grupos: 0, reservados: 0, horarios: 4 });
    expect(p.pendente).toBe(false);
    expect(p.item.minha).toBe(true);
  });
});

describe("pedidoDeVotacao e ordem", () => {
  it("respondida aparece como feita; mais novo vem primeiro", () => {
    const v = {
      id: "v1",
      titulo: "Reunião",
      descricao: "",
      modo: "unica",
      dias: [],
      duracao_min: 60,
      prazo: "2026-11-06T21:00:00Z",
      niveis: [],
      criado_por: "eu",
      evento_id: null,
      confirmada_em: null,
      codigo: "abc1234",
      created_at: "2026-11-01T12:00:00Z",
    } satisfies VotacaoRow;
    const pv = pedidoDeVotacao(v, { ...ctx, convidado: true, respondi: true });
    expect(pv.item.feito).toBe("respondida");
    expect(pv.pendente).toBe(false);
    const pa = pedidoDeAgendamento(ag, { ...ctx, convidado: false, meuGrupo: null, grupos: 0, reservados: 0, horarios: 1 });
    expect([pv, pa].sort(porCriacao).map((p) => p.id)).toEqual(["a1", "v1"]);
  });
});
