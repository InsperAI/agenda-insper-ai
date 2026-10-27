"use client";

import { motion } from "motion/react";
import { IcoMais } from "@/components/ui/Icones";

/** "+" flutuante do celular, acima da barra de abas e ao alcance do polegar. */
export default function BotaoFlutuante({ aoClicar, rotulo }: { aoClicar: () => void; rotulo: string }) {
  return (
    <motion.button
      type="button"
      onClick={aoClicar}
      aria-label={rotulo}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.92 }}
      className="fixed right-4 bottom-[calc(var(--abas)+1rem)] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ia-petroleo text-ia-papel shadow-pop md:hidden"
    >
      <IcoMais width={26} height={26} strokeWidth={2} />
    </motion.button>
  );
}
