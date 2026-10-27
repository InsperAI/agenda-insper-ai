import { iconeApp } from "@/lib/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícone do "Adicionar à Tela de Início" do iPhone (o iOS arredonda os cantos sozinho). */
export default function IconeApple() {
  return iconeApp(180, 0.18);
}
