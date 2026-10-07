import { redirect } from "next/navigation";
import Barra from "@/components/layout/Barra";
import { obterMembroAtual } from "@/lib/membro";

/**
 * Portão de membro: logado mas fora da allowlist → /sem-acesso. A RLS garante
 * o mesmo no banco; aqui é só para mostrar a tela certa.
 */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { user, membro } = await obterMembroAtual();
  if (!user) redirect("/entrar");
  if (!membro) redirect("/sem-acesso");

  return (
    <>
      <Barra membro={membro} />
      <main id="conteudo" className="wrap flex min-w-0 flex-1 flex-col py-5 md:py-6">
        {children}
      </main>
    </>
  );
}
