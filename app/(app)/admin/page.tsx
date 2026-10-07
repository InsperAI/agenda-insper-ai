import type { Metadata } from "next";
import { redirect } from "next/navigation";
import TabelaMembros from "@/components/admin/TabelaMembros";
import { obterMembroAtual } from "@/lib/membro";
import { supabaseServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Membros" };

export default async function PaginaAdmin() {
  const { membro } = await obterMembroAtual();
  if (!membro?.is_admin) redirect("/agenda");

  const supabase = await supabaseServidor();
  const { data: membros } = await supabase.from("members").select("*").order("name");

  return (
    <div className="wrap-estreito flex flex-col gap-6">
      <div>
        <h1 className="t-h2">Membros</h1>
        <p className="t-apoio mt-2">
          Quem está nesta lista entra com a conta Google do e-mail cadastrado e pode ver e editar tudo. Admins também mexem nesta lista.
        </p>
      </div>
      <TabelaMembros inicial={membros ?? []} meuId={membro.id} />
    </div>
  );
}
