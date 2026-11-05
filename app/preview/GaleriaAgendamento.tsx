"use client";

import PaginaAgendamento from "@/components/agendamento/PaginaAgendamento";
import NovoPedido from "@/components/votacao/NovoPedido";
import type { DadosAgendamento } from "@/lib/agendamento";

const h = (id: string, inicio: string, fim: string) => ({ id, agendamento_id: "ag", inicio, fim });
const g = (id: string, nome: string, horario_id: string | null) => ({ id, agendamento_id: "ag", nome, horario_id, evento_id: null, criado_por: null, created_at: "" });

const DADOS: DadosAgendamento = {
  ag: {
    id: "ag",
    titulo: "Apresentação intermediária · projeto final",
    descricao: "Sala 405. Cada grupo tem 20 min: 15 de apresentação e 5 de perguntas.",
    prazo: "2030-11-10T21:00:00Z",
    niveis: ["trainee"],
    criado_por: "gu",
    confirmado_em: null,
    created_at: "",
  },
  horarios: [
    h("h1", "2030-11-12T17:00:00Z", "2030-11-12T17:20:00Z"),
    h("h2", "2030-11-12T17:25:00Z", "2030-11-12T17:45:00Z"),
    h("h3", "2030-11-12T17:50:00Z", "2030-11-12T18:10:00Z"),
    h("h4", "2030-11-12T18:15:00Z", "2030-11-12T18:35:00Z"),
    h("h5", "2030-11-13T13:00:00Z", "2030-11-13T13:20:00Z"),
    h("h6", "2030-11-13T13:25:00Z", "2030-11-13T13:45:00Z"),
  ],
  grupos: [g("ga", "Grupo Alfa", "h2"), g("gb", "Os Transformers", "h5"), g("gc", "Grupo 3", null)],
  integrantes: [
    { agendamento_id: "ag", member_id: "eu", grupo_id: "ga" },
    { agendamento_id: "ag", member_id: "bia", grupo_id: "ga" },
    { agendamento_id: "ag", member_id: "caio", grupo_id: "gb" },
    { agendamento_id: "ag", member_id: "duda", grupo_id: "gb" },
    { agendamento_id: "ag", member_id: "edu", grupo_id: "gc" },
  ],
  convidados: ["eu", "bia", "caio", "duda", "edu", "fe", "gabi"],
  nomes: { eu: "Alex Chequer", bia: "Beatriz Cury", caio: "Caio Reis", duda: "Duda Lima", edu: "Eduardo Prado", fe: "Fernanda Souza", gabi: "Gabriela Melo", gu: "Gustavo Pacheco" },
};

/** Horários por grupo com dados de exemplo: diretoria num grupo (edita) e trainee sem grupo. */
export default function GaleriaAgendamento() {
  return (
    <section id="agendamento" className="wrap-estreito flex flex-col gap-4 px-0">
      <h2 className="t-h3">Horários por grupo</h2>
      <PaginaAgendamento dados={DADOS} meuId="eu" souConvidado podeDecidir podeExcluir={false} pedidoPor="Gustavo Pacheco" />
      <h3 id="agendamento-novo" className="t-h4 mt-8">Novo pedido · horários por grupo</h3>
      <NovoPedido
        tipoInicial="grupos"
        meuId="eu"
        pessoas={[
          { id: "eu", name: "Alex Chequer", nivel: "diretoria" },
          { id: "fe", name: "Fernanda Souza", nivel: "trainee" },
          { id: "gabi", name: "Gabriela Melo", nivel: "trainee" },
        ]}
      />
      <h3 id="agendamento-trainee" className="t-h4 mt-8">Visão de um trainee sem grupo</h3>
      <PaginaAgendamento dados={DADOS} meuId="fe" souConvidado podeDecidir={false} podeExcluir={false} pedidoPor="Gustavo Pacheco" />
    </section>
  );
}
