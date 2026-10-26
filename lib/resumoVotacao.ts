import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import { dataHoraCurta } from "./datas";
import type { Database, ResumoVotacao } from "./supabase/tipos";
import { rotuloDuracao } from "./votacao";

const CODIGO = /^[a-z0-9]{7}$/i;

/**
 * Resumo público de um pedido pelo código do link curto (resumo_votacao, 0006).
 * Usa só a chave pública e não depende de sessão: é o que a prévia do WhatsApp
 * enxerga. `cache()` evita repetir a consulta entre metadata, página e imagem.
 */
export const obterResumoVotacao = cache(async (codigo: string): Promise<ResumoVotacao | null> => {
  if (!CODIGO.test(codigo)) return null;
  const sb = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await sb.rpc("resumo_votacao", { p_codigo: codigo });
  return data?.[0] ?? null;
});

/** "Reunião de 1h · marque até 30/10/2026 às 23h" */
export function detalheResumo(r: ResumoVotacao): string {
  if (r.confirmada) return `Reunião de ${rotuloDuracao(r.duracao_min)} · horário já confirmado`;
  return `Reunião de ${rotuloDuracao(r.duracao_min)} · marque até ${dataHoraCurta(new Date(r.prazo))}`;
}
