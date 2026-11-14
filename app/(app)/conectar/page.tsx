import type { Metadata } from "next";
import Assinatura from "@/components/agenda/Assinatura";
import BuscasFeed from "@/components/agenda/BuscasFeed";
import GoogleNaHora from "@/components/agenda/GoogleNaHora";
import { obterMembroAtual } from "@/lib/membro";
import { supabaseServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Conectar" };

export default async function PaginaConectar() {
  const supabase = await supabaseServidor();
  const [{ membro }, { data }, { data: buscas }, { data: status }, { data: inscricao }] = await Promise.all([
    obterMembroAtual(),
    supabase.from("feed_tokens").select("token").maybeSingle(),
    // Sem a 0013 a consulta falha e o bloco simplesmente não aparece.
    supabase.from("feed_buscas").select("cliente,primeira_em,ultima_em,buscas"),
    // Sem a 0014 (ou sem conta Google conectada por um admin) o bloco do Google não aparece.
    supabase.rpc("google_status"),
    supabase.from("google_inscricoes").select("email").maybeSingle(),
  ]);
  const googleNaHora = Boolean(status?.conectada) && membro !== null;

  return (
    <div className="wrap-estreito flex flex-col gap-6">
      <div>
        <h1 className="t-h2">Conectar ao seu calendário</h1>
        <p className="t-apoio mt-2">
          {googleNaHora
            ? "Leve a agenda da Insper AI para o calendário que você já usa. No Google Agenda os eventos chegam na hora; nos outros apps, por um link que o app busca de tempos em tempos."
            : "Adicione a agenda da Insper AI ao calendário que você já usa. Ela aparece junto dos seus compromissos e se atualiza sozinha; a velocidade depende do app (veja abaixo)."}
        </p>
      </div>
      {googleNaHora && membro && <GoogleNaHora membroId={membro.id} emailLogin={membro.email} inscricao={inscricao ?? null} />}
      <BuscasFeed buscas={buscas ?? []} agora={new Date()} />
      <Assinatura token={data?.token ?? null} googleNaHora={googleNaHora} />
    </div>
  );
}
