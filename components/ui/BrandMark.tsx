"use client";

import { useId } from "react";

/**
 * O símbolo oficial da marca (cópia estática do SITE NOVO). viewBox 766 × 652.
 * `useId` porque o degradê é referenciado por url(#id) e o mark aparece mais
 * de uma vez na página. Sempre decorativo: o texto "Insper AI" está ao lado.
 */
const NOS: [number, number, number][] = [
  [150, 230, 27],
  [515, 65, 48],
  [850, 135, 39],
  [850, 635, 32],
  [180, 635, 34],
];
const ARESTAS: [number, number, number, number, number][] = [
  [150, 230, 850, 635, 36],
  [180, 635, 515, 65, 51],
  [515, 65, 850, 635, 40],
  [850, 135, 850, 635, 34],
];

export default function BrandMark({ className }: { className?: string }) {
  const gradientId = useId();
  return (
    <svg viewBox="123 17 766 652" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="123" y1="669" x2="889" y2="17">
          <stop offset="0" stopColor="#2074DE" />
          <stop offset="0.5" stopColor="#5A9CE9" />
          <stop offset="1" stopColor="#9AC8F4" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${gradientId})`} strokeLinecap="round">
        {ARESTAS.map(([x1, y1, x2, y2, w], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={w} />
        ))}
      </g>
      <g fill={`url(#${gradientId})`}>
        {NOS.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
  );
}
