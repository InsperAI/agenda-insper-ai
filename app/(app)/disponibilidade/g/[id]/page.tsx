import type { Metadata } from "next";
import TelaEstado from "@/components/estados/TelaEstado";
import PaginaAgendamento from "@/components/agendamento/PaginaAgendamento";
import { BotaoLink } from "@/components/ui/Botao";
import type { DadosAgendamento } from "@/lib/agendamento";
import { obterMembroAtual } from "@/lib/membro";
import { podeDecidirPedido } from "@/lib/niveis";
import { supabaseServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Horários por grupo" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A RLS (0012) só devolve o agendamento para convidados, quem criou e a diretoria. */
export default async function PaginaAgendamentoRota({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membro } = await obterMembroAtual();
  if (!membro || !UUID.test(id)) return <NaoEncontrado />;

  const supabase = await supabaseServidor();
  const { data: ag } = await supabase.from("agendamentos").select("*").eq("id", id).maybeSingle();
  if (!ag) return <NaoEncontrado />;

  const [{ data: horarios }, { data: grupos }, { data: integrantes }, { data: convidados }] = await Promise.all([
    supabase.from("agendamento_horarios").select("*").eq("agendamento_id", id).order("inicio"),
    supabase.from("agendamento_grupos").select("*").eq("agendamento_id", id),
    supabase.from("agendamento_integrantes").select("*").eq("agendamento_id", id),
    supabase.from("agendamento_convidados").select("member_id").eq("agendamento_id", id),
  ]);
  const ids = [...new Set([...(convidados ?? []).map((c) => c.member_id), ...(ag.criado_por ? [ag.criado_por] : [])])];
  const { data: pessoas } = ids.length ? await supabase.from("members").select("id,name").in("id", ids) : { data: [] };
  const nomes = Object.fromEntries((pessoas ?? []).map((p) => [p.id, p.name]));

  const dados: DadosAgendamento = {
    ag,
    horarios: horarios ?? [],
    grupos: grupos ?? [],
    integrantes: integrantes ?? [],
    convidados: (convidados ?? []).map((c) => c.member_id),
    nomes,
  };
  const souCriador = ag.criado_por === membro.id;

  return (
    <div className="wrap-estreito">
      <PaginaAgendamento
        dados={dados}
        meuId={membro.id}
        souConvidado={dados.convidados.includes(membro.id)}
        podeDecidir={podeDecidirPedido(membro, ag.criado_por)}
        podeExcluir={souCriador}
        pedidoPor={!souCriador && ag.criado_por ? (nomes[ag.criado_por] ?? null) : null}
      />
    </div>
  );
}

function NaoEncontrado() {
  return (
    <TelaEstado titulo="Agendamento não encontrado" texto="Ele pode ter sido excluído, ou você não está entre os convidados. Se acha que devia estar, fale com quem mandou o link.">
      <BotaoLink href="/disponibilidade" variante="primario">
        Ver seus pedidos
      </BotaoLink>
    </TelaEstado>
  );
}
