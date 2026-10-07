import { createClient } from "@supabase/supabase-js";
import type { Database } from "./tipos";

/**
 * Cliente com a chave service_role: IGNORA a RLS. Só pode ser importado por
 * código que roda exclusivamente no servidor (app/api/**). Nunca em componentes.
 */
export function supabaseAdmin() {
  if (typeof window !== "undefined") {
    throw new Error("supabaseAdmin() só pode ser usado no servidor.");
  }
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
