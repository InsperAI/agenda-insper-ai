"use client";

import { motion } from "motion/react";
import { useId } from "react";

/** Controle segmentado: um grupo de botões em que exatamente um está ativo; o fundo desliza até ele. */
export default function Segmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
  className = "",
}: {
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  aoMudar: (v: T) => void;
  rotulo: string;
  className?: string;
}) {
  const idFundo = useId();
  return (
    <div role="group" aria-label={rotulo} className={`inline-flex h-10 items-center rounded-full border border-ia-regua bg-ia-nevoa p-1 ${className}`}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => aoMudar(o.valor)}
            className={`relative h-8 rounded-full px-3.5 text-[0.875rem] transition-colors duration-150 ${
              ativo ? "text-ia-petroleo" : "text-ia-apoio hover:text-ia-petroleo"
            }`}
          >
            {ativo && (
              <motion.span
                layoutId={idFundo}
                className="absolute inset-0 rounded-full bg-ia-papel shadow-sm"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            )}
            <span className="relative">{o.rotulo}</span>
          </button>
        );
      })}
    </div>
  );
}
