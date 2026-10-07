"use client";

import { useMemo, type CSSProperties } from "react";
import { CATEGORIA } from "@/lib/categorias";
import { dataCurta, faixaHorario, rotuloDia } from "@/lib/datas";
import { chaveDia, deChaveDia } from "@/lib/fuso";
import type { Ocorrencia } from "@/lib/recorrencia";

/** Lista dos próximos 60 dias, agrupada por dia. */
export default function VistaProximos({
  ocorrencias,
  carregando,
  aoSelecionar,
}: {
  ocorrencias: Ocorrencia[];
  carregando: boolean;
  aoSelecionar: (o: Ocorrencia) => void;
}) {
  const grupos = useMemo(() => {
    const m = new Map<string, Ocorrencia[]>();
    for (const o of ocorrencias) {
      const k = chaveDia(o.inicio);
      const lista = m.get(k);
      if (lista) lista.push(o);
      else m.set(k, [o]);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [ocorrencias]);

  if (!carregando && grupos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ia-regua px-6 py-16 text-center">
        <p className="t-h4">Nada nos próximos 60 dias</p>
        <p className="t-apoio mt-2">Crie um evento com o botão acima ou troque os filtros de categoria.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-ia-regua overflow-hidden rounded-xl border border-ia-regua">
      {grupos.map(([k, lista]) => {
        const dia = deChaveDia(k);
        const rotulo = rotuloDia(dia);
        const ehHoje = rotulo === "Hoje";
        return (
          <section key={k} className="grid gap-2 px-4 py-4 md:grid-cols-[13rem_1fr] md:gap-6">
            <h2 className={`flex items-baseline gap-2 ${ehHoje ? "text-ia-cobalto" : "text-ia-petroleo"}`}>
              <span className="font-display text-[1.0625rem] font-semibold tracking-[-0.02em]">{rotulo}</span>
              <span className="t-meta">{dataCurta(dia)}</span>
            </h2>
            <ul className="flex flex-col gap-0.5">
              {lista.map((o) => (
                <li key={o.chave}>
                  <button
                    type="button"
                    onClick={() => aoSelecionar(o)}
                    className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-ia-nevoa"
                  >
                    <span className="tabular w-[6.5rem] shrink-0 pt-px text-[0.875rem] text-ia-apoio">
                      {faixaHorario(o.inicio, o.fim, o.evento.all_day)}
                    </span>
                    <span className="ponto-cat mt-[7px]" style={{ "--cor": `var(${CATEGORIA[o.evento.category].varCss})` } as CSSProperties} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.95rem] text-ia-petroleo">{o.evento.title}</span>
                      {o.evento.location && <span className="block truncate text-[0.8125rem] text-ia-meta">{o.evento.location}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
