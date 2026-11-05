import type { Metadata } from "next";
import AbasPedidos, { type Aba } from "@/components/votacao/AbasPedidos";
import ListaPedidos, { VazioPedidos } from "@/components/votacao/ListaPedidos";
import { BotaoLink } from "@/components/ui/Botao";
import { IcoMais } from "@/components/ui/Icones";
import { pedidoDeAgendamento, pedidoDeVotacao, porCriacao, type Pedido } from "@/lib/itensPedidos";
import { obterMembroAtual } from "@/lib/membro";
import { podeCriarEvento, podeEditar } from "@/lib/niveis";
import { separarPedidos } from "@/lib/pedidos";
import { supabaseServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Disponibilidade" };

/**
 * Pedidos de disponibilidade e horários por grupo, em duas abas. A RLS já
 * filtra: cada um vê aqueles em que foi convidado ou que criou; a diretoria vê
 * todos (0005, 0012) e decide qualquer um (0010). Abertos se dividem pelo que
 * cada um precisa fazer.
 */
export default async function PaginaVotacoes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const aba: Aba = (await searchParams).aba === "encerrados" ? "encerrados" : "abertos";
  const { membro } = await obterMembroAtual();
  if (!membro) return null;
  const diretoria = podeEditar(membro.nivel);
  const podeCriar = podeCriarEvento(membro.nivel);
  const pedidos = await carregarPedidos(membro.id, diretoria);

  const agora = new Date().getTime();
  const g = separarPedidos(pedidos, { eu: membro, agora, pendente: (p) => p.pendente });
  const itens = (lista: Pedido[]) => lista.map((p) => p.item);

  return (
    <div className="wrap-estreito flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-h2">Disponibilidade</h1>
          <p className="t-apoio mt-2">Marque os horários em que você pode, ou forme seu grupo e reserve um horário. Quem pediu ou a diretoria confirma, e entra direto na agenda.</p>
        </div>
        {podeCriar && (
          <BotaoLink href="/disponibilidade/nova" variante="primario">
            <IcoMais /> Novo pedido
          </BotaoLink>
        )}
      </div>

      {pedidos.length === 0 ? (
        <p className="t-apoio">Nenhum pedido por aqui ainda.</p>
      ) : (
        <>
          <AbasPedidos ativa={aba} abertos={g.totalAbertos} encerrados={g.encerrados.length} />
          {aba === "abertos" ? (
            g.totalAbertos === 0 ? (
              <VazioPedidos texto="Nenhum pedido aberto agora." dica={podeCriar ? "Para marcar uma reunião ou horários de grupos, use “Novo pedido”." : undefined} />
            ) : (
              <div className="flex flex-col gap-8">
                {g.responder.length > 0 && <ListaPedidos titulo={`Esperando você · ${g.responder.length}`} itens={itens(g.responder)} />}
                {g.decidir.length > 0 && <ListaPedidos titulo={`Falta confirmar · ${g.decidir.length}`} itens={itens(g.decidir)} />}
                {g.andamento.length > 0 && <ListaPedidos titulo={`Em andamento · ${g.andamento.length}`} itens={itens(g.andamento)} />}
              </div>
            )
          ) : g.encerrados.length === 0 ? (
            <VazioPedidos texto="Nenhum pedido encerrado ainda." dica="Aqui ficam os pedidos confirmados e os que venceram sem confirmação." />
          ) : (
            <ListaPedidos titulo="Confirmados e vencidos" itens={itens(g.encerrados)} />
          )}
        </>
      )}
    </div>
  );
}

/** As duas espécies de pedido no formato comum, mais novos primeiro. */
async function carregarPedidos(meuId: string, diretoria: boolean): Promise<Pedido[]> {
  const supabase = await supabaseServidor();
  // Para a diretoria, a RLS devolve todos os convites/respostas/grupos; para os outros, só o que podem ver.
  const [vot, conv, resp, ags, agConv, grupos, integ, horarios] = await Promise.all([
    supabase.from("votacoes").select("*"),
    supabase.from("votacao_convidados").select("votacao_id,member_id"),
    supabase.from("votacao_respostas").select("votacao_id,member_id"),
    supabase.from("agendamentos").select("*"),
    supabase.from("agendamento_convidados").select("agendamento_id,member_id").eq("member_id", meuId),
    supabase.from("agendamento_grupos").select("id,agendamento_id,nome,horario_id"),
    supabase.from("agendamento_integrantes").select("agendamento_id,grupo_id").eq("member_id", meuId),
    supabase.from("agendamento_horarios").select("agendamento_id"),
  ]);
  const votacoes = vot.data ?? [];
  const agendamentos = ags.data ?? [];

  const criadores = [...new Set([...votacoes, ...agendamentos].map((p) => p.criado_por).filter((id): id is string => !!id && id !== meuId))];
  const { data: pessoas } = criadores.length ? await supabase.from("members").select("id,name").in("id", criadores) : { data: [] };
  const nomes = new Map((pessoas ?? []).map((p) => [p.id, p.name]));
  const ctx = { meuId, agora: Date.now(), nomes };

  const contar = <T,>(linhas: T[], chave: (l: T) => string) => linhas.reduce((m, l) => m.set(chave(l), (m.get(chave(l)) ?? 0) + 1), new Map<string, number>());
  const convites = conv.data ?? [];
  const respostas = resp.data ?? [];
  const totalConv = contar(convites, (l) => l.votacao_id);
  const totalResp = contar(respostas, (l) => l.votacao_id);
  const meusConv = new Set(convites.filter((l) => l.member_id === meuId).map((l) => l.votacao_id));
  const minhasResp = new Set(respostas.filter((l) => l.member_id === meuId).map((l) => l.votacao_id));

  const listaGrupos = grupos.data ?? [];
  const nomeGrupo = new Map(listaGrupos.map((gr) => [gr.id, gr.nome]));
  const meuGrupo = new Map((integ.data ?? []).map((i) => [i.agendamento_id, nomeGrupo.get(i.grupo_id) ?? null]));
  const meusAgConv = new Set((agConv.data ?? []).map((c) => c.agendamento_id));
  const gruposPorAg = contar(listaGrupos, (gr) => gr.agendamento_id);
  const reservadosPorAg = contar(
    listaGrupos.filter((gr) => gr.horario_id),
    (gr) => gr.agendamento_id,
  );
  const horariosPorAg = contar(horarios.data ?? [], (h) => h.agendamento_id);

  return [
    ...votacoes.map((v) =>
      pedidoDeVotacao(v, {
        ...ctx,
        convidado: meusConv.has(v.id),
        respondi: minhasResp.has(v.id),
        andamento: diretoria ? { responderam: totalResp.get(v.id) ?? 0, total: totalConv.get(v.id) ?? 0 } : undefined,
      }),
    ),
    ...agendamentos.map((a) =>
      pedidoDeAgendamento(a, {
        ...ctx,
        convidado: meusAgConv.has(a.id),
        meuGrupo: meuGrupo.get(a.id) ?? null,
        grupos: gruposPorAg.get(a.id) ?? 0,
        reservados: reservadosPorAg.get(a.id) ?? 0,
        horarios: horariosPorAg.get(a.id) ?? 0,
      }),
    ),
  ].sort(porCriacao);
}
