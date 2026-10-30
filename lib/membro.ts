import { cache } from "react";
import { supabaseServidor } from "./supabase/server";
import type { MembroRow } from "./supabase/tipos";

export type MembroAtual = Pick<MembroRow, "id" | "email" | "name" | "cargo" | "nivel" | "is_admin">;

/**
 * Usuário autenticado + linha correspondente em `members`. `cache()` garante
 * uma única consulta por requisição mesmo que layout e página chamem os dois.
 * `membro` nulo com `user` presente = entrou com Google mas não está na allowlist.
 */
export const obterMembroAtual = cache(async (): Promise<{ user: { id: string; email: string; nome: string } | null; membro: MembroAtual | null }> => {
  const supabase = await supabaseServidor();
  // Token conferido localmente (ver proxy.ts); a RLS confere de novo no banco.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user?.email) return { user: null, membro: null };

  const { data: membro } = await supabase
    .from("members")
    .select("id,email,name,cargo,nivel,is_admin")
    .eq("email", user.email)
    .maybeSingle();

  // Nome do perfil Google, para sugerir no pedido de acesso.
  const nome = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  return { user: { id: user.sub, email: user.email, nome }, membro: membro ?? null };
});
