import type { Metadata } from "next";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/Botao";
import { IcoChecar, IcoMais } from "@/components/ui/Icones";
import { dataHoraCurta } from "@/lib/datas";
import { obterMembroAtual } from "@/lib/membro";
import { podeEditar } from "@/lib/niveis";
import { supabaseServidor } from "@/lib/supabase/server";
import type { VotacaoRow } from "@/lib/supabase/tipos";
import { aceitaRespostas, rotuloDuracao } from "@/lib/votacao";

export const metadata: Metadata = { title: "Disponibilidade" };

/** Pedidos de disponibilidade em que estou (convidado ou quem pediu). A RLS já filtra. */
export default async function PaginaVotacoes() {
  const { membro } = await obterMembroAtual();
  if (!membro) return null;

  const supabase = await supabaseServidor();
  const [{ data: votacoes }, { data: minhas }] = await Promise.all([
    supabase.from("votacoes").select("*").order("created_at", { ascending: false }),
    supabase.from("votacao_respostas").select("votacao_id").eq("member_id", membro.id),
  ]);

  const respondidas = new Set((minhas ?? []).map((r) => r.votacao_id));
  const agora = new Date().getTime();
  const lista = votacoes ?? [];
  const pendentes = lista.filter((v) => aceitaRespostas(v, agora) && !respondidas.has(v.id));
  const demais = lista.filter((v) => !pendentes.includes(v));

  return (
    <div className="wrap-estreito flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-h2">Disponibilidade</h1>
          <p className="t-apoio mt-2">Marque os horários em que você pode. Quem fez o pedido escolhe o melhor e ele entra direto na agenda.</p>
        </div>
        {podeEditar(membro.nivel) && (
          <BotaoLink href="/disponibilidade/nova" variante="primario">
            <IcoMais /> Pedir disponibilidade
          </BotaoLink>
        )}
      </div>

      {lista.length === 0 && <p className="t-apoio">Nenhum pedido de disponibilidade por aqui ainda.</p>}

      {pendentes.length > 0 && <Lista titulo={`Esperando sua resposta · ${pendentes.length}`} votacoes={pendentes} respondidas={respondidas} meuId={membro.id} agora={agora} />}
      {demais.length > 0 && <Lista titulo="Outras" votacoes={demais} respondidas={respondidas} meuId={membro.id} agora={agora} />}
    </div>
  );
}

function Lista({ titulo, votacoes, respondidas, meuId, agora }: { titulo: string; votacoes: VotacaoRow[]; respondidas: Set<string>; meuId: string; agora: number }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="t-meta">{titulo}</h2>
      <ul className="divide-y divide-ia-regua overflow-hidden rounded-xl border border-ia-regua">
        {votacoes.map((v) => (
          <li key={v.id}>
            <Link href={`/disponibilidade/${v.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ia-nevoa">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.95rem] text-ia-petroleo">
                  {v.titulo}
                  {v.criado_por === meuId && <span className="ml-2 rounded-full bg-ia-nevoa px-2 py-0.5 text-[0.7rem] text-ia-apoio">você pediu</span>}
                </p>
                <p className="truncate text-[0.8125rem] text-ia-apoio">
                  {rotuloDuracao(v.duracao_min)} · {v.modo === "recorrente" ? "recorrente" : "data única"} · {situacao(v, agora)}
                </p>
              </div>
              {respondidas.has(v.id) && (
                <span className="inline-flex items-center gap-1 text-[0.8125rem] text-ia-apoio">
                  <IcoChecar width={14} height={14} /> respondida
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function situacao(v: VotacaoRow, agora: number): string {
  if (v.confirmada_em) return "confirmada";
  if (Date.parse(v.prazo) <= agora) return "prazo encerrado";
  return `até ${dataHoraCurta(new Date(v.prazo))}`;
}
