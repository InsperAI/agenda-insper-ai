"use client";

import { addDays, addHours, setHours, setMinutes } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import CabecalhoAgenda from "@/components/agenda/CabecalhoAgenda";
import FiltroCategorias from "@/components/agenda/FiltroCategorias";
import FormularioEvento from "@/components/agenda/FormularioEvento";
import PainelEvento from "@/components/agenda/PainelEvento";
import VistaMes from "@/components/agenda/VistaMes";
import VistaProximos from "@/components/agenda/VistaProximos";
import VistaSemana from "@/components/agenda/VistaSemana";
import Barra from "@/components/layout/Barra";
import Botao from "@/components/ui/Botao";
import { TODAS_CATEGORIAS } from "@/lib/categorias";
import { tituloMes, tituloSemana } from "@/lib/datas";
import { agoraSP, chaveDia, gradeDoMes, inicioDaSemana, inicioDoDia, inicioDoMes } from "@/lib/fuso";
import { expandir, type Ocorrencia } from "@/lib/recorrencia";
import type { EventoRow, MembroRow } from "@/lib/supabase/tipos";
import GaleriaVotacao from "./GaleriaVotacao";

const MEMBROS: MembroRow[] = [
  { id: "m1", email: "gui@insper.ai", name: "Guilherme Leal", cargo: "Presidente", nivel: "diretoria", is_admin: true, created_at: "2026-08-01T12:00:00Z" },
  { id: "m2", email: "alex@insper.ai", name: "Alex Chequer", cargo: "Diretor Acadêmico", nivel: "diretoria", is_admin: false, created_at: "2026-08-01T12:00:00Z" },
];

function linha(p: Partial<EventoRow> & Pick<EventoRow, "id" | "title" | "category" | "start_at" | "end_at">): EventoRow {
  return {
    all_day: false,
    location: "",
    link: "",
    description: "",
    freq: null,
    until: null,
    series_id: null,
    original_start: null,
    cancelled: false,
    publico: [],
    convidados: [],
    created_by: "m1",
    updated_by: "m2",
    created_at: "2026-08-01T12:00:00+00:00",
    updated_at: "2026-09-10T15:30:00+00:00",
    ...p,
  };
}

function dadosExemplo(): EventoRow[] {
  const hoje = inicioDoDia(agoraSP());
  const seg = inicioDaSemana(hoje);
  const mes = inicioDoMes(hoje);
  const iso = (d: Date) => d.toISOString();
  return [
    linha({
      id: "reuniao",
      title: "Reunião geral da diretoria",
      category: "reuniao",
      start_at: iso(setHours(addDays(seg, 1), 19)),
      end_at: iso(addHours(setHours(addDays(seg, 1), 19), 1.5)),
      freq: "semanal",
      until: chaveDia(addDays(hoje, 120)),
      location: "Sala 404 · Insper",
      link: "https://meet.google.com/abc-defg-hij",
      description: "Pauta fixa:\n- Status dos núcleos\n- Pendências da semana",
    }),
    linha({
      id: "aula",
      title: "Trilha de ML e DL — aula 6",
      category: "aula",
      start_at: iso(setHours(addDays(seg, 3), 18)),
      end_at: iso(setHours(addDays(seg, 3), 20)),
      freq: "semanal",
      until: chaveDia(addDays(hoje, 60)),
      location: "Auditório 2",
    }),
    linha({
      id: "evento",
      title: "AI Day com QuantumBlack",
      category: "evento",
      start_at: iso(setHours(addDays(seg, 4), 19)),
      end_at: iso(setHours(addDays(seg, 4), 22)),
      location: "Auditório Steffi e Max Perlman",
      link: "https://insper.ai/eventos/ai-day",
      description: "Painel + networking. Inscrições pelo link.",
    }),
    linha({
      id: "sprint",
      title: "Sprint review — projeto QI Tech",
      category: "reuniao",
      start_at: iso(setMinutes(setHours(addDays(seg, 4), 18), 30)),
      end_at: iso(setMinutes(setHours(addDays(seg, 4), 19), 30)),
    }),
    linha({
      id: "prazo",
      title: "Entrega do relatório de patrocínio",
      category: "prazo",
      all_day: true,
      start_at: iso(addDays(seg, 5)),
      end_at: iso(addDays(seg, 6)),
      description: "Enviar para o BTG até o fim do dia.",
    }),
    linha({
      id: "ps",
      title: "Processo seletivo 2026.2 — inscrições",
      category: "evento",
      all_day: true,
      start_at: iso(addDays(mes, 8)),
      end_at: iso(addDays(mes, 13)),
    }),
    linha({
      id: "mentoria",
      title: "Mentoria com a Nero",
      category: "evento",
      start_at: iso(setHours(addDays(seg, 2), 12)),
      end_at: iso(setHours(addDays(seg, 2), 13)),
    }),
    linha({
      id: "bootcamp",
      title: "Bootcamp Google Cloud",
      category: "aula",
      start_at: iso(setHours(addDays(seg, 2), 10)),
      end_at: iso(setMinutes(setHours(addDays(seg, 2), 12), 30)),
      location: "Lab 3",
    }),
    linha({
      id: "ocorrencia-movida",
      title: "Reunião geral da diretoria (adiada)",
      category: "reuniao",
      series_id: "reuniao",
      original_start: iso(setHours(addDays(seg, 8), 19)),
      start_at: iso(setHours(addDays(seg, 9), 19)),
      end_at: iso(setHours(addDays(seg, 9), 20)),
    }),
    ...Array.from({ length: 5 }, (_, i) =>
      linha({
        id: `extra-${i}`,
        title: `Reunião do núcleo ${["Acadêmico", "Projetos", "Institucional", "Pessoas", "Presidência"][i]}`,
        category: "reuniao",
        start_at: iso(setHours(addDays(seg, 1), 9 + i)),
        end_at: iso(setHours(addDays(seg, 1), 10 + i)),
      }),
    ),
  ];
}

