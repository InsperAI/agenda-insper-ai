"use client";

import { useEffect, useId, useRef, type PointerEvent, type ReactNode } from "react";
import { BotaoIcone } from "./Botao";
import { IcoFechar } from "./Icones";

/** Arrastar o topo da folha para baixo além disso fecha (celular). */
const ARRASTE_FECHA_PX = 90;

/**
 * <dialog> nativo (foco preso, Esc fecha, fundo escurecido). `variante="folha"`
 * ancora à direita no desktop; no celular todo diálogo sobe de baixo e fecha
 * arrastando o topo para baixo, como as folhas do iOS.
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
  const arraste = useRef<{ y0: number; dy: number } | null>(null);

  function comecarArraste(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "touch" || !window.matchMedia("(max-width: 767px)").matches) return;
    arraste.current = { y0: e.clientY, dy: 0 };
  }
  function moverArraste(e: PointerEvent<HTMLDivElement>) {
    const a = arraste.current;
    const d = ref.current;
    if (!a || !d) return;
    a.dy = Math.max(0, e.clientY - a.y0);
    d.style.transition = "none";
    d.style.transform = `translateY(${a.dy}px)`;
  }
  function soltarArraste() {
    const a = arraste.current;
    const d = ref.current;
    arraste.current = null;
    if (!a || !d) return;
    d.style.transition = "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)";
    d.style.transform = "";
    if (a.dy > ARRASTE_FECHA_PX) aoFechar();
  }

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
      <div className="flex max-h-(--dialogo-max) flex-col">
        <div
          className="flex touch-none items-start justify-between gap-4 px-6 pt-5 pb-3 md:touch-auto"
          onPointerDown={comecarArraste}
          onPointerMove={moverArraste}
          onPointerUp={soltarArraste}
          onPointerCancel={soltarArraste}
        >
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
