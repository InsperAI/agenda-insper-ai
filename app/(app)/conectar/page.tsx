import type { Metadata } from "next";
import Assinatura from "@/components/agenda/Assinatura";
import { supabaseServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Conectar" };

export default async function PaginaConectar() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.from("feed_tokens").select("token").maybeSingle();

  return (
    <div className="wrap-estreito flex flex-col gap-6">
      <div>
        <h1 className="t-h2">Conectar ao seu calendário</h1>
        <p className="t-apoio mt-2">
          Adicione a agenda da Insper AI ao Google Agenda, Apple Calendar ou Outlook. Ela aparece junto dos seus compromissos e se atualiza sozinha
          (o Google demora de 12 a 24 h para puxar mudanças; a Apple, alguns minutos).
        </p>
      </div>
      <Assinatura token={data?.token ?? null} />
    </div>
  );
}
