import type { Nivel } from "./supabase/tipos";

/**
 * Níveis de acesso. Espelha o enum `nivel` de supabase/migrations/0002_niveis.sql,
 * onde a RLS faz valer as mesmas regras; aqui é para a interface e para o feed
 * .ics (que usa a service role e por isso filtra à mão).
 */
export const NIVEIS: readonly { id: Nivel; rotulo: string; plural: string }[] = [
  { id: "diretoria", rotulo: "Diretoria", plural: "Diretoria" },
  { id: "membro", rotulo: "Membro", plural: "Membros" },
  { id: "trainee", rotulo: "Trainee", plural: "Trainees" },
] as const;

export const ROTULO_NIVEL: Record<Nivel, string> = { diretoria: "Diretoria", membro: "Membro", trainee: "Trainee" };

/** Opções de "Quem vê" no formulário de evento: o valor é o nível mínimo. */
export const OPCOES_VISIBILIDADE: { valor: Nivel; rotulo: string; frase: string }[] = [
  { valor: "diretoria", rotulo: "Só diretoria", frase: "só a diretoria" },
  { valor: "membro", rotulo: "Diretoria e membros", frase: "diretoria e membros" },
  { valor: "trainee", rotulo: "Todos", frase: "todos, inclusive trainees" },
];

export const FRASE_VISIBILIDADE: Record<Nivel, string> = Object.fromEntries(
  OPCOES_VISIBILIDADE.map((o) => [o.valor, o.frase]),
) as Record<Nivel, string>;

const ORDEM: Record<Nivel, number> = { trainee: 0, membro: 1, diretoria: 2 };

export function ehNivel(valor: string): valor is Nivel {
  return Object.hasOwn(ORDEM, valor);
}

/** Quem é `nivel` vê um evento com essa `visibilidade` (nível mínimo)? */
export function podeVer(nivel: Nivel, visibilidade: Nivel): boolean {
  return ORDEM[visibilidade] <= ORDEM[nivel];
}

/** Só a diretoria cria, edita e exclui eventos. */
export function podeEditar(nivel: Nivel): boolean {
  return nivel === "diretoria";
}

/** Para quem não passa pela RLS (feed .ics com service role): só o que `nivel` pode ver. */
export function visiveisPara<T extends { visibilidade: Nivel }>(linhas: readonly T[], nivel: Nivel): T[] {
  return linhas.filter((l) => podeVer(nivel, l.visibilidade));
}
