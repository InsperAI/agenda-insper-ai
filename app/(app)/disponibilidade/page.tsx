import type { Metadata } from "next";
import AbasPedidos, { type Aba } from "@/components/votacao/AbasPedidos";
import ListaPedidos, { VazioPedidos } from "@/components/votacao/ListaPedidos";
import { BotaoLink } from "@/components/ui/Botao";
import { obterMembroAtual } from "@/lib/membro";
import { IcoMais } from "@/components/ui/Icones";
import { podeCriarEvento, podeEditar } from "@/lib/niveis";
import { separarPedidos } from "@/lib/pedidos";
import { supabaseServidor } from "@/lib/supabase/server";
import type { VotacaoRow } from "@/lib/supabase/tipos";

export const metadata: Metadata = { title: "Disponibilidade" };

/**
 * Pedidos de disponibilidade em duas abas. A RLS já filtra: cada um vê aqueles
 * em que foi convidado ou que criou; a diretoria vê todos (0005) e decide
 * qualquer um (0010). Abertos se dividem pelo que cada um precisa fazer.
 */
export default async function PaginaVotacoes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const aba: Aba = (await searchParams).aba === "encerrados" ? "encerrados" : "abertos";
  const { membro } = await obterMembroAtual();
  if (!membro) return null;
  const diretoria = podeEditar(membro.nivel);
  const podeCriar = podeCriarEvento(membro.nivel);

  const supabase = await supabaseServidor();
  const [{ data: votacoes }, { data: convites }, { data: respostas }] = await Promise.all([
    supabase.from("votacoes").select("*").order("created_at", { ascending: false }),
    // Para a diretoria, a RLS devolve todos os convites e respostas; para os outros, só os próprios.
    supabase.from("votacao_convidados").select("votacao_id,member_id"),
    supabase.from("votacao_respostas").select("votacao_id,member_id"),
  ]);

  const meus = (linhas: { votacao_id: string; member_id: string }[] | null) =>
    new Set((linhas ?? []).filter((l) => l.member_id === membro.id).map((l) => l.votacao_id));
  const respondidas = meus(respostas);
  const agora = new Date().getTime();
  const lista = votacoes ?? [];
  const g = separarPedidos(lista, { eu: membro, convidado: meus(convites), respondidas, agora });
  const andamento = diretoria ? await descreverAndamento(lista, convites ?? [], respostas ?? [], membro.id) : new Map<string, string>();
  const comum = { respondidas, andamento, meuId: membro.id, agora };

  return (
    <div className="wrap-estreito flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-h2">Disponibilidade</h1>
          <p className="t-apoio mt-2">Marque os horários em que você pode. Quem fez o pedido ou a diretoria escolhe o melhor, e ele entra direto na agenda.</p>
        </div>
        {podeCriar && (
          <BotaoLink href="/disponibilidade/nova" variante="primario">
            <IcoMais /> Pedir disponibilidade
          </BotaoLink>
        )}
      </div>

      {lista.length === 0 ? (
        <p className="t-apoio">Nenhum pedido de disponibilidade por aqui ainda.</p>
      ) : (
        <>
          <AbasPedidos ativa={aba} abertos={g.totalAbertos} encerrados={g.encerrados.length} />
          {aba === "abertos" ? (
            g.totalAbertos === 0 ? (
              <VazioPedidos texto="Nenhum pedido aberto agora." dica={podeCriar ? "Para marcar uma reunião, use “Pedir disponibilidade”." : undefined} />
            ) : (
              <div className="flex flex-col gap-8">
                {g.responder.length > 0 && <ListaPedidos titulo={`Esperando sua resposta · ${g.responder.length}`} votacoes={g.responder} {...comum} />}
                {g.decidir.length > 0 && <ListaPedidos titulo={`Falta confirmar o horário · ${g.decidir.length}`} votacoes={g.decidir} {...comum} />}
                {g.andamento.length > 0 && <ListaPedidos titulo={`Em andamento · ${g.andamento.length}`} votacoes={g.andamento} {...comum} />}
              </div>
            )
          ) : g.encerrados.length === 0 ? (
            <VazioPedidos texto="Nenhum pedido encerrado ainda." dica="Aqui ficam os pedidos com horário confirmado e os que venceram sem confirmação." />
          ) : (
            <ListaPedidos titulo="Confirmados e vencidos" votacoes={g.encerrados} {...comum} />
          )}
        </>
      )}
    </div>
  );
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
