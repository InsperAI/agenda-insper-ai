import type { MetadataRoute } from "next";

/**
 * Torna o site instalável ("Adicionar à Tela de Início"): abre em tela cheia,
 * sem a barra do navegador, direto na agenda.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agenda Insper AI",
    short_name: "Agenda",
    description: "Calendário compartilhado da Insper AI: eventos, aulas, reuniões e prazos.",
    lang: "pt-BR",
    start_url: "/agenda",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icone/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
