import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Space_Grotesk } from "next/font/google";
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
    default: "Agenda da Diretoria · Insper AI",
    template: "%s · Agenda Insper AI",
  },
  description: "Calendário compartilhado da diretoria da Insper AI: eventos, aulas, reuniões e prazos.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${spaceGrotesk.variable} ${instrumentSans.variable}`}>
      <body className="flex min-h-svh flex-col bg-ia-papel">{children}</body>
    </html>
  );
}
