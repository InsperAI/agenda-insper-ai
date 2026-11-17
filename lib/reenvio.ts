/**
 * "Reenviar convites" (Conectar → Google Agenda · na hora). Puro e seguro para o
 * navegador; quem fala com o Google é lib/google/reenviar.ts.
 */

/** Intervalo mínimo entre dois reenvios (ou entre ativar e reenviar) da mesma pessoa. */
export const INTERVALO_REENVIO_MIN = 2;

/** Onde fica "Adicionar convites à minha agenda" no Google Agenda. */
export const CONFIG_GOOGLE_AGENDA = "https://calendar.google.com/calendar/r/settings";

export type ResultadoReenvio = { eventos: number; faltaram: number; falhas: number };

/**
 * Vale tirar e pôr a pessoa de volta? Só se o evento ainda existe no Google (não
 * ressuscitar o que foi apagado no meio do caminho) e ela não respondeu: quem
 * respondeu Sim/Não/Talvez recebeu o convite, e reenviar só apagaria a resposta.
 */
export function precisaReconvite(existe: boolean, resposta: string | undefined): boolean {
  return existe && (resposta === undefined || resposta === "needsAction");
}

/** Quem esperou mais vai primeiro (sem data antes de todos): "toque de novo" avança em vez de repetir. */
export function maisAntigosPrimeiro<T>(itens: readonly T[], quando: (item: T) => string | undefined): T[] {
  const instante = (item: T) => {
    const q = quando(item);
    return q ? Date.parse(q) : Number.NEGATIVE_INFINITY;
  };
  return [...itens].sort((a, b) => instante(a) - instante(b));
}

const plural = (n: number, um: string, varios: string) => (n === 1 ? `${n} ${um}` : `${n} ${varios}`);

export function mensagemReenvio(status: number, r: ResultadoReenvio | null): string {
  if (status === 429) return `Você acabou de ativar ou reenviar. Espere ${INTERVALO_REENVIO_MIN} minutos e tente de novo.`;
  if (status === 404) return "Ative o Google Agenda · na hora primeiro.";
  if (status === 502) return "Não deu para falar com o Google agora. Tente de novo em alguns minutos.";
  if (status !== 200 || !r) return "Não deu para reenviar. Tente de novo em alguns minutos.";

  const restam = r.faltaram + r.falhas;
  if (restam > 0) return `Reenviamos ${plural(r.eventos, "convite", "convites")} e faltaram ${restam}. Toque de novo daqui a ${INTERVALO_REENVIO_MIN} minutos.`;
  if (r.eventos === 0) return "Não há eventos seus no Google Agenda para reenviar agora.";
  return `Pronto: ${plural(r.eventos, "convite reenviado", "convites reenviados")}. Confira o Google Agenda em instantes.`;
}
