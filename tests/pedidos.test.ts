import { describe, expect, it } from "vitest";
import { separarPedidos } from "@/lib/pedidos";
import type { VotacaoRow } from "@/lib/supabase/tipos";

const AGORA = Date.parse("2026-11-03T15:00:00Z");
const DIA = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

function pedido(id: string, extra: Partial<VotacaoRow> = {}): VotacaoRow {
  return {
    id,
    titulo: id,
    descricao: "",
    modo: "unica",
    dias: [],
    duracao_min: 60,
    prazo: iso(AGORA + DIA),
    niveis: [],
    criado_por: "outro",
    evento_id: null,
    confirmada_em: null,
    codigo: "abc1234",
    created_at: iso(AGORA - DIA),
    ...extra,
  };
}

const base = { convidado: new Set<string>(), respondidas: new Set<string>(), agora: AGORA };

/** Disponibilidade: pendente = convidado e ainda sem resposta. */
function separar(lista: VotacaoRow[], o: typeof base & { eu: { id: string; nivel: "diretoria" | "membro" | "trainee" } }) {
  return separarPedidos(lista, { eu: o.eu, agora: o.agora, pendente: (v) => o.convidado.has(v.id) && !o.respondidas.has(v.id) });
}

describe("separarPedidos", () => {
  it("confirmados vão para encerrados", () => {
    const r = separar([pedido("a", { confirmada_em: iso(AGORA) })], { ...base, eu: { id: "eu", nivel: "membro" } });
    expect(r.encerrados.map((v) => v.id)).toEqual(["a"]);
    expect(r.totalAbertos).toBe(0);
  });

  it("vencido sem horário há mais de 7 dias vai para encerrados; há menos, continua aberto", () => {
    const velho = pedido("velho", { prazo: iso(AGORA - 8 * DIA) });
    const recente = pedido("recente", { prazo: iso(AGORA - 2 * DIA) });
    const r = separar([velho, recente], { ...base, eu: { id: "eu", nivel: "diretoria" } });
    expect(r.encerrados.map((v) => v.id)).toEqual(["velho"]);
    expect(r.decidir.map((v) => v.id)).toEqual(["recente"]);
  });

  it("convidado que ainda não respondeu vê em 'responder'", () => {
    const r = separar([pedido("a"), pedido("b")], { ...base, convidado: new Set(["a", "b"]), respondidas: new Set(["b"]), eu: { id: "eu", nivel: "membro" } });
    expect(r.responder.map((v) => v.id)).toEqual(["a"]);
    expect(r.andamento.map((v) => v.id)).toEqual(["b"]);
  });

  it("prazo vencido: diretoria e quem pediu decidem; o resto só acompanha", () => {
    const vencidoDeOutro = pedido("a", { prazo: iso(AGORA - DIA) });
    const vencidoMeu = pedido("b", { prazo: iso(AGORA - DIA), criado_por: "eu" });
    const membro = separar([vencidoDeOutro, vencidoMeu], { ...base, eu: { id: "eu", nivel: "membro" } });
    expect(membro.decidir.map((v) => v.id)).toEqual(["b"]);
    expect(membro.andamento.map((v) => v.id)).toEqual(["a"]);
    const diretoria = separar([vencidoDeOutro], { ...base, eu: { id: "d", nivel: "diretoria" } });
    expect(diretoria.decidir.map((v) => v.id)).toEqual(["a"]);
  });

  it("totalAbertos soma as três seções", () => {
    const r = separar([pedido("a"), pedido("b", { prazo: iso(AGORA - DIA) })], { ...base, convidado: new Set(["a"]), eu: { id: "d", nivel: "diretoria" } });
    expect(r.totalAbertos).toBe(2);
  });
});
