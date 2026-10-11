"use client";

import type { TZDate } from "@date-fns/tz";
import { addDays, addMinutes } from "date-fns";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { CATEGORIA } from "@/lib/categorias";
import { DIAS_SEMANA_GRADE, hora } from "@/lib/datas";
import { chaveDia, inicioDaSemana, sp } from "@/lib/fuso";
import { ehDeSerie, ocupaDiaInteiro, type Ocorrencia } from "@/lib/recorrencia";
import { IcoRepetir } from "@/components/ui/Icones";
import ChipEvento from "./ChipEvento";

const HORA_INI = 7;
const HORA_FIM = 23;
const ALTURA_HORA = 56; // px
const HORAS = Array.from({ length: HORA_FIM - HORA_INI }, (_, i) => HORA_INI + i);
const ALTURA_TOTAL = HORAS.length * ALTURA_HORA;

type Colocado = { occ: Ocorrencia; topo: number; altura: number; col: number; cols: number };

/** Empacota eventos sobrepostos em colunas lado a lado (algoritmo guloso por clusters). */
function empacotar(itens: Ocorrencia[], diaIni: Date): Colocado[] {
  const minutos = (d: Date) => (d.getTime() - diaIni.getTime()) / 60_000;
  const t0 = HORA_INI * 60;
  const t1 = HORA_FIM * 60;
  const ordenados = [...itens].sort((a, b) => a.inicio.getTime() - b.inicio.getTime() || b.fim.getTime() - a.fim.getTime());

  const res: Colocado[] = [];
  let cluster: { fimMax: number; itens: Colocado[]; colunas: number[] } | null = null;
  const fechar = () => {
    if (cluster) for (const it of cluster.itens) it.cols = cluster.colunas.length;
  };

  for (const occ of ordenados) {
    const ini = Math.min(Math.max(t0, minutos(occ.inicio)), t1 - 30);
    const fim = Math.min(t1, Math.max(ini + 30, minutos(occ.fim)));
    if (!cluster || ini >= cluster.fimMax) {
      fechar();
      cluster = { fimMax: fim, itens: [], colunas: [] };
    }
    let col = cluster.colunas.findIndex((f) => f <= ini);
    if (col === -1) {
      col = cluster.colunas.length;
      cluster.colunas.push(fim);
    } else {
      cluster.colunas[col] = fim;
    }
    cluster.fimMax = Math.max(cluster.fimMax, fim);
    const c: Colocado = { occ, topo: ((ini - t0) / 60) * ALTURA_HORA, altura: ((fim - ini) / 60) * ALTURA_HORA, col, cols: 1 };
    cluster.itens.push(c);
    res.push(c);
  }
  fechar();
  return res;
}

