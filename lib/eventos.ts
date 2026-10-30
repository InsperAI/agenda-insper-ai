"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseNavegador, type ClienteSupabase } from "./supabase/client";
import type { Categoria, EventoRow, Frequencia, MembroRow, NivelPublico } from "./supabase/tipos";
import { criarCache } from "./cache";
import type { Intervalo } from "./periodo";
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
  /** Quem vê além da diretoria. Filhas herdam do mestre por trigger (0003). */
  publico: NivelPublico[];
};

/* ── Leitura ──────────────────────────────────────────────────────────────── */

/** Períodos já buscados (o atual, os vizinhos e os visitados há pouco). */
const CACHE_EVENTOS = criarCache<EventoRow[]>(12);

/** Eventos que a página já trouxe do servidor (datas em ISO, para atravessar a fronteira servidor → cliente). */
export type EventosIniciais = { ini: string; fim: string; linhas: EventoRow[] };

// O dono entra na chave: se outra pessoa entrar na mesma aba, não vê o cache de quem saiu.
const faixaDe = (dono: string, { ini, fim }: Intervalo) => `${dono}|${ini.toISOString()}|${fim.toISOString()}`;

/**
 * Linhas de `events_in_range` para [ini, fim). Mostra na hora o que já está em
 * cache e confirma com o banco por trás; depois de carregar, busca os períodos
 * vizinhos para a troca de mês/semana ser instantânea. Refaz a consulta quando
 * `recarregar()` é chamado e quando o Realtime avisa que a tabela mudou.
 * `iniciais` (vindos do servidor) aparecem já no primeiro render, sem consulta.
 */
export function useEventos(intervalo: Intervalo, vizinhos: Intervalo[], dono: string, iniciais?: EventosIniciais) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const [chaveInicial] = useState(() => {
    if (!iniciais) return null;
    const f = faixaDe(dono, { ini: new Date(iniciais.ini), fim: new Date(iniciais.fim) });
    CACHE_EVENTOS.guardar(f, iniciais.linhas);
    return `${f}|0`;
  });
  const [resultado, setResultado] = useState<{ chave: string; linhas: EventoRow[] } | null>(() =>
    iniciais && chaveInicial ? { chave: chaveInicial, linhas: iniciais.linhas } : null,
  );
  // Os iniciais acabaram de sair do banco: a primeira consulta do cliente seria repetida.
  const pularConsulta = useRef(chaveInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  const faixa = faixaDe(dono, intervalo);
  const chave = `${faixa}|${versao}`;
  const iniIso = intervalo.ini.toISOString();
  const fimIso = intervalo.fim.toISOString();

  const recarregar = useCallback(() => {
    CACHE_EVENTOS.limpar();
    setVersao((v) => v + 1);
  }, []);

  useEffect(() => {
    if (pularConsulta.current === chave) {
      pularConsulta.current = null;
      return;
    }
    let ativo = true;
    sb.rpc("events_in_range", { p_ini: iniIso, p_fim: fimIso }).then(({ data, error }) => {
      if (!ativo) return;
      if (error) {
        setErro(error.message);
        setResultado((prev) => ({ chave, linhas: prev?.linhas ?? [] }));
        return;
      }
      const linhas = data ?? [];
      CACHE_EVENTOS.guardar(faixa, linhas);
      setErro(null);
      setResultado({ chave, linhas });
    });
    return () => {
      ativo = false;
    };
  }, [sb, iniIso, fimIso, faixa, chave]);

  const pronto = resultado?.chave === chave;
  useEffect(() => {
    if (!pronto) return;
    for (const v of vizinhos) {
      const f = faixaDe(dono, v);
      if (CACHE_EVENTOS.ler(f)) continue;
      sb.rpc("events_in_range", { p_ini: v.ini.toISOString(), p_fim: v.fim.toISOString() }).then(({ data, error }) => {
        if (!error && data) CACHE_EVENTOS.guardar(f, data);
      });
    }
  }, [sb, pronto, vizinhos, dono]);

  useEffect(() => {
    const canal = sb
      .channel("agenda-eventos")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => recarregar())
      .subscribe();
    return () => {
      sb.removeChannel(canal);
    };
  }, [sb, recarregar]);

  const emCache = pronto ? undefined : CACHE_EVENTOS.ler(faixa);
  const linhas = pronto ? resultado.linhas : (emCache ?? resultado?.linhas ?? []);
  return { linhas, carregando: !pronto && !emCache, erro, recarregar, sb };
}

export type MembroResumo = Pick<MembroRow, "id" | "name">;

/** Mapa id → membro, para "criado por". */
export function useMembros() {
  const sb = useMemo(() => supabaseNavegador(), []);
  const [membros, setMembros] = useState<Map<string, MembroResumo>>(new Map());
  useEffect(() => {
    let ativo = true;
    sb.from("members")
      .select("id,name")
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
