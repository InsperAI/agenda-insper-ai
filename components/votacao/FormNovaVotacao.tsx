"use client";

import { addDays, addWeeks } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import Botao from "@/components/ui/Botao";
import Campo from "@/components/ui/Campo";
import Segmentado from "@/components/ui/Segmentado";
import { Chips, SeletorConvidados, useConvidados, type Pessoa } from "./Convidados";
import { dataCurta } from "@/lib/datas";
import { agoraSP, chaveDia, deChaveDia, deInputDataHora, inicioDaSemana, paraInputDataHora } from "@/lib/fuso";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { ModoVotacao } from "@/lib/supabase/tipos";
import { DIAS_DA_SEMANA, diasDaSemana, rotuloDuracao, traduzirErroVotacao } from "@/lib/votacao";


const MODOS: { valor: ModoVotacao; rotulo: string }[] = [
  { valor: "unica", rotulo: "Data única" },
  { valor: "recorrente", rotulo: "Recorrente" },
];
const DURACOES = [30, 60, 90, 120, 150, 180, 240];
const DIAS_UTEIS = ["1", "2", "3", "4", "5"];
const PRAZO_PADRAO_DIAS = 3;

/** Cria um pedido de disponibilidade (criar_votacao): dias, duração, prazo e convidados. */
export default function FormNovaVotacao({ pessoas, meuId }: { pessoas: Pessoa[]; meuId: string }) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const router = useRouter();
  const hoje = agoraSP();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modo, setModo] = useState<ModoVotacao>("unica");
  const [semana, setSemana] = useState(() => chaveDia(addWeeks(inicioDaSemana(hoje), 1)));
  const [dias, setDias] = useState<string[]>(DIAS_UTEIS);
  const [duracao, setDuracao] = useState(60);
  const [prazo, setPrazo] = useState(() => paraInputDataHora(addDays(hoje, PRAZO_PADRAO_DIAS)));
  const c = useConvidados(pessoas, meuId);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const segunda = chaveDia(inicioDaSemana(deChaveDia(semana)));
  function alternar<T>(lista: readonly T[], item: T): T[] {
    return lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item];
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return setErro("Dê um título ao pedido.");
    if (dias.length === 0) return setErro("Escolha pelo menos um dia.");
    const prazoData = deInputDataHora(prazo);
    if (Number.isNaN(prazoData.getTime()) || prazoData.getTime() <= new Date().getTime()) return setErro("O prazo precisa ser no futuro.");
    if (c.total < 2) return setErro("Convide pelo menos mais uma pessoa.");

    setErro(null);
    setOcupado(true);
    const { data, error } = await sb.rpc("criar_votacao", {
      p_titulo: titulo.trim(),
      p_descricao: descricao.trim(),
      p_modo: modo,
      p_dias: modo === "unica" ? diasDaSemana(segunda, dias) : [...dias].sort(),
      p_duracao_min: duracao,
      p_prazo: prazoData.toISOString(),
      p_niveis: c.niveis,
      p_incluir: [...c.incluir],
      p_excluir: [...c.excluir],
    });
    setOcupado(false);
    if (error || !data) return setErro(error ? traduzirErroVotacao(error.message) : "Não foi possível criar o pedido.");
    router.push(`/disponibilidade/${data}`);
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
      <Campo id="v-titulo" rotulo="Título">
        <input id="v-titulo" className="campo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} placeholder="Reunião de planejamento do semestre" autoFocus />
      </Campo>
      <Campo id="v-desc" rotulo="Descrição" opcional>
        <textarea id="v-desc" className="campo" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={1000} rows={2} />
      </Campo>

      <div className="flex flex-col gap-1.5">
        <span className="text-[0.8125rem] text-ia-apoio">Tipo</span>
        <Segmentado opcoes={MODOS} valor={modo} aoMudar={setModo} rotulo="Tipo de pedido" className="self-start" />
        <p className="text-[0.8125rem] text-ia-meta">
          {modo === "unica" ? "Para uma reunião numa semana específica." : "Para algo que se repete (ex.: aula semanal): vota-se o dia da semana e o horário."}
        </p>
      </div>

      {modo === "unica" && (
        <Campo id="v-semana" rotulo="Semana" dica={`Semana de ${dataCurta(deChaveDia(segunda))} a ${dataCurta(addDays(deChaveDia(segunda), 6))}`}>
          <input id="v-semana" type="date" className="campo sm:w-56" value={semana} onChange={(e) => e.target.value && setSemana(e.target.value)} />
        </Campo>
      )}

      <Chips
        rotulo="Dias"
        opcoes={DIAS_DA_SEMANA.map((d) => ({ id: d.id, rotulo: d.curto }))}
        ligados={dias}
        aoAlternar={(id) => setDias((ds) => alternar(ds, id))}
        dica="Horários das 8h às 21h, em blocos de 30 min."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo id="v-duracao" rotulo="Duração da reunião">
          <select id="v-duracao" className="campo" value={duracao} onChange={(e) => setDuracao(Number(e.target.value))}>
            {DURACOES.map((m) => (
              <option key={m} value={m}>
                {rotuloDuracao(m)}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="v-prazo" rotulo="Prazo para responder">
          <input id="v-prazo" type="datetime-local" className="campo" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </Campo>
      </div>

      <SeletorConvidados c={c} pessoas={pessoas} meuId={meuId} />

      {erro && (
        <p role="alert" className="rounded-lg bg-perigo-fundo px-3 py-2 text-[0.875rem] text-perigo">
          {erro}
        </p>
      )}
      <div className="flex justify-end">
        <Botao variante="primario" type="submit" disabled={ocupado}>
          {ocupado ? "Criando…" : "Pedir disponibilidade"}
        </Botao>
      </div>
    </form>
  );
}
