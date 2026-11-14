import { timingSafeEqual } from "node:crypto";
import { obterMembroAtual } from "../membro";

/** Admin logado (a sessão vem do cookie), ou null. */
export async function adminLogado() {
  const { membro } = await obterMembroAtual();
  return membro?.is_admin ? membro : null;
}

/** Comparação em tempo constante para segredos. */
export function mesmoSegredo(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Origem pública do app, a mesma que o Google precisa ter cadastrada como redirect. */
export function origemDe(request: Request): string {
  return new URL(request.url).origin;
}

/**
 * Endereço que o banco (pg_net) chama: o de produção quando configurado, para
 * que conectar a partir de um preview ou do localhost não aponte o banco para lá.
 */
export function sitePublico(origem: string): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  return env && env.startsWith("https://") ? env : origem;
}

export const COOKIE_ESTADO = "agenda_google_estado";
