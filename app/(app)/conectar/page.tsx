import type { Metadata } from "next";
import Assinatura from "@/components/agenda/Assinatura";
import BuscasFeed from "@/components/agenda/BuscasFeed";
import { supabaseServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Conectar" };

export default async function PaginaConectar() {
  const supabase = await supabaseServidor();
  const [{ data }, { data: buscas }] = await Promise.all([
    supabase.from("feed_tokens").select("token").maybeSingle(),
    // Sem a 0013 a consulta falha e o bloco simplesmente não aparece.
    supabase.from("feed_buscas").select("cliente,primeira_em,ultima_em,buscas"),
  ]);

  return (
    <div className="wrap-estreito flex flex-col gap-6">
      <div>
        <h1 className="t-h2">Conectar ao seu calendário</h1>
        <p className="t-apoio mt-2">
          Adicione a agenda da Insper AI ao calendário que você já usa. Ela aparece junto dos seus compromissos e se atualiza sozinha; a velocidade
          depende do app (veja abaixo).
        </p>
      </div>
      <BuscasFeed buscas={buscas ?? []} agora={new Date()} />
      <Assinatura token={data?.token ?? null} />
    </div>
  );
}
