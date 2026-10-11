"use client";

import { AnimatePresence, motion } from "motion/react";
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
      <AnimatePresence mode="wait">
        {mensagem && (
          <motion.div
            key={mensagem}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16 } }}
            className="pointer-events-auto flex max-w-xl items-center gap-3 rounded-full bg-ia-petroleo py-2.5 pr-2 pl-4 text-[0.875rem] text-ia-papel shadow-lg"
          >
            <span>{mensagem}</span>
            <button
              type="button"
              onClick={aoFechar}
              aria-label="Fechar aviso"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ia-papel/70 hover:bg-ia-papel/10 hover:text-ia-papel"
            >
              <IcoFechar />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