export default function Galeria() {
  const [hoje] = useState(() => chaveDia(new Date()));
  const [agoraMs] = useState(() => Date.now());
  const ancora = useMemo(() => inicioDoDia(agoraSP()), []);
  const linhas = useMemo(() => dadosExemplo(), []);
  const ocorrencias = useMemo(() => {
    const grade = gradeDoMes(ancora);
    return expandir(linhas, addDays(grade[0], -7), addDays(grade[41], 60));
  }, [linhas, ancora]);
  const membros = useMemo(() => new Map(MEMBROS.map((m) => [m.id, m])), []);
  const [selecionada, setSelecionada] = useState<Ocorrencia | null>(null);
  const [form, setForm] = useState(false);
  const [filtros, setFiltros] = useState(() => new Set(TODAS_CATEGORIAS));

  // ?abrir=painel | ?abrir=form — para capturar os diálogos em screenshots.
  useEffect(() => {
    const abrir = new URLSearchParams(window.location.search).get("abrir");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (abrir === "painel") setSelecionada(ocorrencias.find((o) => o.evento.id === "reuniao" && o.virtual) ?? ocorrencias[0] ?? null);
    else if (abrir === "form") setForm(true);
  }, [ocorrencias]);

  return (
    <>
      <Barra membro={MEMBROS[0]} tema="sistema" />
      <main className="wrap flex min-w-0 flex-col gap-10 py-6">
        <p className="rounded-lg bg-ia-nevoa px-3 py-2 text-[0.8125rem] text-ia-apoio">
          Galeria de desenvolvimento com dados de exemplo. Não grava nada. Em produção esta rota é 404.
        </p>

        <section className="flex flex-col gap-4">
          <CabecalhoAgenda vista="mes" titulo={tituloMes(ancora)} busca="" carregando={false} aoMudarVista={() => {}} aoAnterior={() => {}} aoProximo={() => {}} aoHoje={() => {}} aoBuscar={() => {}} aoNovo={() => setForm(true)} />
          <FiltroCategorias
            ativas={filtros}
            aoAlternar={(c) =>
              setFiltros((p) => {
                const n = new Set(p);
                if (n.has(c)) n.delete(c);
                else n.add(c);
                return n;
              })
            }
          />
          <VistaMes ancora={ancora} ocorrencias={ocorrencias.filter((o) => filtros.has(o.evento.category))} hoje={hoje} aoSelecionar={setSelecionada} aoCriarEm={() => setForm(true)} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="t-h3 tabular">{tituloSemana(inicioDaSemana(ancora))}</h2>
          <VistaSemana ancora={ancora} ocorrencias={ocorrencias} hoje={hoje} aoSelecionar={setSelecionada} aoCriarEm={() => setForm(true)} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="t-h3">Próximos 60 dias</h2>
          <VistaProximos ocorrencias={ocorrencias.filter((o) => o.fim.getTime() > agoraMs)} carregando={false} aoSelecionar={setSelecionada} />
        </section>

        <GaleriaVotacao />

        <section className="flex gap-2">
          <Botao onClick={() => setSelecionada(ocorrencias[0] ?? null)}>Abrir painel</Botao>
          <Botao variante="primario" onClick={() => setForm(true)}>
            Abrir formulário
          </Botao>
        </section>
      </main>

      <PainelEvento occ={selecionada} membros={membros} aoFechar={() => setSelecionada(null)} aoEditar={() => setForm(true)} aoExcluir={() => setSelecionada(null)} />
      {form && (
        <FormularioEvento aberto modo="criar" inicial={{ inicio: setHours(ancora, 19), fim: setHours(ancora, 20) }} salvando={false} aoSalvar={() => setForm(false)} aoFechar={() => setForm(false)} />
      )}
    </>
  );
}
