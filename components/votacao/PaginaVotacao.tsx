"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Aviso from "@/components/ui/Aviso";
import Botao from "@/components/ui/Botao";
import { IcoCalendario, IcoChecar, IcoCopiar } from "@/components/ui/Icones";
import Segmentado from "@/components/ui/Segmentado";
import { dataHoraCurta } from "@/lib/datas";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { MapaVotacao, RespostaRow, VotacaoRow } from "@/lib/supabase/tipos";
import { rotuloDuracao, traduzirErroVotacao, type StatusVotacao } from "@/lib/votacao";
import GradeVotacao from "./GradeVotacao";
import ResultadoVotacao from "./ResultadoVotacao";

const ESPERA_SALVAR_MS = 600;

type Vista = "minha" | "todos";
const VISTAS: { valor: Vista; rotulo: string }[] = [
  { valor: "minha", rotulo: "Minha disponibilidade" },
  { valor: "todos", rotulo: "Todos" },
];

/**
 * Página de um pedido de disponibilidade. Cada mudança na grade é salva sozinha (com uma pequena
 * espera para juntar o arraste) e o mapa de calor é atualizado em seguida.
 */
export default function PaginaVotacao({
  votacao,
  status,
  aceita,
  minhaResposta,
  mapaInicial,
  criador,
}: {
  votacao: VotacaoRow;
  status: StatusVotacao;
  aceita: boolean;
  minhaResposta: string[] | null;
  mapaInicial: MapaVotacao;
  /** Só para quem abriu: respostas com nomes. */
  criador: { respostas: RespostaRow[]; convidados: { id: string; name: string }[] } | null;
}) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const router = useRouter();
  const [minhas, setMinhas] = useState<Set<string>>(() => new Set(minhaResposta ?? []));
  const [mapa, setMapa] = useState(mapaInicial);
  const [vista, setVista] = useState<Vista>(aceita ? "minha" : "todos");
  const [salvo, setSalvo] = useState<"salvo" | "salvando" | null>(minhaResposta ? "salvo" : null);
  const [aviso, setAviso] = useState<string | null>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendente = useRef<Set<string> | null>(null);

  // Saiu da página com uma pintura ainda esperando: salva na hora (a requisição
  // segue mesmo com o componente desmontado). Fechar a aba pede confirmação.
  useEffect(() => {
    const avisar = (e: BeforeUnloadEvent) => {
      if (pendente.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", avisar);
    return () => {
      window.removeEventListener("beforeunload", avisar);
      if (espera.current) clearTimeout(espera.current);
      if (pendente.current) void sb.from("votacao_respostas").upsert({ votacao_id: votacao.id, blocos: [...pendente.current] }, { onConflict: "votacao_id,member_id" });
    };
  }, [sb, votacao.id]);

  function mudar(novas: Set<string>) {
    setMinhas(novas);
    setSalvo("salvando");
    pendente.current = novas;
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => void salvar(novas), ESPERA_SALVAR_MS);
  }

  async function salvar(blocos: Set<string>) {
    pendente.current = null;
    const { error } = await sb.from("votacao_respostas").upsert({ votacao_id: votacao.id, blocos: [...blocos] }, { onConflict: "votacao_id,member_id" });
    if (error) {
      setSalvo(null);
      return setAviso(/row-level security/i.test(error.message) ? "O pedido fechou; não dá mais para mudar." : traduzirErroVotacao(error.message));
    }
    setSalvo("salvo");
    const { data } = await sb.rpc("mapa_votacao", { p_id: votacao.id });
    if (data) setMapa(data);
    router.refresh(); // atualiza o contador da barra e o painel de quem abriu
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/disponibilidade/${votacao.id}`);
      setAviso("Link copiado. Cole no grupo para todos preencherem.");
    } catch {
      setAviso("Não deu para copiar; copie o endereço da barra do navegador.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <Link href="/disponibilidade" className="self-start text-[0.8125rem] text-ia-apoio hover:text-ia-petroleo">
          ← Disponibilidade
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="t-h2">{votacao.titulo}</h1>
            <p className="t-apoio mt-1">
              Reunião de {rotuloDuracao(votacao.duracao_min)} · {votacao.modo === "recorrente" ? "recorrente" : "data única"} · {mapa.respondidos} de {mapa.total} responderam
            </p>
            {votacao.descricao && <p className="t-corpo mt-2 max-w-2xl whitespace-pre-wrap">{votacao.descricao}</p>}
          </div>
          <Botao onClick={copiarLink}>
            <IcoCopiar /> Copiar link
          </Botao>
        </div>
        <FaixaStatus status={status} aceita={aceita} prazo={votacao.prazo} />
      </header>

      {criador && <ResultadoVotacao votacao={votacao} respostas={criador.respostas} convidados={criador.convidados} aoAvisar={setAviso} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentado opcoes={VISTAS} valor={vista} aoMudar={setVista} rotulo="O que mostrar na grade" />
        <p className="text-[0.8125rem] text-ia-meta" aria-live="polite">
          {vista === "minha"
            ? aceita
              ? salvo === "salvando"
                ? "Salvando…"
                : salvo === "salvo"
                  ? "Salvo"
                  : "Arraste sobre os horários em que você pode."
              : "Este pedido não aceita mais respostas."
            : "Quanto mais forte, mais gente pode."}
        </p>
      </div>

      <GradeVotacao
        modo={votacao.modo}
        dias={votacao.dias}
        minhas={minhas}
        contagem={mapa.contagem}
        total={mapa.total}
        vista={vista}
        editavel={aceita}
        aoMudar={mudar}
      />

      <Aviso mensagem={aviso} aoFechar={fecharAviso} />
    </div>
  );
}

function FaixaStatus({ status, aceita, prazo }: { status: StatusVotacao; aceita: boolean; prazo: string }) {
  if (status === "confirmada") {
    return (
      <p className="inline-flex items-center gap-2 self-start rounded-lg bg-ia-nevoa px-3 py-2 text-[0.875rem] text-ia-petroleo">
        <IcoCalendario /> Horário confirmado: já está na agenda.
        <Link href="/agenda" className="underline underline-offset-4">
          Ver agenda
        </Link>
      </p>
    );
  }
  return (
    <p className="inline-flex items-center gap-2 self-start rounded-lg bg-ia-nevoa px-3 py-2 text-[0.875rem] text-ia-apoio">
      {aceita ? (
        <>Aberta até {dataHoraCurta(new Date(prazo))}</>
      ) : (
        <>
          <IcoChecar /> Prazo encerrado em {dataHoraCurta(new Date(prazo))}
        </>
      )}
    </p>
  );
}
