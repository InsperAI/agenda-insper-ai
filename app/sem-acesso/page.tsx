import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MarcaInsper from "@/components/ui/MarcaInsper";
import { obterMembroAtual } from "@/lib/membro";
import { supabaseServidor } from "@/lib/supabase/server";
import PedidoAcesso from "./PedidoAcesso";

export const metadata: Metadata = { title: "Sem acesso" };

export default async function SemAcesso() {
  const { user, membro } = await obterMembroAtual();
  if (!user) redirect("/entrar");
  if (membro) redirect("/agenda");

  // A RLS só devolve o pedido do próprio e-mail.
  const supabase = await supabaseServidor();
  const { data: pedido } = await supabase.from("access_requests").select("*").maybeSingle();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <MarcaInsper />
        <h1 className="t-h2 mt-8">{pedido ? "Aguardando aprovação" : "Sem acesso"}</h1>
        <p className="t-apoio mt-3">
          Você entrou como <span className="text-ia-petroleo">{user.email}</span>, que ainda não está na lista de membros.
          {!pedido && " Peça acesso abaixo; um admin aprova."}
        </p>
        <PedidoAcesso pedido={pedido} nomeSugerido={user.nome} />
        <form action="/auth/sair" method="post" className="mt-6">
          <button type="submit" className="inline-flex h-10 items-center rounded-full border border-ia-regua px-5 font-display text-[0.9rem] font-semibold text-ia-petroleo transition-colors hover:bg-ia-nevoa">
            Sair e trocar de conta
          </button>
        </form>
      </div>
    </main>
  );
}
