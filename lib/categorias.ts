import type { Categoria, Frequencia } from "./supabase/tipos";

/**
 * As quatro categorias da agenda. A cor mora em app/globals.css (--cat-*);
 * `hex` só repete o valor para quem não consegue ler CSS (o .ics, por exemplo).
 */
export type InfoCategoria = {
  id: Categoria;
  rotulo: string;
  singular: string;
  varCss: `--cat-${Categoria}`;
  hex: string;
};

export const CATEGORIAS: readonly InfoCategoria[] = [
  { id: "evento", rotulo: "Eventos", singular: "Evento", varCss: "--cat-evento", hex: "#0A6CF1" },
  { id: "aula", rotulo: "Aulas", singular: "Aula", varCss: "--cat-aula", hex: "#0B7A5E" },
  { id: "reuniao", rotulo: "Reuniões", singular: "Reunião", varCss: "--cat-reuniao", hex: "#011E42" },
  { id: "prazo", rotulo: "Prazos", singular: "Prazo", varCss: "--cat-prazo", hex: "#B45309" },
] as const;

export const CATEGORIA: Record<Categoria, InfoCategoria> = Object.fromEntries(
  CATEGORIAS.map((c) => [c.id, c]),
) as Record<Categoria, InfoCategoria>;

export const TODAS_CATEGORIAS: Categoria[] = CATEGORIAS.map((c) => c.id);

export const FREQUENCIAS: { id: Frequencia; rotulo: string; frase: string }[] = [
  { id: "semanal", rotulo: "Toda semana", frase: "toda semana" },
  { id: "quinzenal", rotulo: "A cada 2 semanas", frase: "a cada 2 semanas" },
  { id: "mensal", rotulo: "Todo mês", frase: "todo mês" },
];

export const FREQUENCIA: Record<Frequencia, { rotulo: string; frase: string }> = Object.fromEntries(
  FREQUENCIAS.map((f) => [f.id, { rotulo: f.rotulo, frase: f.frase }]),
) as Record<Frequencia, { rotulo: string; frase: string }>;
