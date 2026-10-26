import { addDays, addMinutes } from "date-fns";
import { dataCurta, DIAS_SEMANA_GRADE } from "./datas";
import { chaveDia, deChaveDia, sp } from "./fuso";
import type { ModoVotacao, VotacaoRow } from "./supabase/tipos";

/**
 * Pedidos de disponibilidade — no código e no banco, "votação" (supabase/migrations/0004_votacoes.sql). Puro e testável.
 * Grade fixa: blocos de 30 min das 8h às 21h. Chave de bloco "<dia>|<bloco>",
 * com dia = 'AAAA-MM-DD' (única) ou '1'..'7' (recorrente, 1 = segunda).
 */
export const HORA_INICIO = 8;
export const HORA_FIM = 21;
export const MIN_BLOCO = 30;
export const N_BLOCOS = ((HORA_FIM - HORA_INICIO) * 60) / MIN_BLOCO;
export const BLOCOS = Array.from({ length: N_BLOCOS }, (_, i) => i);

/** '1'..'7' com rótulos, segunda primeiro. */
export const DIAS_DA_SEMANA = DIAS_SEMANA_GRADE.map((curto, i) => ({ id: String(i + 1), curto }));
const DIAS_LONGOS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

export function chaveBloco(dia: string, bloco: number): string {
  return `${dia}|${bloco}`;
}

/** Bloco 0 = "8h", 1 = "8h30"… N_BLOCOS = "21h" (fim da grade). */
export function rotuloBloco(bloco: number): string {
  const minutos = HORA_INICIO * 60 + bloco * MIN_BLOCO;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** 30 → "30 min", 90 → "1h30". */
export function rotuloDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const m = minutos % 60;
  return m ? `${Math.floor(minutos / 60)}h${String(m).padStart(2, "0")}` : `${minutos / 60}h`;
}

export function rotuloDia(modo: ModoVotacao, dia: string): string {
  if (modo === "recorrente") return DIAS_LONGOS[Number(dia) - 1] ?? dia;
  const d = deChaveDia(dia);
  return `${DIAS_SEMANA_GRADE[(d.getDay() + 6) % 7]} ${dataCurta(d)}`;
}

/** Datas da semana que começa em `segunda` ('AAAA-MM-DD') para os dias '1'..'7' escolhidos. */
export function diasDaSemana(segunda: string, dias: readonly string[]): string[] {
  const base = deChaveDia(segunda);
  return [...dias].sort().map((d) => chaveDia(addDays(base, Number(d) - 1)));
}

/** Próxima data (inclusive hoje) que cai no dia da semana '1'..'7'. */
export function proximaData(dia: string, hoje: Date): string {
  const atual = (sp(hoje).getDay() + 6) % 7; // 0 = segunda
  const alvo = Number(dia) - 1;
  return chaveDia(addDays(sp(hoje), (alvo - atual + 7) % 7));
}

/** Instante (SP) em que começa o bloco `bloco` da data `dia`. */
export function inicioDoHorario(dia: string, bloco: number): Date {
  return addMinutes(deChaveDia(dia), HORA_INICIO * 60 + bloco * MIN_BLOCO);
}

export type StatusVotacao = "aberta" | "pronta" | "confirmada";

/** "pronta" = resultado disponível: todos responderam ou o prazo venceu. Confirmada vale por `confirmada_em`. */

/** Ainda aceita respostas: não confirmada e dentro do prazo (mesma regra de votacao_aceita no banco). */
export function aceitaRespostas(v: Pick<VotacaoRow, "confirmada_em" | "prazo">, agora: number): boolean {
  return v.confirmada_em === null && Date.parse(v.prazo) > agora;
}

export function statusVotacao(v: Pick<VotacaoRow, "confirmada_em" | "prazo">, respondidos: number, total: number, agora: Date): StatusVotacao {
  if (v.confirmada_em) return "confirmada";
  if ((total > 0 && respondidos >= total) || Date.parse(v.prazo) <= agora.getTime()) return "pronta";
  return "aberta";
}

