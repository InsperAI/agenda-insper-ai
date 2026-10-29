import type { Metadata } from "next";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/Botao";
import { IcoChecar, IcoMais } from "@/components/ui/Icones";
import { dataHoraCurta } from "@/lib/datas";
import { obterMembroAtual } from "@/lib/membro";
import { podeCriarEvento, podeEditar } from "@/lib/niveis";
import { supabaseServidor } from "@/lib/supabase/server";
import type { VotacaoRow } from "@/lib/supabase/tipos";
import { aceitaRespostas, rotuloDuracao } from "@/lib/votacao";

export const metadata: Metadata = { title: "Disponibilidade" };

/**
 * Pedidos de disponibilidade. A RLS já filtra: cada um vê aqueles em que foi
 * convidado ou que criou; a diretoria vê todos (0005) e ganha a seção
 * "Aguardando disponibilidade" com o andamento de cada pedido em aberto.
 */
export default async function PaginaVotacoes() {
  const { membro } = await obterMembroAtual();
  if (!membro) return null;
  const diretoria = podeEditar(membro.nivel);

  const supabase = await supabaseServidor();
  const [{ data: votacoes }, { data: convites }, { data: respostas }] = await Promise.all([
    supabase.from("votacoes").select("*").order("created_at", { ascending: false }),
    // Para a diretoria, a RLS devolve todos os convites e respostas; para os outros, só os próprios.
    supabase.from("votacao_convidados").select("votacao_id,member_id"),
    supabase.from("votacao_respostas").select("votacao_id,member_id"),
  ]);

  const meus = (linhas: { votacao_id: string; member_id: string }[] | null) =>
    new Set((linhas ?? []).filter((l) => l.member_id === membro.id).map((l) => l.votacao_id));
  const convidado = meus(convites);
  const respondidas = meus(respostas);
  const agora = new Date().getTime();
  const lista = votacoes ?? [];
  const abertas = lista.filter((v) => aceitaRespostas(v, agora));
  const pendentes = abertas.filter((v) => convidado.has(v.id) && !respondidas.has(v.id));
  const aguardando = diretoria ? abertas.filter((v) => !pendentes.includes(v)) : [];
  const demais = lista.filter((v) => !pendentes.includes(v) && !aguardando.includes(v));
  const andamento = diretoria ? await descreverAndamento(lista, convites ?? [], respostas ?? [], membro.id) : new Map<string, string>();

  return (
    <div className="wrap-estreito flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-h2">Disponibilidade</h1>
          <p className="t-apoio mt-2">Marque os horários em que você pode. Quem fez o pedido escolhe o melhor e ele entra direto na agenda.</p>
        </div>
        {podeCriarEvento(membro.nivel) && (
          <BotaoLink href="/disponibilidade/nova" variante="primario">
            <IcoMais /> Pedir disponibilidade
          </BotaoLink>
        )}
      </div>

      {lista.length === 0 && <p className="t-apoio">Nenhum pedido de disponibilidade por aqui ainda.</p>}

      {pendentes.length > 0 && (
        <Lista titulo={`Esperando sua resposta · ${pendentes.length}`} votacoes={pendentes} respondidas={respondidas} andamento={andamento} meuId={membro.id} agora={agora} />
      )}
      {aguardando.length > 0 && (
        <Lista titulo={`Aguardando disponibilidade · ${aguardando.length}`} votacoes={aguardando} respondidas={respondidas} andamento={andamento} meuId={membro.id} agora={agora} />
      )}
      {demais.length > 0 && (
        <Lista titulo={diretoria ? "Encerrados" : "Outras"} votacoes={demais} respondidas={respondidas} andamento={andamento} meuId={membro.id} agora={agora} />
      )}
    </div>
  );
}

function Lista({
  titulo,
  votacoes,
  respondidas,
  andamento,
  meuId,
  agora,
}: {
  titulo: string;
  votacoes: VotacaoRow[];
  respondidas: Set<string>;
  andamento: Map<string, string>;
  meuId: string;
  agora: number;
}) {
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
                  {andamento.has(v.id) && ` · ${andamento.get(v.id)}`}
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

/** "pedido por Ana · 3 de 7 responderam", para a diretoria acompanhar. */
async function descreverAndamento(
  votacoes: VotacaoRow[],
  convites: { votacao_id: string }[],
  respostas: { votacao_id: string }[],
  meuId: string,
): Promise<Map<string, string>> {
  const contar = (linhas: { votacao_id: string }[]) => linhas.reduce((m, l) => m.set(l.votacao_id, (m.get(l.votacao_id) ?? 0) + 1), new Map<string, number>());
  const total = contar(convites);
  const responderam = contar(respostas);
  const criadores = [...new Set(votacoes.map((v) => v.criado_por).filter((id): id is string => !!id && id !== meuId))];
  const supabase = await supabaseServidor();
  const { data: pessoas } = criadores.length ? await supabase.from("members").select("id,name").in("id", criadores) : { data: [] };
  const nomes = new Map((pessoas ?? []).map((p) => [p.id, p.name]));
  return new Map(
    votacoes.map((v) => {
      const quem = v.criado_por && v.criado_por !== meuId ? `pedido por ${nomes.get(v.criado_por) ?? "alguém"} · ` : "";
      return [v.id, `${quem}${responderam.get(v.id) ?? 0} de ${total.get(v.id) ?? 0} responderam`];
    }),
  );
}
