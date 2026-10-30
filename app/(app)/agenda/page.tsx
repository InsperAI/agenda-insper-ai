import type { Metadata } from "next";
import Agenda from "@/components/agenda/Agenda";
import type { EventosIniciais } from "@/lib/eventos";
import { deChaveDia } from "@/lib/fuso";
import { obterMembroAtual } from "@/lib/membro";
import { intervaloDaVista } from "@/lib/periodo";
import { supabaseServidor } from "@/lib/supabase/server";
import { lerParametros, type Vista } from "@/lib/url";

export const metadata: Metadata = { title: "Agenda" };

export default async function PaginaAgenda({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { vista, ancora } = lerParametros(await searchParams);
  // O layout de (app) já garante que há membro; `cache()` evita uma segunda consulta.
  const [{ membro }, eventosIniciais] = await Promise.all([obterMembroAtual(), buscarIniciais(vista, ancora)]);
  return (
    <Agenda
      vistaInicial={vista}
      ancoraInicial={ancora}
      eu={membro ? { id: membro.id, nivel: membro.nivel } : { id: "", nivel: "trainee" }}
      eventosIniciais={eventosIniciais}
    />
  );
}

/**
 * Eventos do período visível já na primeira resposta (a função roda em gru1,
 * ao lado do banco), em vez de o navegador buscar depois de carregar.
 * Se falhar, a agenda busca sozinha no cliente como antes.
 */
async function buscarIniciais(vista: Vista, ancora: string): Promise<EventosIniciais | undefined> {
  const { ini, fim } = intervaloDaVista(vista, deChaveDia(ancora));
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.rpc("events_in_range", { p_ini: ini.toISOString(), p_fim: fim.toISOString() });
  if (error || !data) return undefined;
  return { ini: ini.toISOString(), fim: fim.toISOString(), linhas: data };
}
