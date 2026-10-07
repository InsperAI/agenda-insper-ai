import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BrandMark from "@/components/ui/BrandMark";
import { obterMembroAtual } from "@/lib/membro";

export const metadata: Metadata = { title: "Sem acesso" };

export default async function SemAcesso() {
  const { user, membro } = await obterMembroAtual();
  if (!user) redirect("/entrar");
  if (membro) redirect("/agenda");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <BrandMark className="h-10 w-12" />
        <p className="t-meta mt-6">Insper AI</p>
        <h1 className="t-h2 mt-2">Sem acesso</h1>
        <p className="t-apoio mt-3">
          Você entrou como <span className="text-ia-petroleo">{user.email}</span>, mas esse e-mail ainda não está na lista da diretoria.
        </p>
        <p className="t-apoio mt-2">Peça a um admin para incluir você em Membros, depois entre de novo.</p>
        <form action="/auth/sair" method="post" className="mt-8">
          <button type="submit" className="inline-flex h-10 items-center rounded-full border border-ia-regua px-5 font-display text-[0.9rem] font-semibold text-ia-petroleo transition-colors hover:bg-ia-nevoa">
            Sair e trocar de conta
          </button>
        </form>
      </div>
    </main>
  );
}
