import { cartaoOG, TAMANHO_OG } from "@/lib/og";
import { detalheResumo, obterResumoVotacao } from "@/lib/resumoVotacao";

export const size = TAMANHO_OG;
export const contentType = "image/png";
export const alt = "Pedido de disponibilidade da Insper AI";

/** Imagem da prévia do link curto: título do pedido, prazo e uma mini grade. */
export default async function Imagem({ params }: { params: Promise<{ codigo: string }> }) {
  const resumo = await obterResumoVotacao((await params).codigo);
  if (!resumo) return cartaoOG({ rotulo: "Agenda", titulo: "Pedido não encontrado", detalhe: "Peça um link novo para quem mandou." });
  return cartaoOG({ rotulo: "Pedido de disponibilidade", titulo: resumo.titulo, detalhe: detalheResumo(resumo), comGrade: true });
}
