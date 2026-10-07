import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./tipos";

/** Cliente para componentes de cliente. Usa a chave pública; a RLS faz o resto. */
export function supabaseNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export type ClienteSupabase = ReturnType<typeof supabaseNavegador>;
