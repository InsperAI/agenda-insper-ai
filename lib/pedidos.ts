import { podeDecidirPedido } from "./niveis";
import type { Nivel, VotacaoRow } from "./supabase/tipos";
import { aceitaRespostas } from "./votacao";

/** Depois do prazo, um pedido sem horário confirmado ainda espera decisão por estes dias (mesma regra da 0009). */
export const DIAS_PARA_ENCERRAR = 7;
const MS_DIA = 24 * 60 * 60 * 1000;

export type PedidosSeparados = {
  /** Convidado, dentro do prazo e ainda sem resposta minha. */
  responder: VotacaoRow[];
  /** Prazo vencido, sem horário, e eu posso confirmar. */
  decidir: VotacaoRow[];
  /** O resto dos abertos: já respondi, só acompanho, ou outra pessoa decide. */
  andamento: VotacaoRow[];
  /** Confirmados ou abandonados (vencidos há mais de DIAS_PARA_ENCERRAR). */
  encerrados: VotacaoRow[];
  totalAbertos: number;
};

export function estaEncerrado(v: Pick<VotacaoRow, "confirmada_em" | "prazo">, agora: number): boolean {
  return v.confirmada_em !== null || Date.parse(v.prazo) + DIAS_PARA_ENCERRAR * MS_DIA <= agora;
}

/** Abas e seções da página Disponibilidade. Mantém a ordem recebida em cada grupo. */
export function separarPedidos(
  lista: VotacaoRow[],
  { eu, convidado, respondidas, agora }: { eu: { id: string; nivel: Nivel }; convidado: Set<string>; respondidas: Set<string>; agora: number },
): PedidosSeparados {
  const responder: VotacaoRow[] = [];
  const decidir: VotacaoRow[] = [];
  const andamento: VotacaoRow[] = [];
  const encerrados: VotacaoRow[] = [];
  for (const v of lista) {
    if (estaEncerrado(v, agora)) encerrados.push(v);
    else if (aceitaRespostas(v, agora) && convidado.has(v.id) && !respondidas.has(v.id)) responder.push(v);
    else if (!aceitaRespostas(v, agora) && podeDecidirPedido(eu, v.criado_por)) decidir.push(v);
    else andamento.push(v);
  }
  return { responder, decidir, andamento, encerrados, totalAbertos: responder.length + decidir.length + andamento.length };
}
