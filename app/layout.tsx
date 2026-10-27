import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import ProvedorDeMovimento from "@/components/ui/ProvedorDeMovimento";
import { atributoTema, COOKIE_TEMA, lerTema } from "@/lib/tema";
import "./globals.css";

// As duas famílias da marca (§03): Space Grotesk só em 600; Instrument Sans 400.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Agenda · Insper AI",
    template: "%s · Agenda Insper AI",
  },
  description: "Calendário compartilhado da Insper AI: eventos, aulas, reuniões e prazos.",
  robots: { index: false, follow: false },
  // Instalado na tela de início do iPhone: tela cheia e nome curto embaixo do ícone.
  appleWebApp: { capable: true, title: "Agenda", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0A111D" },
  ],
  colorScheme: "light dark",
  // Ocupa a tela toda (atrás do notch e da barra de início); as safe areas vêm do CSS.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value);
  return (
    <html lang="pt-BR" data-theme={atributoTema(tema)} className={`${spaceGrotesk.variable} ${instrumentSans.variable}`}>
      <body className="flex min-h-svh flex-col bg-ia-papel">
        <ProvedorDeMovimento>{children}</ProvedorDeMovimento>
      </body>
    </html>
  );
}
