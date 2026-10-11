/**
 * Preferência de tema guardada em cookie para o servidor já mandar o <html>
 * com o `data-theme` certo (sem piscar). "sistema" = sem atributo; o CSS segue
 * `prefers-color-scheme` via `color-scheme: light dark` (app/globals.css).
 */
export type Tema = "claro" | "escuro" | "sistema";

export const COOKIE_TEMA = "tema";
export const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

export const OPCOES_TEMA: { valor: Tema; rotulo: string }[] = [
  { valor: "claro", rotulo: "Claro" },
  { valor: "escuro", rotulo: "Escuro" },
  { valor: "sistema", rotulo: "Sistema" },
];

/** Valor do cookie → Tema válido; qualquer coisa inesperada vira "sistema". */
export function lerTema(valor: string | undefined): Tema {
  return valor === "claro" || valor === "escuro" ? valor : "sistema";
}

/** Valor do atributo `data-theme` no <html>; `undefined` deixa o sistema decidir. */
export function atributoTema(tema: Tema): "light" | "dark" | undefined {
  if (tema === "claro") return "light";
  if (tema === "escuro") return "dark";
  return undefined;
}
