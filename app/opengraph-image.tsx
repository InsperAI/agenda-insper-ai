import { cartaoOG, TAMANHO_OG } from "@/lib/og";

export const size = TAMANHO_OG;
export const contentType = "image/png";
export const alt = "Agenda Insper AI";

/** Prévia padrão do site (ex.: quando alguém manda o link da página inicial). */
export default async function Imagem() {
  return cartaoOG({ rotulo: "Agenda", titulo: "A semana inteira da Insper AI, num lugar só.", detalhe: "Reuniões, aulas, prazos e eventos", comGrade: true });
}
