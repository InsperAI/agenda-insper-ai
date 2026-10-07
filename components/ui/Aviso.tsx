"use client";

import { useEffect } from "react";
import { IcoFechar } from "./Icones";

/** Aviso flutuante (toast) único. Some sozinho depois de 6 s. */
export default function Aviso({ mensagem, aoFechar }: { mensagem: string | null; aoFechar: () => void }) {
  useEffect(() => {
    if (!mensagem) return;
    const t = setTimeout(aoFechar, 6000);
    return () => clearTimeout(t);
  }, [mensagem, aoFechar]);

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
      {mensagem && (
        <div className="pointer-events-auto flex max-w-xl items-center gap-3 rounded-full bg-ia-petroleo py-2.5 pr-2 pl-4 text-[0.875rem] text-ia-papel shadow-lg">
          <span>{mensagem}</span>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar aviso"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ia-ceu-claro hover:bg-white/10 hover:text-white"
          >
            <IcoFechar />
          </button>
        </div>
      )}
    </div>
  );
}
