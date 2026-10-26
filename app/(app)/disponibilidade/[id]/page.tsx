import type { Metadata } from "next";
import Link from "next/link";
import PaginaVotacao from "@/components/votacao/PaginaVotacao";
import { obterMembroAtual } from "@/lib/membro";
import { supabaseServidor } from "@/lib/supabase/server";
import type { RespostaRow } from "@/lib/supabase/tipos";
import { aceitaRespostas, statusVotacao } from "@/lib/votacao";

export const metadata: Metadata = { title: "Disponibilidade" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A RLS só devolve o pedido para quem o criou ou foi convidado. */
export default async function PaginaVotacaoRota({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membro } = await obterMembroAtual();
  if (!membro || !UUID.test(id)) return <NaoEncontrada />;

  const supabase = await supabaseServidor();
  const { data: votacao } = await supabase.from("votacoes").select("*").eq("id", id).maybeSingle();
  if (!votacao) return <NaoEncontrada />;

  const souCriador = votacao.criado_por === membro.id;
  const [{ data: mapa }, { data: respostas }, { data: convidados }] = await Promise.all([
    supabase.rpc("mapa_votacao", { p_id: id }),
    // Para quem abriu, a RLS devolve todas; para os outros, só a própria.
    supabase.from("votacao_respostas").select("*").eq("votacao_id", id),
    souCriador ? supabase.from("votacao_convidados").select("member_id").eq("votacao_id", id) : Promise.resolve({ data: null }),
  ]);

  const mapaOk = mapa ?? { total: 0, respondidos: 0, contagem: {} };
  const minha = (respostas ?? []).find((r) => r.member_id === membro.id) ?? null;
  const agora = new Date();
  const aceita = aceitaRespostas(votacao, agora.getTime());

  let criador: { respostas: RespostaRow[]; convidados: { id: string; name: string }[] } | null = null;
  if (souCriador) {
    const ids = (convidados ?? []).map((c) => c.member_id);
    const { data: pessoas } = await supabase.from("members").select("id,name").in("id", ids).order("name");
    criador = { respostas: respostas ?? [], convidados: pessoas ?? [] };
  }

  return (
    <div className="wrap-estreito flex max-w-5xl flex-col">
      <PaginaVotacao
        votacao={votacao}
        status={statusVotacao(votacao, mapaOk.respondidos, mapaOk.total, agora)}
        aceita={aceita}
        minhaResposta={minha?.blocos ?? null}
        mapaInicial={mapaOk}
        criador={criador}
      />
    </div>
  );
}

function NaoEncontrada() {
  return (
    <div className="wrap-estreito flex flex-col items-start gap-3 py-10">
      <h1 className="t-h2">Pedido não encontrado</h1>
      <p className="t-apoio">Ele pode ter sido excluído, ou você não está entre os convidados. Se acha que devia estar, fale com quem mandou o link.</p>
      <Link href="/disponibilidade" className="text-[0.9rem] text-ia-cobalto underline underline-offset-4">
        Ver seus pedidos de disponibilidade
      </Link>
    </div>
  );
}