export default function VistaSemana({
  ancora,
  ocorrencias,
  hoje,
  aoSelecionar,
  aoCriarEm,
}: {
  ancora: TZDate;
  ocorrencias: Ocorrencia[];
  hoje: string;
  aoSelecionar: (o: Ocorrencia) => void;
  /** Ausente = sem permissão para criar. */
  aoCriarEm?: (inicio: TZDate) => void;
}) {
  const dias = useMemo(() => {
    const ini = inicioDaSemana(ancora);
    return Array.from({ length: 7 }, (_, i) => addDays(ini, i));
  }, [ancora]);

  const { diaInteiroPorDia, comHoraPorDia } = useMemo(() => {
    const diaInteiroPorDia = new Map<string, Ocorrencia[]>();
    const comHoraPorDia = new Map<string, Ocorrencia[]>();
    for (const dia of dias) {
      const k = chaveDia(dia);
      const fimDia = addDays(dia, 1).getTime();
      const cobre = (o: Ocorrencia) => o.inicio.getTime() < fimDia && o.fim.getTime() > dia.getTime();
      diaInteiroPorDia.set(k, ocorrencias.filter((o) => ocupaDiaInteiro(o) && cobre(o)));
      comHoraPorDia.set(k, ocorrencias.filter((o) => !ocupaDiaInteiro(o) && chaveDia(o.inicio) === k));
    }
    return { diaInteiroPorDia, comHoraPorDia };
  }, [dias, ocorrencias]);

  // Linha do "agora", atualizada a cada minuto.
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAgora(new Date());
    const i = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(i);
  }, []);
  const temHoje = dias.some((d) => chaveDia(d) === hoje);
  const topoAgora = agora ? ((sp(agora).getHours() * 60 + sp(agora).getMinutes() - HORA_INI * 60) / 60) * ALTURA_HORA : -1;

  function clicarColuna(e: React.MouseEvent<HTMLDivElement>, dia: TZDate) {
    if (!aoCriarEm || e.target !== e.currentTarget) return;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const meiasHoras = Math.max(0, Math.min(HORAS.length * 2 - 1, Math.floor(y / (ALTURA_HORA / 2))));
    aoCriarEm(addMinutes(dia, HORA_INI * 60 + meiasHoras * 30));
  }

  const temDiaInteiro = dias.some((d) => (diaInteiroPorDia.get(chaveDia(d)) ?? []).length > 0);

  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-ia-regua bg-ia-papel">
      <div className="min-w-[52rem]">
        {/* Cabeçalho dos dias */}
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-ia-regua">
          <div />
          {dias.map((dia, i) => {
            const ehHoje = chaveDia(dia) === hoje;
            return (
              <div key={chaveDia(dia)} className="flex flex-col items-center gap-0.5 py-2">
                <span className="t-meta">{DIAS_SEMANA_GRADE[i]}</span>
                <span
                  className={`tabular inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 font-display text-[0.95rem] font-semibold ${
                    ehHoje ? "bg-ia-cobalto text-ia-papel" : "text-ia-petroleo"
                  }`}
                >
                  {dia.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Faixa de dia inteiro */}
        {temDiaInteiro && (
          <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-ia-regua">
            <div className="t-meta flex items-start justify-end px-2 pt-1.5">dia</div>
            {dias.map((dia) => (
              <div key={chaveDia(dia)} className="flex flex-col gap-0.5 border-l border-ia-regua p-1">
                {(diaInteiroPorDia.get(chaveDia(dia)) ?? []).map((o) => (
                  <ChipEvento key={o.chave} occ={o} compacto mostrarHora={false} aoClicar={aoSelecionar} />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Grade de horas */}
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)]" style={{ height: ALTURA_TOTAL }}>
          <div className="relative">
            {HORAS.map((h, i) => (
              <span key={h} className="tabular absolute right-2 -translate-y-1/2 text-[0.75rem] text-ia-meta" style={{ top: i * ALTURA_HORA }}>
                {i === 0 ? "" : `${h}H`}
              </span>
            ))}
          </div>
          {dias.map((dia) => {
            const k = chaveDia(dia);
            const colocados = empacotar(comHoraPorDia.get(k) ?? [], dia);
            return (
              <div
                key={k}
                onClick={(e) => clicarColuna(e, dia)}
                className={`relative border-l border-ia-regua ${aoCriarEm ? "cursor-pointer" : ""}`}
                style={{
                  backgroundImage: "linear-gradient(to bottom, var(--ia-regua) 1px, transparent 1px)",
                  backgroundSize: `100% ${ALTURA_HORA}px`,
                }}
              >
                {colocados.map(({ occ, topo, altura, col, cols }) => {
                  const cat = CATEGORIA[occ.evento.category];
                  const larg = 100 / cols;
                  return (
                    <button
                      key={occ.chave}
                      type="button"
                      onClick={() => aoSelecionar(occ)}
                      title={`${occ.evento.title} · ${hora(occ.inicio)} — ${hora(occ.fim)}`}
                      style={
                        {
                          "--cor": `var(${cat.varCss})`,
                          top: topo + 1,
                          height: Math.max(22, altura - 2),
                          left: `calc(${col * larg}% + 2px)`,
                          width: `calc(${larg}% - 4px)`,
                        } as CSSProperties
                      }
                      className="chip absolute flex flex-col overflow-hidden rounded-r-md rounded-l-[2px] px-1.5 py-0.5 text-left text-[0.75rem] leading-[1.15rem]"
                    >
                      <span className="flex items-center gap-1">
                        <span className="tabular shrink-0 text-ia-apoio">{hora(occ.inicio)}</span>
                        {ehDeSerie(occ) && <IcoRepetir width={10} height={10} className="shrink-0 text-ia-meta" />}
                      </span>
                      <span className="truncate text-ia-petroleo">{occ.evento.title}</span>
                    </button>
                  );
                })}
                {temHoje && k === hoje && topoAgora >= 0 && topoAgora <= ALTURA_TOTAL && <div className="linha-agora" style={{ top: topoAgora }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
