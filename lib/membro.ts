import { cache } from "react";
import { supabaseServidor } from "./supabase/server";
import type { MembroRow } from "./supabase/tipos";

export type MembroAtual = Pick<MembroRow, "id" | "email" | "name" | "cargo" | "is_admin">;

/**
 * Usuário autenticado + linha correspondente em `members`. `cache()` garante
 * uma única consulta por requisição mesmo que layout e página chamem os dois.
 * `membro` nulo com `user` presente = entrou com Google mas não está na allowlist.
 */
export const obterMembroAtual = cache(async (): Promise<{ user: { id: string; email: string } | null; membro: MembroAtual | null }> => {
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { user: null, membro: null };

  const { data: membro } = await supabase
    .from("members")
    .select("id,email,name,cargo,is_admin")
    .eq("email", user.email)
    .maybeSingle();

  return { user: { id: user.id, email: user.email }, membro: membro ?? null };
});
