import type { Nivel, NivelPublico } from "./supabase/tipos";

/**
 * Níveis de acesso e público dos eventos. Espelha supabase/migrations/0002 e
 * 0003, onde a RLS faz valer as mesmas regras; aqui é para a interface e para o
 * feed .ics (que usa a service role e por isso filtra à mão).
 */
export const NIVEIS: readonly { id: Nivel; rotulo: string; plural: string }[] = [
  { id: "diretoria", rotulo: "Diretoria", plural: "Diretoria" },
  { id: "membro", rotulo: "Membro", plural: "Membros" },
  { id: "trainee", rotulo: "Trainee", plural: "Trainees" },
] as const;

export const ROTULO_NIVEL: Record<Nivel, string> = { diretoria: "Diretoria", membro: "Membro", trainee: "Trainee" };

/** Quem pode ser marcado em "Quem vê" (a diretoria sempre vê). Ordem de exibição. */
export const NIVEIS_PUBLICO: readonly { id: NivelPublico; plural: string }[] = [
  { id: "membro", plural: "Membros" },
  { id: "trainee", plural: "Trainees" },
] as const;

export function ehNivel(valor: string): valor is Nivel {
  return Object.hasOwn(ROTULO_NIVEL, valor);
}

/** A diretoria vê tudo; os outros só eventos que marcaram o seu nível. */
export function podeVer(nivel: Nivel, publico: readonly NivelPublico[]): boolean {
  return nivel === "diretoria" || publico.includes(nivel);
}

/** Só a diretoria cria, edita e exclui eventos. */
export function podeEditar(nivel: Nivel): boolean {
  return nivel === "diretoria";
}

/** Para quem não passa pela RLS (feed .ics com service role): só o que `nivel` pode ver. */
export function visiveisPara<T extends { publico: readonly NivelPublico[] }>(linhas: readonly T[], nivel: Nivel): T[] {
  return linhas.filter((l) => podeVer(nivel, l.publico));
}

/** Liga/desliga um nível no público, devolvendo lista nova na ordem de NIVEIS_PUBLICO. */
export function alternarPublico(publico: readonly NivelPublico[], nivel: NivelPublico): NivelPublico[] {
  const ligado = publico.includes(nivel);
  return NIVEIS_PUBLICO.map((n) => n.id).filter((id) => (id === nivel ? !ligado : publico.includes(id)));
}

/** "Visível para …" no painel do evento. */
export function frasePublico(publico: readonly NivelPublico[]): string {
  const nomes = NIVEIS_PUBLICO.filter((n) => publico.includes(n.id)).map((n) => n.plural.toLowerCase());
  if (nomes.length === 0) return "só a diretoria";
  if (nomes.length === 1) return `diretoria e ${nomes[0]}`;
  return `diretoria, ${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}
