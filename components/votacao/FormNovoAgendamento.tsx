"use client";

import { addDays, isWeekend } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import Botao from "@/components/ui/Botao";
import Campo from "@/components/ui/Campo";
import { IcoFechar, IcoMais } from "@/components/ui/Icones";
import { gerarHorarios, MAX_HORARIOS, porDia, traduzirErroAgendamento, type Janela } from "@/lib/agendamento";
import { dataCurta, diaSemanaCurto, hora } from "@/lib/datas";
import { agoraSP, chaveDia, deChaveDia, deInputDataHora, paraInputDataHora } from "@/lib/fuso";
import { supabaseNavegador } from "@/lib/supabase/client";
import { SeletorConvidados, useConvidados, type Pessoa } from "./Convidados";

const DURACOES = [10, 15, 20, 25, 30, 40, 45, 60, 90, 120];
const INTERVALOS = [0, 5, 10, 15, 20, 30];
const PRAZO_PADRAO_DIAS = 2;
/** Primeiro dia sugerido: daqui a uma semana, para caber o prazo antes. */
const PRIMEIRO_DIA_EM = 7;

/** Primeiro dia útil a partir de daqui a uma semana. */
function proximoDiaUtil(): string {
  let d = addDays(agoraSP(), PRIMEIRO_DIA_EM);
  while (isWeekend(d)) d = addDays(d, 1);
  return chaveDia(d);
}

/**
 * Cria horários para grupos (criar_agendamento, 0012): janelas fatiadas em
 * horários, prazo e convidados. Os grupos se formam depois, na página dele.
 */
