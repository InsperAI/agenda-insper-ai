"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { BLOCOS, chaveBloco, rotuloBloco, rotuloDia } from "@/lib/votacao";
import type { ModoVotacao } from "@/lib/supabase/tipos";

type Props = {
  modo: ModoVotacao;
  dias: string[];
  /** Blocos marcados por mim. */
  minhas: ReadonlySet<string>;
  /** Contagem por bloco (mapa de calor) e quantos convidados no total. */
  contagem: Record<string, number>;
  total: number;
  vista: "minha" | "todos";
  editavel: boolean;
  aoMudar: (novas: Set<string>) => void;
};

/**
 * Grade dias × blocos de 30 min. Em "minha", arrastar pinta (ou apaga, se o
 * primeiro bloco já estava marcado) — com mouse ou dedo. Em "todos", mostra o
 * mapa de calor: quanto mais gente pode, mais forte o azul.
 */
export default function GradeVotacao({ modo, dias, minhas, contagem, total, vista, editavel, aoMudar }: Props) {
  const pintando = useRef<{ marcar: boolean; atual: Set<string> } | null>(null);
  const [rascunho, setRascunho] = useState<Set<string> | null>(null);
  const marcadas = rascunho ?? minhas;
  const podePintar = editavel && vista === "minha";

  function chaveNoPonto(e: PointerEvent): string | null {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-chave]");
    return el?.dataset.chave ?? null;
  }

  function aplicar(chave: string) {
    const p = pintando.current;
    if (!p) return;
    const jaEsta = p.atual.has(chave);
    if (p.marcar === jaEsta) return;
    const nova = new Set(p.atual);
    if (p.marcar) nova.add(chave);
    else nova.delete(chave);
    p.atual = nova;
    setRascunho(nova);
  }

  function comecar(e: PointerEvent<HTMLDivElement>) {
    if (!podePintar) return;
    const chave = chaveNoPonto(e);
    if (!chave) return;
    e.preventDefault();
    pintando.current = { marcar: !minhas.has(chave), atual: new Set(minhas) };
    aplicar(chave);
  }

  function mover(e: PointerEvent<HTMLDivElement>) {
    if (!pintando.current) return;
    const chave = chaveNoPonto(e);
    if (chave) aplicar(chave);
  }

  function terminar() {
    const p = pintando.current;
    if (!p) return;
    pintando.current = null;
    setRascunho(null);
    aoMudar(p.atual);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ia-regua">
      <div
        role="grid"
        aria-label={vista === "minha" ? "Sua disponibilidade" : "Disponibilidade de todos"}
        className={`grid min-w-max select-none ${podePintar ? "cursor-pointer touch-none" : ""}`}
        style={{ gridTemplateColumns: `3.25rem repeat(${dias.length}, minmax(3.5rem, 1fr))` }}
        onPointerDown={comecar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerCancel={terminar}
        onPointerLeave={terminar}
      >
        <div className="sticky left-0 z-10 bg-ia-papel" />
        {dias.map((d) => (
          <div key={d} role="columnheader" className="border-b border-l border-ia-regua px-1 py-2 text-center text-[0.8125rem] text-ia-petroleo">
            {rotuloDia(modo, d)}
          </div>
        ))}

        {BLOCOS.map((b) => (
          <Linha key={b} bloco={b} dias={dias} marcadas={marcadas} contagem={contagem} total={total} vista={vista} />
        ))}
      </div>
    </div>
  );
}

function Linha({
  bloco,
  dias,
  marcadas,
  contagem,
  total,
  vista,
}: {
  bloco: number;
  dias: string[];
  marcadas: ReadonlySet<string>;
  contagem: Record<string, number>;
  total: number;
  vista: "minha" | "todos";
}) {
  const horaCheia = bloco % 2 === 0;
  return (
    <>
      <div role="rowheader" className="sticky left-0 z-10 -mt-2 bg-ia-papel pr-2 text-right text-[0.6875rem] leading-4 text-ia-meta tabular">
        {horaCheia ? rotuloBloco(bloco) : ""}
      </div>
      {dias.map((d) => {
        const chave = chaveBloco(d, bloco);
        const n = contagem[chave] ?? 0;
        const marcada = marcadas.has(chave);
        const forca = total > 0 ? Math.round((n / total) * 100) : 0;
        // Mínimo de 14% para 1 pessoa não sumir; 100% = todos podem.
        const estilo: CSSProperties | undefined =
          vista === "todos" && n > 0 ? { backgroundColor: `color-mix(in srgb, var(--ia-cobalto) ${Math.max(14, forca)}%, transparent)` } : undefined;
        return (
          <div
            key={chave}
            role="gridcell"
            data-chave={chave}
            aria-selected={vista === "minha" ? marcada : undefined}
            aria-label={`${d} ${rotuloBloco(bloco)}${vista === "todos" ? `: ${n} de ${total}` : marcada ? ": disponível" : ""}`}
            title={vista === "todos" ? `${rotuloBloco(bloco)} · ${n} de ${total} podem` : undefined}
            style={estilo}
            className={`h-6 border-l border-ia-regua ${horaCheia ? "border-t" : "border-t border-t-ia-regua/40"} transition-colors duration-75 ${
              vista === "minha"
                ? marcada
                  ? "bg-ia-cobalto/85"
                  : "hover:bg-ia-nevoa"
                : ""
            }`}
          />
        );
      })}
    </>
  );
}
