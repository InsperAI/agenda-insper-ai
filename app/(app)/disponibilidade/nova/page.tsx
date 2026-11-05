import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import NovoPedido from "@/components/votacao/NovoPedido";
import { obterMembroAtual } from "@/lib/membro";
import { podeCriarEvento } from "@/lib/niveis";
import { supabaseServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Novo pedido" };

/** Diretoria e membros criam pedidos (o banco também confere em criar_votacao/criar_agendamento). */
export default async function PaginaNovoPedido({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const tipo = (await searchParams).tipo === "grupos" ? "grupos" : "todos";
  const { membro } = await obterMembroAtual();
  if (!membro || !podeCriarEvento(membro.nivel)) redirect("/disponibilidade");

  const supabase = await supabaseServidor();
  const { data: pessoas } = await supabase.from("members").select("id,name,nivel").order("name");

  return (
    <div className="wrap-estreito flex flex-col gap-6">
      <div>
        <Link href="/disponibilidade" className="text-[0.8125rem] text-ia-apoio hover:text-ia-petroleo">
          ← Disponibilidade
        </Link>
        <h1 className="t-h2 mt-3">Novo pedido</h1>
        <p className="t-apoio mt-2">Depois de criar, copie o link e mande no grupo.</p>
      </div>
      <NovoPedido tipoInicial={tipo} pessoas={pessoas ?? []} meuId={membro.id} />
    </div>
  );
}
