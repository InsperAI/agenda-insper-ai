"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseNavegador, type ClienteSupabase } from "./supabase/client";
import type { Categoria, EventoRow, Frequencia, MembroRow } from "./supabase/tipos";
import type { Ocorrencia } from "./recorrencia";

/** O que o formulário entrega. Datas em ISO (instantes). */
export type DadosEvento = {
  title: string;
  category: Categoria;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string;
  link: string;
  description: string;
  freq: Frequencia | null;
  until: string | null;
};

/* ── Leitura ──────────────────────────────────────────────────────────────── */

/**
 * Linhas de `events_in_range` para [ini, fim). Refaz a consulta quando o
 * intervalo muda, quando `recarregar()` é chamado e quando o Realtime avisa
 * que a tabela mudou (outro membro editou).
 */
export function useEventos(ini: Date, fim: Date) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const [linhas, setLinhas] = useState<EventoRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const [chaveCarregada, setChaveCarregada] = useState<string | null>(null);

  const iniIso = ini.toISOString();
  const fimIso = fim.toISOString();
  const chave = `${iniIso}|${fimIso}|${versao}`;

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    let ativo = true;
    sb.rpc("events_in_range", { p_ini: iniIso, p_fim: fimIso }).then(({ data, error }) => {
      if (!ativo) return;
      if (error) {
        setErro(error.message);
      } else {
        setErro(null);
        setLinhas(data ?? []);
      }
      setChaveCarregada(chave);
    });
    return () => {
      ativo = false;
    };
  }, [sb, iniIso, fimIso, chave]);

  useEffect(() => {
    const canal = sb
      .channel("agenda-eventos")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => recarregar())
      .subscribe();
    return () => {
      sb.removeChannel(canal);
    };
  }, [sb, recarregar]);

  return { linhas, carregando: chaveCarregada !== chave, erro, recarregar, sb };
}

/** Mapa id → membro, para "criado por". */
export function useMembros() {
  const sb = useMemo(() => supabaseNavegador(), []);
  const [membros, setMembros] = useState<Map<string, MembroRow>>(new Map());
  useEffect(() => {
    let ativo = true;
    sb.from("members")
      .select("*")
      .then(({ data }) => {
        if (ativo && data) setMembros(new Map(data.map((m) => [m.id, m])));
      });
    return () => {
      ativo = false;
    };
  }, [sb]);
  return membros;
}

/* ── Escrita ──────────────────────────────────────────────────────────────── */

function lancar(error: { message: string } | null) {
  if (error) throw new Error(traduzirErro(error.message));
}

function traduzirErro(m: string): string {
  if (/row-level security/i.test(m)) return "Você não tem permissão para fazer isso.";
  if (/ends_after_start/i.test(m)) return "O fim precisa ser depois do início.";
  if (/link/i.test(m) && /check/i.test(m)) return "O link precisa começar com http:// ou https://.";
  if (/último admin/i.test(m)) return "Não é possível remover o último admin.";
  return m;
}

export async function criarEvento(sb: ClienteSupabase, dados: DadosEvento) {
  const { error } = await sb.from("events").insert(dados);
  lancar(error);
}

/** Edita um evento único ou uma linha filha diretamente. */
export async function atualizarEvento(sb: ClienteSupabase, id: string, dados: DadosEvento) {
  const { error } = await sb.from("events").update(dados).eq("id", id);
  lancar(error);
}

/** Exclui uma linha (mestre apaga a série inteira em cascata). */
export async function excluirEvento(sb: ClienteSupabase, id: string) {
  const { error } = await sb.from("events").delete().eq("id", id);
  lancar(error);
}

/** "Somente esta ocorrência": cria ou atualiza a linha filha desta ocorrência. */
export async function salvarOcorrencia(sb: ClienteSupabase, occ: Ocorrencia, dados: DadosEvento) {
  const serieId = occ.evento.series_id ?? occ.evento.id;
  const originalStart = occ.originalStart;
  if (!originalStart) throw new Error("Ocorrência sem instante original.");
  const { freq: _freq, until: _until, ...resto } = dados;
  void _freq;
  void _until;
  const { error } = await sb
    .from("events")
    .upsert(
      { ...resto, freq: null, until: null, series_id: serieId, original_start: originalStart, cancelled: false },
      { onConflict: "series_id,original_start" },
    );
  lancar(error);
}

/** "Excluir somente esta": marca a ocorrência como cancelada (cria a filha se preciso). */
export async function cancelarOcorrencia(sb: ClienteSupabase, occ: Ocorrencia) {
  if (!occ.virtual) {
    const { error } = await sb.from("events").update({ cancelled: true }).eq("id", occ.evento.id);
    lancar(error);
    return;
  }
  const e = occ.evento;
  const { error } = await sb.from("events").insert({
    title: e.title,
    category: e.category,
    start_at: occ.inicio.toISOString(),
    end_at: occ.fim.toISOString(),
    all_day: e.all_day,
    location: e.location,
    link: e.link,
    description: e.description,
    series_id: e.id,
    original_start: occ.originalStart,
    cancelled: true,
  });
  lancar(error);
}

/**
 * "Toda a série": atualiza o mestre. Se horário/recorrência mudaram, as filhas
 * perdem o sentido e são apagadas; senão, os campos de texto são propagados
 * para as filhas não canceladas.
 */
export async function atualizarSerie(sb: ClienteSupabase, mestre: EventoRow, dados: DadosEvento) {
  const mudouTempo =
    Date.parse(dados.start_at) !== Date.parse(mestre.start_at) ||
    Date.parse(dados.end_at) !== Date.parse(mestre.end_at) ||
    dados.all_day !== mestre.all_day ||
    dados.freq !== mestre.freq ||
    dados.until !== mestre.until;

  const { error } = await sb.from("events").update(dados).eq("id", mestre.id);
  lancar(error);

  if (mudouTempo) {
    const { error: e2 } = await sb.from("events").delete().eq("series_id", mestre.id);
    lancar(e2);
  } else {
    const { error: e2 } = await sb
      .from("events")
      .update({ title: dados.title, category: dados.category, location: dados.location, link: dados.link, description: dados.description })
      .eq("series_id", mestre.id)
      .eq("cancelled", false);
    lancar(e2);
  }
}

/** Verdadeiro se salvar `dados` em `mestre` vai apagar as edições individuais. */
export function vaiDescartarFilhas(mestre: EventoRow, dados: DadosEvento): boolean {
  return (
    Date.parse(dados.start_at) !== Date.parse(mestre.start_at) ||
    Date.parse(dados.end_at) !== Date.parse(mestre.end_at) ||
    dados.all_day !== mestre.all_day ||
    dados.freq !== mestre.freq ||
    dados.until !== mestre.until
  );
}