/** Faixa de inícios seguidos [inicio, fim) em blocos, com quem pode a reunião inteira. */
export type Faixa = { dia: string; inicio: number; fim: number; podem: string[]; naoPodem: string[] };

/**
 * Onde a reunião (duracaoMin) cabe para quem respondeu. Se existe horário em que
 * todos podem, devolve todas essas faixas; senão, as de maior adesão (até 5).
 * `fim` é exclusivo e já inclui a duração: faixa 9h–10h30 = inícios 9h ou 9h30.
 */
export function melhoresHorarios({
  dias,
  duracaoMin,
  respostas,
}: {
  dias: readonly string[];
  duracaoMin: number;
  respostas: readonly { member_id: string; blocos: readonly string[] }[];
}): { todosPodem: boolean; faixas: Faixa[] } {
  const n = Math.max(1, Math.round(duracaoMin / MIN_BLOCO));
  const pessoas = respostas.map((r) => ({ id: r.member_id, blocos: new Set(r.blocos) }));
  if (pessoas.length === 0) return { todosPodem: false, faixas: [] };

  // Para cada início possível: quem tem os n blocos seguidos livres.
  const inicios = dias.flatMap((dia) =>
    BLOCOS.slice(0, N_BLOCOS - n + 1).map((inicio) => {
      const podem = pessoas.filter((p) => BLOCOS.slice(inicio, inicio + n).every((b) => p.blocos.has(chaveBloco(dia, b)))).map((p) => p.id);
      return { dia, inicio, podem };
    }),
  );

  const maximo = Math.max(...inicios.map((i) => i.podem.length));
  if (maximo === 0) return { todosPodem: false, faixas: [] };

  const faixas = agrupar(inicios.filter((i) => i.podem.length === maximo), n).map((f) => ({
    ...f,
    naoPodem: pessoas.map((p) => p.id).filter((id) => !f.podem.includes(id)),
  }));
  const todosPodem = maximo === pessoas.length;
  return { todosPodem, faixas: todosPodem ? faixas : faixas.slice(0, 5) };
}

/** Junta inícios seguidos no mesmo dia e com as mesmas pessoas numa faixa só. */
function agrupar(inicios: { dia: string; inicio: number; podem: string[] }[], n: number): Omit<Faixa, "naoPodem">[] {
  const faixas: Omit<Faixa, "naoPodem">[] = [];
  for (const i of inicios) {
    const ultima = faixas.at(-1);
    const continua = ultima && ultima.dia === i.dia && ultima.fim - n + 1 === i.inicio && ultima.podem.join() === i.podem.join();
    if (continua) faixas[faixas.length - 1] = { ...ultima, fim: i.inicio + n };
    else faixas.push({ dia: i.dia, inicio: i.inicio, fim: i.inicio + n, podem: i.podem });
  }
  return faixas;
}

/**
 * O banco (0004) fala em "votação"; a interface chama de "pedido de disponibilidade".
 * Traduz as mensagens do `raise exception` sem precisar de outra migração.
 */
const ERROS_DO_BANCO: Record<string, string> = {
  "Só a diretoria abre votações.": "Só a diretoria pede disponibilidade.",
  "Você não participa desta votação.": "Você não está entre os convidados deste pedido.",
  "Bloco inválido para esta votação.": "Horário inválido para este pedido.",
  "Esta votação já foi confirmada.": "Este pedido já foi confirmado.",
  "Horário fora da grade da votação.": "Horário fora da grade do pedido.",
  "Esse dia não faz parte da votação.": "Esse dia não faz parte do pedido.",
  "Repetição inválida para este tipo de votação.": "Repetição inválida para este tipo de pedido.",
  "Só quem abriu a votação (e ainda é da diretoria) pode confirmar.": "Só quem fez o pedido (e ainda é da diretoria) pode confirmar.",
  "Só quem abriu a votação (e ainda é da diretoria) pode reabrir.": "Só quem fez o pedido (e ainda é da diretoria) pode reabrir.",
};

export function traduzirErroVotacao(mensagem: string): string {
  return ERROS_DO_BANCO[mensagem] ?? mensagem;
}
