"use client";

import gsap from "gsap";
import { useEffect, useRef, type CSSProperties } from "react";
import type { Categoria } from "@/lib/supabase/tipos";

const DIAS = ["seg", "ter", "qua", "qui", "sex"];
const HORAS = ["9h", "12h", "15h", "18h", "21h"];

/** Posições em % da grade: coluna (dia), topo e altura (fração do dia útil). */
const EVENTOS: { titulo: string; hora: string; cat: Categoria; dia: number; topo: number; altura: number }[] = [
  { titulo: "Reunião de diretoria", hora: "9h", cat: "reuniao", dia: 0, topo: 2, altura: 16 },
  { titulo: "Trilha de ML", hora: "18h", cat: "aula", dia: 0, topo: 66, altura: 18 },
  { titulo: "Mentoria", hora: "12h", cat: "evento", dia: 1, topo: 26, altura: 14 },
  { titulo: "Relatório do semestre", hora: "dia todo", cat: "prazo", dia: 2, topo: 2, altura: 10 },
  { titulo: "Trilha de ML", hora: "18h", cat: "aula", dia: 2, topo: 66, altura: 18 },
  { titulo: "Sprint review", hora: "15h", cat: "reuniao", dia: 3, topo: 46, altura: 14 },
  { titulo: "AI Day", hora: "19h", cat: "evento", dia: 4, topo: 70, altura: 22 },
];

/**
 * Cena da tela de entrada: a semana da Insper AI se preenchendo. Decorativa
 * (aria-hidden). Com "reduzir movimento", mostra o estado final sem animar.
 */
export default function CenaSemana() {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!raiz.current) return;
    const mm = gsap.matchMedia();
    mm.add(
      { mover: "(prefers-reduced-motion: no-preference)" },
      ({ conditions }) => {
        if (!conditions?.mover) return;
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.from("[data-cena=coluna]", { opacity: 0, y: 12, duration: 0.6, stagger: 0.06 })
          .from("[data-cena=linha]", { scaleX: 0, transformOrigin: "left center", duration: 0.8, stagger: 0.05 }, "<0.1")
          .from("[data-cena=evento]", { opacity: 0, y: -14, scale: 0.94, duration: 0.7, stagger: { each: 0.11, from: "start" } }, "-=0.4")
          .from("[data-cena=agora]", { scaleX: 0, transformOrigin: "left center", duration: 0.9, ease: "power2.inOut" }, "-=0.2")
          .to("[data-cena=pulso]", { scale: 1.8, opacity: 0, duration: 1.4, repeat: -1, ease: "power1.out" });
      },
      raiz.current,
    );
    return () => mm.revert();
  }, []);

  return (
    <div ref={raiz} aria-hidden className="relative w-full select-none">
      <div className="grid grid-cols-[2.25rem_repeat(5,minmax(0,1fr))] gap-x-1.5">
        <span />
        {DIAS.map((d) => (
          <span key={d} data-cena="coluna" className="pb-2 text-center text-[0.75rem] text-ia-meta">
            {d}
          </span>
        ))}
      </div>

      <div className="relative grid h-[19rem] grid-cols-[2.25rem_repeat(5,minmax(0,1fr))] gap-x-1.5">
        {/* horas + linhas */}
        <div className="relative">
          {HORAS.map((h, i) => (
            <span key={h} className="absolute -translate-y-1/2 text-[0.6875rem] text-ia-meta tabular" style={{ top: `${(i / (HORAS.length - 1)) * 100}%` }}>
              {h}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 left-[2.625rem]">
          {HORAS.map((h, i) => (
            <span key={h} data-cena="linha" className="absolute inset-x-0 h-px bg-ia-regua" style={{ top: `${(i / (HORAS.length - 1)) * 100}%` }} />
          ))}
        </div>

        {DIAS.map((d, dia) => (
          <div key={d} data-cena="coluna" className="relative rounded-md bg-ia-papel/60">
            {EVENTOS.filter((e) => e.dia === dia).map((e) => (
              <div
                key={`${e.titulo}-${e.topo}`}
                data-cena="evento"
                className="chip absolute inset-x-0.5 flex flex-col justify-start overflow-hidden rounded-r-md rounded-l-[2px] px-1.5 py-1 text-[0.6875rem] leading-tight"
                style={{ "--cor": `var(--cat-${e.cat})`, top: `${e.topo}%`, height: `${e.altura}%` } as CSSProperties}
              >
                <span className="truncate font-display font-semibold">{e.titulo}</span>
                <span className="truncate text-ia-apoio">{e.hora}</span>
              </div>
            ))}
          </div>
        ))}

        {/* "agora": quarta, fim da tarde */}
        <div data-cena="agora" className="pointer-events-none absolute right-0 left-[2.625rem] h-0.5 bg-ia-cobalto" style={{ top: "58%" }}>
          <span className="absolute top-1/2 left-[calc(40%+0.25rem)] h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-ia-cobalto" />
          <span data-cena="pulso" className="absolute top-1/2 left-[calc(40%+0.25rem)] h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-ia-cobalto" />
        </div>
      </div>
    </div>
  );
}
