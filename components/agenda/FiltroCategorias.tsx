"use client";

import type { CSSProperties } from "react";
import { CATEGORIAS } from "@/lib/categorias";
import type { Categoria } from "@/lib/supabase/tipos";

/** Quatro pílulas liga/desliga, uma por categoria. */
export default function FiltroCategorias({ ativas, aoAlternar }: { ativas: Set<Categoria>; aoAlternar: (c: Categoria) => void }) {
  return (
    <div role="group" aria-label="Filtrar por categoria" className="flex flex-wrap items-center gap-1.5">
      {CATEGORIAS.map((c) => {
        const on = ativas.has(c.id);
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => aoAlternar(c.id)}
            style={{ "--cor": `var(${c.varCss})` } as CSSProperties}
            className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[0.8125rem] transition-colors ${
              on ? "border-transparent bg-ia-nevoa text-ia-petroleo" : "border-ia-regua text-ia-meta hover:text-ia-apoio"
            }`}
          >
            <span className={`ponto-cat ${on ? "" : "opacity-30"}`} />
            {c.rotulo}
          </button>
        );
      })}
    </div>
  );
}
