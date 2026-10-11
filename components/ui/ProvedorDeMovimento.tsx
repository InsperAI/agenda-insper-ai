"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** Curva da marca (--ease-mk em globals.css), para JS e CSS andarem iguais. */
export const EASE_MARCA = [0.16, 1, 0.3, 1] as const;

/**
 * Configuração única do Motion: respeita "reduzir movimento" do sistema
 * (transforms viram cortes, opacidade continua) e usa a curva da marca.
 */
export default function ProvedorDeMovimento({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.28, ease: EASE_MARCA }}>
      {children}
    </MotionConfig>
  );
}
