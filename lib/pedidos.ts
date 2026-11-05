import { podeDecidirPedido } from "./niveis";
import type { Nivel } from "./supabase/tipos";

/** Depois do prazo, um pedido sem horário confirmado ainda espera decisão por estes dias (mesma regra da 0009). */
export const DIAS_PARA_ENCERRAR = 7;
const MS_DIA = 24 * 60 * 60 * 1000;

/** O que as duas espécies de pedido (disponibilidade e horários por grupo) têm em comum. */
export type PedidoBase = { id: string; criado_por: string | null; prazo: string; confirmada_em: string | null };

export type PedidosSeparados<T> = {
  /** Dentro do prazo e esperando algo meu (marcar horários / entrar num grupo). */
  responder: T[];
  /** Prazo vencido, sem confirmação, e eu posso confirmar. */
  decidir: T[];
  /** O resto dos abertos: já respondi, só acompanho, ou outra pessoa decide. */
  andamento: T[];
  /** Confirmados ou abandonados (vencidos há mais de DIAS_PARA_ENCERRAR). */
  encerrados: T[];
  totalAbertos: number;
};

export function estaEncerrado(v: Pick<PedidoBase, "confirmada_em" | "prazo">, agora: number): boolean {
  return v.confirmada_em !== null || Date.parse(v.prazo) + DIAS_PARA_ENCERRAR * MS_DIA <= agora;
}

const dentroDoPrazo = (v: PedidoBase, agora: number) => v.confirmada_em === null && Date.parse(v.prazo) > agora;

/** Abas e seções da página Disponibilidade. Mantém a ordem recebida em cada grupo. */
export function separarPedidos<T extends PedidoBase>(
  lista: readonly T[],
  { eu, agora, pendente }: { eu: { id: string; nivel: Nivel }; agora: number; pendente: (v: T) => boolean },
): PedidosSeparados<T> {
  const responder: T[] = [];
  const decidir: T[] = [];
  const andamento: T[] = [];
  const encerrados: T[] = [];
  for (const v of lista) {
    if (estaEncerrado(v, agora)) encerrados.push(v);
    else if (dentroDoPrazo(v, agora) && pendente(v)) responder.push(v);
    else if (!dentroDoPrazo(v, agora) && podeDecidirPedido(eu, v.criado_por)) decidir.push(v);
    else andamento.push(v);
  }
  return { responder, decidir, andamento, encerrados, totalAbertos: responder.length + decidir.length + andamento.length };
}
