import { chaveDia } from "./fuso";

export type Vista = "mes" | "semana" | "proximos";
const VISTAS: Vista[] = ["mes", "semana", "proximos"];

type Parametros = { v?: string | string[]; d?: string | string[] };

/** ?v=mes|semana|proximos&d=YYYY-MM-DD, com padrões seguros. */
export function lerParametros(p: Parametros): { vista: Vista; ancora: string } {
  const v = Array.isArray(p.v) ? p.v[0] : p.v;
  const d = Array.isArray(p.d) ? p.d[0] : p.d;
  const vista = VISTAS.includes(v as Vista) ? (v as Vista) : "mes";
  const ancora = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : chaveDia(new Date());
  return { vista, ancora };
}

export function montarUrl(vista: Vista, ancora: string): string {
  const q = new URLSearchParams({ v: vista, d: ancora });
  return `/agenda?${q.toString()}`;
}

/** Só aceita caminhos internos ("/agenda", "/admin?x=1"); nunca "//evil" ou URLs absolutas. */
export function destinoSeguro(next: string | null | undefined, padrao = "/agenda"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return padrao;
  return next;
}
