"use client";

import type { CSSProperties } from "react";
import { IcoRepetir } from "@/components/ui/Icones";
import { CATEGORIA } from "@/lib/categorias";
import { hora } from "@/lib/datas";
import { ehDeSerie, type Ocorrencia } from "@/lib/recorrencia";

/** A barrinha de evento nas grades: filete na cor da categoria, hora e título. */
export default function ChipEvento({
  occ,
  aoClicar,
  compacto = false,
  mostrarHora = true,
  className = "",
}: {
  occ: Ocorrencia;
  aoClicar: (o: Ocorrencia) => void;
  compacto?: boolean;
  mostrarHora?: boolean;
  className?: string;
}) {
  const cat = CATEGORIA[occ.evento.category];
  const estilo = { "--cor": `var(${cat.varCss})` } as CSSProperties;
  return (
    <button
      type="button"
      onClick={() => aoClicar(occ)}
      style={estilo}
      title={`${occ.evento.title} · ${cat.singular}`}
      className={`chip flex w-full min-w-0 items-center gap-1.5 rounded-r-md rounded-l-[2px] px-1.5 text-left leading-5 ${
        compacto ? "h-5 text-[0.75rem]" : "min-h-7 py-1 text-[0.8125rem]"
      } ${className}`}
    >
      {mostrarHora && !occ.evento.all_day && <span className="tabular shrink-0 text-ia-apoio">{hora(occ.inicio)}</span>}
      <span className="truncate">{occ.evento.title}</span>
      {!compacto && ehDeSerie(occ) && <IcoRepetir width={12} height={12} className="ml-auto shrink-0 text-ia-meta" />}
    </button>
  );
}
