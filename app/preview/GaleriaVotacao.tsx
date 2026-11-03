"use client";

import { useState } from "react";
import AbasPedidos from "@/components/votacao/AbasPedidos";
import GradeVotacao from "@/components/votacao/GradeVotacao";
import ListaPedidos, { VazioPedidos } from "@/components/votacao/ListaPedidos";
import ResultadoVotacao from "@/components/votacao/ResultadoVotacao";
import type { RespostaRow, VotacaoRow } from "@/lib/supabase/tipos";
import { chaveBloco } from "@/lib/votacao";

const DIAS = ["2026-11-03", "2026-11-04", "2026-11-05"];
const faixa = (dia: string, de: number, ate: number) => Array.from({ length: ate - de }, (_, i) => chaveBloco(dia, de + i));

const RESPOSTAS: RespostaRow[] = [
  { votacao_id: "v", member_id: "m1", blocos: [...faixa(DIAS[0], 2, 8), ...faixa(DIAS[1], 18, 24)], updated_at: "" },
  { votacao_id: "v", member_id: "m2", blocos: [...faixa(DIAS[0], 4, 10), ...faixa(DIAS[2], 0, 6)], updated_at: "" },
  { votacao_id: "v", member_id: "m3", blocos: [...faixa(DIAS[0], 5, 9), ...faixa(DIAS[1], 20, 26)], updated_at: "" },
];

const VOTACAO: VotacaoRow = {
  id: "v",
  titulo: "Planejamento do semestre",
  descricao: "",
  modo: "unica",
  dias: DIAS,
  duracao_min: 60,
  prazo: "2026-11-01T23:00:00Z",
  niveis: ["diretoria"],
  criado_por: "m1",
  evento_id: null,
  confirmada_em: null,
  codigo: "k7m2xq4",
  created_at: "",
};

/** Pedido de disponibilidade com dados de exemplo: grade editável, mapa de calor e painel de resultado. */
export default function GaleriaVotacao() {
  const [minhas, setMinhas] = useState<Set<string>>(() => new Set(RESPOSTAS[0].blocos));
  const contagem: Record<string, number> = {};
  for (const r of RESPOSTAS) for (const k of r.blocos) contagem[k] = (contagem[k] ?? 0) + 1;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="t-h3">Pedido de disponibilidade</h2>
      <ResultadoVotacao
        votacao={VOTACAO}
        respostas={RESPOSTAS}
        convidados={[
          { id: "m1", name: "Guilherme Leal" },
          { id: "m2", name: "Alex Chequer" },
          { id: "m3", name: "Bia Lima" },
          { id: "m4", name: "Caio Reis" },
        ]}
        podeExcluir={false}
        pedidoPor="Lucas Marchesini"
        aoAvisar={() => {}}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <GradeVotacao modo="unica" dias={DIAS} minhas={minhas} contagem={contagem} total={4} vista="minha" editavel aoMudar={setMinhas} />
        <GradeVotacao modo="unica" dias={DIAS} minhas={minhas} contagem={contagem} total={4} vista="todos" editavel={false} aoMudar={() => {}} />
      </div>
      <ListaDePedidos />
    </section>
  );
}

const AGORA = Date.parse("2026-11-03T15:00:00Z");
const pedido = (id: string, titulo: string, extra: Partial<VotacaoRow>): VotacaoRow => ({ ...VOTACAO, id, titulo, ...extra });

/** Página Disponibilidade: abas e seções. */
function ListaDePedidos() {
  const comum = {
    respondidas: new Set(["b"]),
    andamento: new Map([
      ["a", "pedido por Lucas Marchesini · 2 de 6 responderam"],
      ["b", "4 de 6 responderam"],
      ["c", "pedido por Guilherme Leal · 6 de 6 responderam"],
    ]),
    meuId: "eu",
    agora: AGORA,
  };
  return (
    <div className="wrap-estreito flex flex-col gap-6 px-0">
      <AbasPedidos ativa="abertos" abertos={3} encerrados={5} />
      <ListaPedidos titulo="Esperando sua resposta · 1" votacoes={[pedido("a", "Bate papo sobre o Núcleo de Projetos", { prazo: "2026-11-05T18:00:00Z" })]} {...comum} />
      <ListaPedidos titulo="Falta confirmar o horário · 1" votacoes={[pedido("c", "Reunião semanal diretoria", { prazo: "2026-11-01T15:00:00Z" })]} {...comum} />
      <ListaPedidos titulo="Em andamento · 1" votacoes={[pedido("b", "Planejamento do semestre", { prazo: "2026-11-07T18:00:00Z", criado_por: "eu" })]} {...comum} />
      <AbasPedidos ativa="encerrados" abertos={0} encerrados={0} />
      <VazioPedidos texto="Nenhum pedido aberto agora." dica="Para marcar uma reunião, use “Pedir disponibilidade”." />
    </div>
  );
}
