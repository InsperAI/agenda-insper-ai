import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Barra from "@/components/layout/Barra";
import { obterMembroAtual } from "@/lib/membro";
import { supabaseServidor } from "@/lib/supabase/server";
import { COOKIE_TEMA, lerTema } from "@/lib/tema";

/**
 * Portão de membro: logado mas fora da allowlist → /sem-acesso. A RLS garante
 * o mesmo no banco; aqui é só para mostrar a tela certa.
 */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { user, membro } = await obterMembroAtual();
  if (!user) redirect("/entrar");
  if (!membro) redirect("/sem-acesso");
  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value);
  const pedidos = membro.is_admin ? await contarPedidos() : 0;

  return (
    <>
      <Barra membro={membro} tema={tema} pedidos={pedidos} />
      <main id="conteudo" className="wrap flex min-w-0 flex-1 flex-col py-5 md:py-6">
        {children}
      </main>
    </>
  );
}

/** Pedidos de acesso pendentes, para o contador "Membros · N" dos admins. */
async function contarPedidos(): Promise<number> {
  const supabase = await supabaseServidor();
  const { count } = await supabase.from("access_requests").select("id", { count: "exact", head: true });
  return count ?? 0;
}
