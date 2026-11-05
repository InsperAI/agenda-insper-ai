import { dataHoraCurta } from "./datas";
import { estaEncerrado, type PedidoBase } from "./pedidos";
import type { AgendamentoRow, VotacaoRow } from "./supabase/tipos";
import { rotuloDuracao } from "./votacao";

/** Uma linha da lista de Disponibilidade (pedido de disponibilidade ou horários por grupo). */
export type ItemPedido = {
  id: string;
  titulo: string;
  href: string;
  /** "1h · data única · até 05/11 às 15h · pedido por Ana · 2 de 6 responderam" */
  detalhe: string;
  /** Selo ao lado do título (ex.: "grupos"). */
  selo?: string;
  minha: boolean;
  /** O que eu já fiz, à direita (ex.: "respondida", "Grupo 3"). */
  feito?: string;
};

/** Pedido de qualquer espécie, já no formato comum para separar em abas e listar. */
export type Pedido = PedidoBase & { created_at: string; item: ItemPedido; pendente: boolean };

type Contexto = { meuId: string; agora: number; nomes: Map<string, string> };

function situacao(v: Pick<PedidoBase, "confirmada_em" | "prazo">, agora: number, confirmado: string): string {
  if (v.confirmada_em) return confirmado;
  if (Date.parse(v.prazo) > agora) return `até ${dataHoraCurta(new Date(v.prazo))}`;
  return estaEncerrado(v, agora) ? "venceu sem confirmar" : "prazo encerrado";
}

const quemPediu = (criadoPor: string | null, c: Contexto) =>
  criadoPor && criadoPor !== c.meuId && c.nomes.has(criadoPor) ? ` · pedido por ${c.nomes.get(criadoPor)}` : "";

export function pedidoDeVotacao(
  v: VotacaoRow,
  c: Contexto & { convidado: boolean; respondi: boolean; andamento?: { responderam: number; total: number } },
): Pedido {
  const partes = [rotuloDuracao(v.duracao_min), v.modo === "recorrente" ? "recorrente" : "data única", situacao(v, c.agora, "horário confirmado")];
  const andamento = c.andamento ? ` · ${c.andamento.responderam} de ${c.andamento.total} responderam` : "";
  return {
    id: v.id,
    criado_por: v.criado_por,
    prazo: v.prazo,
    confirmada_em: v.confirmada_em,
    created_at: v.created_at,
    pendente: c.convidado && !c.respondi,
    item: {
      id: v.id,
      titulo: v.titulo,
      href: `/disponibilidade/${v.id}`,
      detalhe: partes.join(" · ") + quemPediu(v.criado_por, c) + andamento,
      minha: v.criado_por === c.meuId,
      feito: c.respondi ? "respondida" : undefined,
    },
  };
}

export function pedidoDeAgendamento(
  a: AgendamentoRow,
  c: Contexto & { convidado: boolean; meuGrupo: string | null; grupos: number; reservados: number; horarios: number },
): Pedido {
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  const partes = [
    plural(c.horarios, "horário", "horários"),
    plural(c.grupos, "grupo", "grupos") + (c.grupos > 0 ? ` (${c.reservados} com horário)` : ""),
    situacao({ confirmada_em: a.confirmado_em, prazo: a.prazo }, c.agora, "confirmado"),
  ];
  return {
    id: a.id,
    criado_por: a.criado_por,
    prazo: a.prazo,
    confirmada_em: a.confirmado_em,
    created_at: a.created_at,
    // Quem organizou não precisa de grupo; para os outros, falta entrar num.
    pendente: c.convidado && c.meuGrupo === null && a.criado_por !== c.meuId,
    item: {
      id: a.id,
      titulo: a.titulo,
      href: `/disponibilidade/g/${a.id}`,
      detalhe: partes.join(" · ") + quemPediu(a.criado_por, c),
      selo: "grupos",
      minha: a.criado_por === c.meuId,
      feito: c.meuGrupo ?? undefined,
    },
  };
}

/** Mais novos primeiro, misturando as duas espécies. */
export function porCriacao(a: Pedido, b: Pedido): number {
  return Date.parse(b.created_at) - Date.parse(a.created_at);
}
