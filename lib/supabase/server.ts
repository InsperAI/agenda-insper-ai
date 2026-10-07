import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./tipos";

/** Cliente para Server Components, Server Actions e Route Handlers. */
export async function supabaseServidor() {
  const jar = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return jar.getAll();
        },
        setAll(lista) {
          try {
            for (const { name, value, options } of lista) jar.set(name, value, options);
          } catch {
            // Chamado a partir de um Server Component: não dá para gravar cookies
            // aqui. O proxy.ts renova a sessão a cada requisição, então é seguro ignorar.
          }
        },
      },
    },
  );
}