export default function FormNovoAgendamento({ pessoas, meuId }: { pessoas: Pessoa[]; meuId: string }) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [janelas, setJanelas] = useState<Janela[]>(() => [{ dia: proximoDiaUtil(), inicio: "14:00", fim: "18:00" }]);
  const [duracao, setDuracao] = useState(20);
  const [intervalo, setIntervalo] = useState(5);
  const [prazo, setPrazo] = useState(() => paraInputDataHora(addDays(agoraSP(), PRAZO_PADRAO_DIAS)));
  const c = useConvidados(pessoas, meuId, ["trainee"]);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const horarios = useMemo(() => gerarHorarios(janelas, duracao, intervalo), [janelas, duracao, intervalo]);
  const dias = useMemo(() => porDia(horarios), [horarios]);

  const mudarJanela = (i: number, campo: keyof Janela, valor: string) => setJanelas((js) => js.map((j, k) => (k === i ? { ...j, [campo]: valor } : j)));
  const adicionarJanela = () =>
    setJanelas((js) => {
      const ultima = js.at(-1);
      const dia = ultima ? chaveDia(addDays(deChaveDia(ultima.dia), 1)) : proximoDiaUtil();
      return [...js, { dia, inicio: ultima?.inicio ?? "14:00", fim: ultima?.fim ?? "18:00" }];
    });
  const removerJanela = (i: number) => setJanelas((js) => js.filter((_, k) => k !== i));

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return setErro("Dê um título.");
    if (horarios.length === 0) return setErro("Nenhum horário cabe nas janelas: confira os dias, as horas e a duração.");
    if (horarios.length > MAX_HORARIOS) return setErro(`São ${horarios.length} horários; o máximo é ${MAX_HORARIOS}.`);
    const agora = new Date().getTime();
    if (horarios[0].inicio.getTime() <= agora) return setErro("Os horários precisam ser no futuro.");
    const prazoData = deInputDataHora(prazo);
    if (Number.isNaN(prazoData.getTime()) || prazoData.getTime() <= agora) return setErro("O prazo precisa ser no futuro.");
    if (prazoData > horarios[0].inicio) return setErro("O prazo para escolher precisa ser antes do primeiro horário.");
    if (c.total < 2) return setErro("Convide pelo menos mais uma pessoa.");

    setErro(null);
    setOcupado(true);
    const { data, error } = await sb.rpc("criar_agendamento", {
      p_titulo: titulo.trim(),
      p_descricao: descricao.trim(),
      p_prazo: prazoData.toISOString(),
      p_niveis: c.niveis,
      p_incluir: [...c.incluir],
      p_excluir: [...c.excluir],
      p_horarios: horarios.map((h) => ({ inicio: h.inicio.toISOString(), fim: h.fim.toISOString() })),
    });
    setOcupado(false);
    if (error || !data) return setErro(error ? traduzirErroAgendamento(error.message) : "Não foi possível criar.");
    router.push(`/disponibilidade/g/${data}`);
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
      <Campo id="a-titulo" rotulo="Título">
        <input id="a-titulo" className="campo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} placeholder="Apresentação intermediária do projeto final" autoFocus />
      </Campo>
      <Campo id="a-desc" rotulo="Descrição" opcional>
        <textarea id="a-desc" className="campo" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={1000} rows={2} placeholder="Onde vai ser, o que levar…" />
      </Campo>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[0.8125rem] text-ia-apoio">Quando</legend>
        {janelas.map((j, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input type="date" aria-label={`Dia ${i + 1}`} className="campo basis-full sm:w-44 sm:basis-auto" value={j.dia} onChange={(e) => e.target.value && mudarJanela(i, "dia", e.target.value)} />
            <input type="time" aria-label={`Início ${i + 1}`} step={300} className="campo w-[6.5rem]" value={j.inicio} onChange={(e) => mudarJanela(i, "inicio", e.target.value)} />
            <span className="text-ia-meta">às</span>
            <input type="time" aria-label={`Fim ${i + 1}`} step={300} className="campo w-[6.5rem]" value={j.fim} onChange={(e) => mudarJanela(i, "fim", e.target.value)} />
            {janelas.length > 1 && (
              <button
                type="button"
                onClick={() => removerJanela(i)}
                aria-label={`Remover dia ${i + 1}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ia-apoio hover:bg-ia-nevoa hover:text-ia-petroleo"
              >
                <IcoFechar />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={adicionarJanela} className="inline-flex items-center gap-1.5 self-start text-[0.875rem] text-ia-cobalto hover:underline">
          <IcoMais width={16} height={16} /> Adicionar outro dia
        </button>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <Campo id="a-duracao" rotulo="Cada horário">
          <select id="a-duracao" className="campo" value={duracao} onChange={(e) => setDuracao(Number(e.target.value))}>
            {DURACOES.map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="a-intervalo" rotulo="Intervalo entre eles">
          <select id="a-intervalo" className="campo" value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))}>
            {INTERVALOS.map((m) => (
              <option key={m} value={m}>
                {m === 0 ? "sem intervalo" : `${m} min`}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="a-prazo" rotulo="Prazo para escolher">
          <input id="a-prazo" type="datetime-local" className="campo" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </Campo>
      </div>

      <PreviaHorarios total={horarios.length} dias={dias} />

      <SeletorConvidados c={c} pessoas={pessoas} meuId={meuId} />

      {erro && (
        <p role="alert" className="rounded-lg bg-perigo-fundo px-3 py-2 text-[0.875rem] text-perigo">
          {erro}
        </p>
      )}
      <div className="flex justify-end">
        <Botao variante="primario" type="submit" disabled={ocupado}>
          {ocupado ? "Criando…" : "Criar horários"}
        </Botao>
      </div>
    </form>
  );
}

/** Mostra os horários que vão ser criados, dia a dia. */
function PreviaHorarios({ total, dias }: { total: number; dias: { dia: string; horarios: { inicio: Date }[] }[] }) {
  if (total === 0) return <p className="rounded-lg bg-ia-nevoa px-3 py-2 text-[0.875rem] text-ia-apoio">Nenhum horário cabe nas janelas acima.</p>;
  return (
    <div className="rounded-xl border border-ia-regua p-4">
      <p className="text-[0.9rem] text-ia-petroleo">
        {total} {total === 1 ? "horário" : "horários"} · um grupo por horário
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {dias.map((d) => (
          <div key={d.dia} className="flex flex-col gap-1 sm:flex-row sm:gap-3">
            <p className="w-20 shrink-0 text-[0.8125rem] text-ia-apoio tabular-nums">
              {diaSemanaCurto(deChaveDia(d.dia))} {dataCurta(deChaveDia(d.dia))}
            </p>
            <p className="text-[0.8125rem] text-ia-corpo tabular-nums">{d.horarios.map((h) => hora(h.inicio)).join(" · ")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
