import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Barra from "@/components/layout/Barra";
import { obterMembroAtual } from "@/lib/membro";
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

  return (
    <>
      <Barra membro={membro} tema={tema} />
      <main id="conteudo" className="wrap flex min-w-0 flex-1 flex-col py-5 md:py-6">
        {children}
      </main>
    </>
  );
}
