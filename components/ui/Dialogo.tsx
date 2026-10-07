"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { BotaoIcone } from "./Botao";
import { IcoFechar } from "./Icones";

/**
 * <dialog> nativo (foco preso, Esc fecha, fundo escurecido). `variante="folha"`
 * ancora à direita no desktop e sobe de baixo no celular.
 */
export default function Dialogo({
  aberto,
  aoFechar,
  titulo,
  variante = "centro",
  children,
  rodape,
  className = "",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo?: ReactNode;
  variante?: "centro" | "folha";
  children: ReactNode;
  rodape?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    else if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className={`dialogo ${variante === "folha" ? "folha" : ""} ${className}`}
      aria-labelledby={titulo ? idTitulo : undefined}
      onClose={aoFechar}
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div className="flex max-h-[inherit] flex-col" style={{ maxHeight: variante === "folha" ? "100svh" : "calc(100svh - 2rem)" }}>
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          {titulo ? (
            <h2 id={idTitulo} className="t-h4 min-w-0 pt-1">
              {titulo}
            </h2>
          ) : (
            <span />
          )}
          <BotaoIcone rotulo="Fechar" onClick={aoFechar} className="-mt-1 -mr-2">
            <IcoFechar />
          </BotaoIcone>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {rodape && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ia-regua px-6 py-4">{rodape}</div>}
      </div>
    </dialog>
  );
}
