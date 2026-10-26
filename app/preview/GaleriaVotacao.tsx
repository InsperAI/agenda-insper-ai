"use client";

import { useState } from "react";
import GradeVotacao from "@/components/votacao/GradeVotacao";
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
        aoAvisar={() => {}}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <GradeVotacao modo="unica" dias={DIAS} minhas={minhas} contagem={contagem} total={4} vista="minha" editavel aoMudar={setMinhas} />
        <GradeVotacao modo="unica" dias={DIAS} minhas={minhas} contagem={contagem} total={4} vista="todos" editavel={false} aoMudar={() => {}} />
      </div>
    </section>
  );
}
