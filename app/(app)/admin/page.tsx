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
  const [{ data: membros }, { data: pedidos }] = await Promise.all([
    supabase.from("members").select("*").order("name"),
    supabase.from("access_requests").select("*").order("created_at"),
  ]);

  return (
    <div className="wrap-estreito flex flex-col gap-6">
      <div>
        <h1 className="t-h2">Membros</h1>
        <p className="t-apoio mt-2">
          Quem está nesta lista entra com a conta Google do e-mail cadastrado. A diretoria cria e edita eventos e escolhe quem vê cada um; membros e trainees só veem os eventos liberados
          para o seu nível. Admins também mexem nesta lista.
          Quem entra com o Google sem estar cadastrado pode pedir acesso; os pedidos aparecem aqui.
        </p>
      </div>
      <TabelaMembros inicial={membros ?? []} pedidosIniciais={pedidos ?? []} meuId={membro.id} />
    </div>
  );
}
