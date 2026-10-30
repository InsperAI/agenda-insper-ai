import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import MarcaInsper from "@/components/ui/MarcaInsper";
import { detalheResumo, obterResumoVotacao } from "@/lib/resumoVotacao";
import { supabaseServidor } from "@/lib/supabase/server";
import OpcoesEntrar from "../../entrar/OpcoesEntrar";

type Props = { params: Promise<{ codigo: string }> };

/** O que o WhatsApp mostra: título do pedido e prazo (a imagem vem de opengraph-image.tsx). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resumo = await obterResumoVotacao((await params).codigo);
  if (!resumo) return { title: "Pedido não encontrado" };
  const titulo = `${resumo.titulo} · Disponibilidade`;
  const descricao = `${detalheResumo(resumo)}. Marque os horários em que você pode.`;
  return {
    title: { absolute: titulo },
    description: descricao,
    openGraph: { title: titulo, description: descricao, siteName: "Agenda Insper AI", locale: "pt_BR", type: "website" },
    twitter: { card: "summary_large_image", title: titulo, description: descricao },
  };
}

/**
 * Link curto /d/<codigo> para mandar no grupo. Logado → vai direto ao pedido
 * (o layout de (app) cuida de quem não é membro). Sem login → resumo + entrar.
 */
export default async function LinkCurto({ params }: Props) {
  const resumo = await obterResumoVotacao((await params).codigo);
  if (!resumo) {
    return (
      <main className="flex flex-1 flex-col items-start gap-4 px-6 py-12 sm:px-10">
        <MarcaInsper />
        <h1 className="t-h2 mt-6">Pedido não encontrado</h1>
        <p className="t-apoio">Confira se o link está completo, ou peça um novo para quem mandou.</p>
      </main>
    );
  }

  const destino = `/disponibilidade/${resumo.id}`;
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect(destino);

  return (
    <main className="flex flex-1 flex-col px-6 py-8 sm:px-10">
      <MarcaInsper />
      <div className="flex flex-1 flex-col justify-center py-10">
        <div className="w-full max-w-md">
          <p className="text-[0.9rem] text-ia-cobalto">Pedido de disponibilidade</p>
          <h1 className="t-h1 mt-2">{resumo.titulo}</h1>
          <p className="t-apoio mt-3">{detalheResumo(resumo)}.</p>
          <p className="t-apoio mt-1">Entre com o Google ou com um código no seu e-mail para marcar os horários em que você pode.</p>
          <div className="mt-8">
            <OpcoesEntrar next={destino} />
          </div>
        </div>
      </div>
      <Link href="/privacidade" className="self-start text-[0.8125rem] text-ia-meta underline-offset-4 hover:text-ia-petroleo hover:underline">
        Política de privacidade
      </Link>
    </main>
  );
}
