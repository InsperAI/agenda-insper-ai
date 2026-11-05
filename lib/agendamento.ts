import { addMinutes } from "date-fns";
import { ehFalhaDeRede, SEM_CONEXAO } from "./erros";
import { chaveDia, spDe } from "./fuso";
import type { AgendamentoRow, GrupoRow, HorarioRow, IntegranteRow } from "./supabase/tipos";

/** Uma janela de horários: dia (AAAA-MM-DD) e início/fim (HH:MM) no fuso de São Paulo. */
export type Janela = { dia: string; inicio: string; fim: string };
export type Horario = { inicio: Date; fim: Date };

/** Limite do banco (criar_agendamento). */
export const MAX_HORARIOS = 200;
export const NOME_GRUPO_MAX = 60;

const DIA = /^(\d{4})-(\d{2})-(\d{2})$/;
const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

function instante(dia: string, horaMin: string): Date | null {
  const d = DIA.exec(dia);
  const h = HORA.exec(horaMin);
  if (!d || !h) return null;
  return spDe(Number(d[1]), Number(d[2]), Number(d[3]), Number(h[1]), Number(h[2]));
}

/**
 * Fatia cada janela em horários de `duracaoMin`, com `intervaloMin` entre um e
 * outro; só entra o horário que termina dentro da janela. Junta tudo em ordem e
 * descarta o que sobrepõe um horário anterior (janelas que se cruzam).
 */
export function gerarHorarios(janelas: readonly Janela[], duracaoMin: number, intervaloMin: number): Horario[] {
  if (!(duracaoMin > 0) || intervaloMin < 0) return [];
  const todos: Horario[] = [];
  for (const j of janelas) {
    const ini = instante(j.dia, j.inicio);
    const fim = instante(j.dia, j.fim);
    if (!ini || !fim || fim <= ini) continue;
    for (let t = ini; addMinutes(t, duracaoMin) <= fim; t = addMinutes(t, duracaoMin + intervaloMin)) {
      // Date simples: TZDate.toISOString() sairia com -03:00 em vez de UTC.
      todos.push({ inicio: new Date(t.getTime()), fim: new Date(addMinutes(t, duracaoMin).getTime()) });
    }
  }
  todos.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const semSobrepor: Horario[] = [];
  for (const h of todos) {
    const anterior = semSobrepor.at(-1);
    if (!anterior || h.inicio >= anterior.fim) semSobrepor.push(h);
  }
  return semSobrepor;
}

export function nomeGrupoValido(nome: string): boolean {
  const n = nome.trim();
  return n.length >= 1 && n.length <= NOME_GRUPO_MAX;
}

/** As mensagens do banco (0012) já vêm em português; aqui só os casos técnicos. */
export function traduzirErroAgendamento(mensagem: string): string {
  if (ehFalhaDeRede(mensagem)) return SEM_CONEXAO;
  if (/agendamentos_titulo_check/.test(mensagem)) return "Dê um título com até 120 caracteres.";
  if (/agendamento_grupos_nome_check/.test(mensagem)) return `O nome do grupo precisa ter de 1 a ${NOME_GRUPO_MAX} caracteres.`;
  if (/row-level security/i.test(mensagem)) return "Você não tem permissão para fazer isso.";
  return mensagem;
}

/** Horários agrupados pelo dia (em São Paulo), na ordem em que vêm. */
export function porDia<T extends { inicio: Date }>(horarios: readonly T[]): { dia: string; horarios: T[] }[] {
  const dias: { dia: string; horarios: T[] }[] = [];
  for (const h of horarios) {
    const dia = chaveDia(h.inicio);
    const atual = dias.at(-1);
    if (atual?.dia === dia) atual.horarios.push(h);
    else dias.push({ dia, horarios: [h] });
  }
  return dias;
}

/** Tudo que a página de um agendamento carrega do banco. */
export type DadosAgendamento = {
  ag: AgendamentoRow;
  horarios: HorarioRow[];
  grupos: GrupoRow[];
  integrantes: IntegranteRow[];
  /** ids dos convidados */
  convidados: string[];
  /** id → nome de quem aparece na página */
  nomes: Record<string, string>;
};

export type PessoaVisao = { id: string; nome: string };
export type GrupoVisao = { id: string; nome: string; horario: HorarioRow | null; pessoas: PessoaVisao[] };
export type HorarioVisao = { horario: HorarioRow; grupo: GrupoVisao | null; passado: boolean };

export type Visao = {
  /** Aceita mudanças de quem responde (não confirmado e dentro do prazo). */
  aberto: boolean;
  meuGrupo: GrupoVisao | null;
  /** Com horário primeiro (na ordem dos horários), depois os sem horário por nome. */
  grupos: GrupoVisao[];
  semGrupo: PessoaVisao[];
  horarios: HorarioVisao[];
};

const porNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, "pt-BR");

export function montarVisao(d: DadosAgendamento, meuId: string, agora: number): Visao {
  const nome = (id: string) => ({ id, nome: d.nomes[id] ?? "Alguém" });
  const horarioPorId = new Map(d.horarios.map((h) => [h.id, h]));
  const grupos: GrupoVisao[] = d.grupos.map((g) => ({
    id: g.id,
    nome: g.nome,
    horario: g.horario_id ? (horarioPorId.get(g.horario_id) ?? null) : null,
    pessoas: d.integrantes
      .filter((i) => i.grupo_id === g.id)
      .map((i) => nome(i.member_id))
      .sort(porNome),
  }));
  grupos.sort((a, b) => {
    if (a.horario && b.horario) return Date.parse(a.horario.inicio) - Date.parse(b.horario.inicio);
    if (a.horario) return -1;
    if (b.horario) return 1;
    return porNome(a, b);
  });
  const grupoDoHorario = new Map(grupos.filter((g) => g.horario).map((g) => [g.horario!.id, g]));
  const comGrupo = new Set(d.integrantes.map((i) => i.member_id));
  const meuGrupoId = d.integrantes.find((i) => i.member_id === meuId)?.grupo_id;

  return {
    aberto: d.ag.confirmado_em === null && Date.parse(d.ag.prazo) > agora,
    meuGrupo: grupos.find((g) => g.id === meuGrupoId) ?? null,
    grupos,
    semGrupo: d.convidados
      .filter((id) => !comGrupo.has(id))
      .map(nome)
      .sort(porNome),
    horarios: [...d.horarios]
      .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
      .map((h) => ({ horario: h, grupo: grupoDoHorario.get(h.id) ?? null, passado: Date.parse(h.inicio) <= agora })),
  };
}
