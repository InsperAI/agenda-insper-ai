import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import FormNovaVotacao from "@/components/votacao/FormNovaVotacao";
import { obterMembroAtual } from "@/lib/membro";
import { podeEditar } from "@/lib/niveis";
import { supabaseServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pedir disponibilidade" };

/** Só a diretoria pede disponibilidade (o banco também confere em criar_votacao). */
export default async function PaginaNovaVotacao() {
  const { membro } = await obterMembroAtual();
  if (!membro || !podeEditar(membro.nivel)) redirect("/disponibilidade");

  const supabase = await supabaseServidor();
  const { data: pessoas } = await supabase.from("members").select("id,name,nivel").order("name");

  return (
    <div className="wrap-estreito flex flex-col gap-6">
      <div>
        <Link href="/disponibilidade" className="text-[0.8125rem] text-ia-apoio hover:text-ia-petroleo">
          ← Disponibilidade
        </Link>
        <h1 className="t-h2 mt-3">Pedir disponibilidade</h1>
        <p className="t-apoio mt-2">Depois de criar, copie o link e mande no grupo. Cada um marca quando pode; você escolhe o horário e ele entra na agenda dos convidados.</p>
      </div>
      <FormNovaVotacao pessoas={pessoas ?? []} meuId={membro.id} />
    </div>
  );
}
