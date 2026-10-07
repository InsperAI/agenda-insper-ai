"use client";

import type { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns";
import { useMemo, useState, type CSSProperties } from "react";
import Botao from "@/components/ui/Botao";
import Dialogo from "@/components/ui/Dialogo";
import { IcoMais } from "@/components/ui/Icones";
import { CATEGORIA } from "@/lib/categorias";
import { DIAS_SEMANA_GRADE, dataPorExtenso, rotuloDia } from "@/lib/datas";
import { chaveDia, deChaveDia, gradeDoMes, inicioDoDia } from "@/lib/fuso";
import type { Ocorrencia } from "@/lib/recorrencia";
import ChipEvento from "./ChipEvento";

const MAX_CHIPS = 3;

/** Dias (chaves) que uma ocorrência cobre — um evento de 2 dias aparece nas duas células. */
function diasCobertos(occ: Ocorrencia): string[] {
  const chaves: string[] = [];
  let d = inicioDoDia(occ.inicio);
  const fim = occ.fim.getTime();
  for (let n = 0; d.getTime() < fim && n < 62; n++) {
    chaves.push(chaveDia(d));
    d = addDays(d, 1);
  }
  return chaves;
}

export default function VistaMes({
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
  aoCriarEm: (dia: TZDate) => void;
}) {
  const grade = useMemo(() => gradeDoMes(ancora), [ancora]);
  const mes = ancora.getMonth();

  const porDia = useMemo(() => {
    const m = new Map<string, Ocorrencia[]>();
    for (const o of ocorrencias) {
      for (const k of diasCobertos(o)) {
        const lista = m.get(k);
        if (lista) lista.push(o);
        else m.set(k, [o]);
      }
    }
    return m;
  }, [ocorrencias]);

  // Celular: a grade só mostra pontinhos; a lista do dia selecionado fica embaixo.
  const [diaTocado, setDiaTocado] = useState<string | null>(null);
  const diaSelecionado = diaTocado && grade.some((d) => chaveDia(d) === diaTocado) ? diaTocado : grade.some((d) => chaveDia(d) === hoje) ? hoje : chaveDia(grade[7]);
  const [diaExpandido, setDiaExpandido] = useState<TZDate | null>(null);

  function clicarCelula(e: React.MouseEvent<HTMLDivElement>, dia: TZDate) {
    if (e.target !== e.currentTarget) return;
    if (window.matchMedia("(min-width: 768px)").matches) aoCriarEm(dia);
    else setDiaTocado(chaveDia(dia));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ia-regua bg-ia-papel">
      <div className="grid grid-cols-7 border-b border-ia-regua">
        {DIAS_SEMANA_GRADE.map((d) => (
          <div key={d} className="t-meta py-2 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7" role="grid" aria-label="Dias do mês">
        {grade.map((dia, i) => {
          const k = chaveDia(dia);
          const lista = porDia.get(k) ?? [];
          const foraDoMes = dia.getMonth() !== mes;
          const ehHoje = k === hoje;
          const visiveis = lista.slice(0, MAX_CHIPS);
          const extra = lista.length - visiveis.length;
          const selecionado = k === diaSelecionado;
          return (
            <div
              key={k}
              role="gridcell"
              aria-selected={selecionado}
              onClick={(e) => clicarCelula(e, dia)}
              className={`relative flex min-h-[4.25rem] cursor-pointer flex-col gap-0.5 border-ia-regua p-1 transition-colors md:min-h-[7.25rem] md:hover:bg-ia-nevoa/60 ${
                i % 7 !== 6 ? "border-r" : ""
              } ${i < 35 ? "border-b" : ""} ${foraDoMes ? "bg-ia-nevoa/50" : ""} ${selecionado ? "bg-ia-nevoa md:bg-transparent" : ""}`}
            >
              <button
                type="button"
                onClick={() => setDiaTocado(k)}
                aria-label={dataPorExtenso(dia)}
                className={`tabular pointer-events-none mb-0.5 inline-flex h-6 min-w-6 items-center justify-center self-end rounded-full px-1 text-[0.8125rem] md:pointer-events-auto ${
                  ehHoje ? "bg-ia-cobalto font-display font-semibold text-ia-papel" : foraDoMes ? "text-ia-meta" : "text-ia-petroleo"
                }`}
              >
                {dia.getDate()}
              </button>

              <div className="hidden flex-col gap-0.5 md:flex">
                {visiveis.map((o) => (
                  <ChipEvento key={o.chave} occ={o} compacto aoClicar={aoSelecionar} />
                ))}
                {extra > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiaExpandido(dia)}
                    className="self-start rounded px-1.5 text-left text-[0.75rem] text-ia-apoio hover:text-ia-petroleo"
                  >
                    +{extra} mais
                  </button>
                )}
              </div>

              <div className="pointer-events-none flex flex-wrap gap-0.5 px-0.5 md:hidden">
                {lista.slice(0, 4).map((o) => (
                  <span key={o.chave} className="ponto-cat !h-1.5 !w-1.5" style={{ "--cor": `var(${CATEGORIA[o.evento.category].varCss})` } as CSSProperties} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Celular: eventos do dia tocado */}
      <div className="border-t border-ia-regua p-3 md:hidden">
        <div className="mb-2 flex items-center justify-between">
          <p className="t-meta">{rotuloDia(deChaveDia(diaSelecionado))}</p>
          <Botao tamanho="sm" variante="fantasma" onClick={() => aoCriarEm(deChaveDia(diaSelecionado))}>
            <IcoMais /> Novo
          </Botao>
        </div>
        {(porDia.get(diaSelecionado) ?? []).length === 0 ? (
          <p className="t-apoio py-2">Nada neste dia.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {(porDia.get(diaSelecionado) ?? []).map((o) => (
              <ChipEvento key={o.chave} occ={o} aoClicar={aoSelecionar} />
            ))}
          </div>
        )}
      </div>

      <Dialogo aberto={diaExpandido !== null} aoFechar={() => setDiaExpandido(null)} titulo={diaExpandido ? dataPorExtenso(diaExpandido) : undefined}>
        {diaExpandido && (
          <div className="flex flex-col gap-1">
            {(porDia.get(chaveDia(diaExpandido)) ?? []).map((o) => (
              <ChipEvento
                key={o.chave}
                occ={o}
                aoClicar={(occ) => {
                  setDiaExpandido(null);
                  aoSelecionar(occ);
                }}
              />
            ))}
          </div>
        )}
      </Dialogo>
    </div>
  );
}
