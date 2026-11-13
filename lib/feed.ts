/**
 * Quem busca o feed .ics e com que frequência. O feed registra cada busca
 * (tabela `feed_buscas`, 0013) para a página Conectar mostrar se o calendário
 * da pessoa está mesmo vindo buscar mudanças.
 */

import type { FeedBuscaRow } from "./supabase/tipos";

export type ClienteFeed = FeedBuscaRow["cliente"];

export const NOME_CLIENTE: Record<ClienteFeed, string> = {
  google: "Google Agenda",
  apple: "Calendário da Apple",
  outlook: "Outlook",
  navegador: "Navegador",
  outro: "Outro app",
};

export type BuscaFeed = Pick<FeedBuscaRow, "cliente" | "primeira_em" | "ultima_em" | "buscas">;

/** Ordem importa: o importador do Google se anuncia como "Mozilla/5.0 (compatible; …)". */
const PADROES: [ClienteFeed, RegExp][] = [
  ["google", /Google-Calendar-Importer/i],
  ["apple", /dataaccessd|CalendarAgent|iCal\/|CalendarServer|iCloud/i],
  ["outlook", /Microsoft Office|Outlook|Exchange/i],
  ["navegador", /^Mozilla\//],
];

export function identificarCliente(agente: string | null): ClienteFeed {
  if (!agente) return "outro";
  return PADROES.find(([, padrao]) => padrao.test(agente))?.[0] ?? "outro";
}

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

function duracao(ms: number): string {
  if (ms < HORA) return `${Math.max(1, Math.round(ms / MINUTO))} min`;
  if (ms < 2 * DIA) return `${Math.round(ms / HORA)} h`;
  return `${Math.round(ms / DIA)} dias`;
}

/** "há 9 h" e "a cada 12 h" (média entre a primeira e a última busca). */
export function resumirBusca(b: BuscaFeed, agora: Date): { quando: string; media: string | null } {
  const desde = agora.getTime() - Date.parse(b.ultima_em);
  const quando = desde < MINUTO ? "agora há pouco" : `há ${duracao(desde)}`;
  if (b.buscas < 2) return { quando, media: null };
  const intervalo = (Date.parse(b.ultima_em) - Date.parse(b.primeira_em)) / (b.buscas - 1);
  return { quando, media: `a cada ${duracao(intervalo)}` };
}
