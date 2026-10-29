"use client";

import { addDays, addHours, addMonths, addWeeks, setHours } from "date-fns";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import Aviso from "@/components/ui/Aviso";
import Botao from "@/components/ui/Botao";
import Dialogo from "@/components/ui/Dialogo";
import { TODAS_CATEGORIAS } from "@/lib/categorias";
import { tituloMes, tituloSemana } from "@/lib/datas";
import {
  atualizarEvento,
  atualizarSerie,
  cancelarOcorrencia,
  criarEvento,
  excluirEvento,
  salvarOcorrencia,
  useEventos,
  useMembros,
  vaiDescartarFilhas,
  type DadosEvento,
} from "@/lib/eventos";
import { agoraSP, chaveDia, deChaveDia, gradeDoMes, inicioDaSemana, inicioDoDia, inicioDoMes } from "@/lib/fuso";
import { expandir, type Ocorrencia } from "@/lib/recorrencia";
import { podeCriarEvento, podeMexerNoEvento } from "@/lib/niveis";
import type { Categoria, EventoRow, Nivel } from "@/lib/supabase/tipos";
import { montarUrl, type Vista } from "@/lib/url";
import BotaoFlutuante from "./BotaoFlutuante";
import CabecalhoAgenda from "./CabecalhoAgenda";
import DialogoSerie, { type Escopo, type PerguntaSerie } from "./DialogoSerie";
import FiltroCategorias from "./FiltroCategorias";
import FormularioEvento, { type ModoFormulario, type ValoresIniciais } from "./FormularioEvento";
import PainelEvento from "./PainelEvento";
import VistaMes from "./VistaMes";
import VistaProximos from "./VistaProximos";
import VistaSemana from "./VistaSemana";

type Formulario = { modo: "criar"; inicio?: Date; diaInteiro?: boolean } | { modo: "editar"; occ: Ocorrencia; escopo: Escopo };

const CHAVE_FILTROS = "agenda:filtros";

/** Deslize horizontal mínimo (px) para trocar de mês no celular. */
const DESLIZE_MIN_PX = 60;

/** Mês/semana deslizam 24 px no sentido da navegação; troca de vista só esmaece. */
const TRANSICAO_PERIODO: Variants = {
  entra: (dir: number) => ({ opacity: 0, x: dir * 24 }),
  parado: { opacity: 1, x: 0, transition: { duration: 0.24 } },
  sai: (dir: number) => ({ opacity: 0, x: dir * -24, transition: { duration: 0.12 } }),
};

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function proximaHoraCheia(): Date {
  const t = agoraSP();
  t.setMinutes(0, 0, 0);
  return addHours(t, 1);
}

function valoresIniciais(f: Formulario): { modo: ModoFormulario; inicial: ValoresIniciais } {
  if (f.modo === "criar") {
    const inicio = f.inicio ?? proximaHoraCheia();
    return { modo: "criar", inicial: { inicio, fim: f.diaInteiro ? addDays(inicio, 1) : addHours(inicio, 1), all_day: f.diaInteiro ?? false } };
  }
  const serie = f.escopo === "serie" && f.occ.mestre;
  const e: EventoRow = serie ? f.occ.mestre! : f.occ.evento;
  const modo: ModoFormulario = f.escopo === "esta" ? "editar-esta" : serie ? "editar-serie" : "editar-unico";
  return {
    modo,
    inicial: {
      title: e.title,
      category: e.category,
      inicio: serie ? new Date(e.start_at) : f.occ.inicio,
      fim: serie ? new Date(e.end_at) : f.occ.fim,
      all_day: e.all_day,
      location: e.location,
      link: e.link,
      description: e.description,
      freq: modo === "editar-serie" ? e.freq : null,
      until: modo === "editar-serie" ? e.until : null,
      publico: e.publico,
    },
  };
}

function mensagemErro(e: unknown): string {
  return e instanceof Error ? e.message : "Algo deu errado. Tente de novo.";
}

/**
 * `eu` decide o que aparece: diretoria e membros criam; a diretoria mexe em
 * tudo e o membro só no que criou (lib/niveis). A RLS (0007) garante o mesmo.
 */
export default function Agenda({ vistaInicial, ancoraInicial, eu }: { vistaInicial: Vista; ancoraInicial: string; eu: { id: string; nivel: Nivel } }) {
  const podeEditar = podeCriarEvento(eu.nivel);
  // Série: vale quem criou o mestre (o membro só cria ocorrências avulsas nas séries dele).
  const podeMexer = (o: Ocorrencia) => podeMexerNoEvento(eu, (o.mestre ?? o.evento).created_by);
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [ancora, setAncora] = useState(ancoraInicial);
  const [hoje] = useState(() => chaveDia(new Date()));
  const [filtros, setFiltros] = useState<Set<Categoria>>(() => new Set(TODAS_CATEGORIAS));
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<Ocorrencia | null>(null);
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [chaveForm, setChaveForm] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [pergunta, setPergunta] = useState<PerguntaSerie | null>(null);
  const [confirmacao, setConfirmacao] = useState<{ titulo: string; texto: string; rotulo: string; acao: () => Promise<void> } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);

  /* ── Filtros persistidos ───────────────────────────────────────────────── */
  useEffect(() => {
    try {
      const s = localStorage.getItem(CHAVE_FILTROS);
      if (s) {
        const lista = (JSON.parse(s) as string[]).filter((c): c is Categoria => (TODAS_CATEGORIAS as string[]).includes(c));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFiltros(new Set(lista));
      }
    } catch {
      /* sem localStorage: fica tudo ligado */
    }
  }, []);

  const alternarFiltro = useCallback((c: Categoria) => {
    setFiltros((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      try {
        localStorage.setItem(CHAVE_FILTROS, JSON.stringify([...n]));
      } catch {
        /* ignora */
      }
      return n;
    });
  }, []);

  /* ── URL espelha vista + âncora, sem ida ao servidor ───────────────────── */
  useEffect(() => {
    const url = montarUrl(vista, ancora);
    if (`${window.location.pathname}${window.location.search}` !== url) window.history.replaceState(window.history.state, "", url);
  }, [vista, ancora]);

  /* ── Intervalo visível e dados ─────────────────────────────────────────── */
  const dataAncora = useMemo(() => deChaveDia(ancora), [ancora]);
  const intervalo = useMemo(() => {
    if (vista === "mes") {
      const grade = gradeDoMes(dataAncora);
      return { ini: addDays(grade[0], -7), fim: addDays(grade[41], 8) };
    }
    if (vista === "semana") {
      const ini = inicioDaSemana(dataAncora);
      return { ini: addDays(ini, -7), fim: addDays(ini, 14) };
    }
    const ini = inicioDoDia(new Date());
    return { ini, fim: addDays(ini, 60) };
  }, [vista, dataAncora]);

  const { linhas, carregando, erro, recarregar, sb } = useEventos(intervalo.ini, intervalo.fim);
  const membros = useMembros();

  const ocorrencias = useMemo(() => {
    const todas = expandir(linhas, intervalo.ini, intervalo.fim);
    const q = normalizar(busca.trim());
    return todas.filter(
      (o) => filtros.has(o.evento.category) && (!q || normalizar(o.evento.title).includes(q) || normalizar(o.evento.location).includes(q)),
    );
  }, [linhas, intervalo, filtros, busca]);

  // Depois de uma gravação, a ocorrência aberta no painel troca pela versão nova.
  useEffect(() => {
    if (!selecionada) return;
    const nova = ocorrencias.find((o) => o.chave === selecionada.chave);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (nova && nova !== selecionada) setSelecionada(nova);
  }, [ocorrencias, selecionada]);

  /* ── Navegação ─────────────────────────────────────────────────────────── */
  // Sentido da última navegação, para o calendário deslizar do lado certo (0 = só esmaece).
  const [direcao, setDirecao] = useState(0);
  const navegar = useCallback(
    (delta: number) => {
      setDirecao(delta);
      if (vista === "mes") setAncora(chaveDia(addMonths(inicioDoMes(dataAncora), delta)));
      else if (vista === "semana") setAncora(chaveDia(addWeeks(inicioDaSemana(dataAncora), delta)));
    },
    [vista, dataAncora],
  );
  // Deslizar para os lados troca o mês (só no Mês: a Semana já rola de lado no celular).
  const toque = useRef<{ x: number; y: number } | null>(null);
  function comecarToque(e: TouchEvent) {
    const t = e.touches[0];
    toque.current = vista === "mes" && t ? { x: t.clientX, y: t.clientY } : null;
  }
  function terminarToque(e: TouchEvent) {
    const inicio = toque.current;
    const t = e.changedTouches[0];
    toque.current = null;
    if (!inicio || !t) return;
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    if (Math.abs(dx) >= DESLIZE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) navegar(dx < 0 ? 1 : -1);
  }

  const irHoje = useCallback(() => {
    setDirecao(0);
    setAncora(chaveDia(new Date()));
  }, []);

  const abrirCriar = useCallback((inicio?: Date, diaInteiro?: boolean) => {
    setSelecionada(null);
    setChaveForm((k) => k + 1);
    setFormulario({ modo: "criar", inicio, diaInteiro });
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && (["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName) || alvo.isContentEditable)) return;
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "ArrowLeft") navegar(-1);
      else if (e.key === "ArrowRight") navegar(1);
      else if (e.key === "t" || e.key === "T") irHoje();
      else if (podeEditar && (e.key === "n" || e.key === "N")) abrirCriar();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [navegar, irHoje, abrirCriar, podeEditar]);

  // Muda só quando o período visível muda (não ao tocar num dia do mesmo mês/semana).
  const chavePeriodo = vista === "mes" ? `mes-${chaveDia(inicioDoMes(dataAncora))}` : vista === "semana" ? `semana-${chaveDia(inicioDaSemana(dataAncora))}` : "proximos";
  const titulo = vista === "mes" ? tituloMes(dataAncora) : vista === "semana" ? tituloSemana(inicioDaSemana(dataAncora)) : "Próximos 60 dias";

  /* ── Ações ─────────────────────────────────────────────────────────────── */
  function pedirEditar(occ: Ocorrencia) {
    if (occ.mestre) return setPergunta({ acao: "editar", occ });
    abrirEditar(occ, occ.evento.series_id ? "esta" : "serie");
  }

  function abrirEditar(occ: Ocorrencia, escopo: Escopo) {
    setPergunta(null);
    setChaveForm((k) => k + 1);
    setFormulario({ modo: "editar", occ, escopo });
  }

  function pedirExcluir(occ: Ocorrencia) {
    if (occ.mestre) return setPergunta({ acao: "excluir", occ });
    if (occ.evento.series_id) return void excluir(occ, "esta");
    setConfirmacao({
      titulo: "Excluir evento",
      texto: `"${occ.evento.title}" será removido da agenda de todos.`,
      rotulo: "Excluir",
      acao: () => excluir(occ, "unico"),
    });
  }

  async function excluir(occ: Ocorrencia, escopo: Escopo | "unico") {
    try {
      if (escopo === "unico") await excluirEvento(sb, occ.evento.id);
      else if (escopo === "esta") await cancelarOcorrencia(sb, occ);
      else await excluirEvento(sb, occ.mestre!.id);
      setSelecionada(null);
      setPergunta(null);
      setConfirmacao(null);
      recarregar();
      setAviso(escopo === "esta" ? "Ocorrência removida." : escopo === "serie" ? "Série excluída." : "Evento excluído.");
    } catch (e) {
      setAviso(mensagemErro(e));
    }
  }

  async function salvar(dados: DadosEvento) {
    if (!formulario) return;
    const f = formulario;
    const executar = async () => {
      setSalvando(true);
      try {
        if (f.modo === "criar") await criarEvento(sb, dados);
        else if (f.escopo === "esta") await salvarOcorrencia(sb, f.occ, dados);
        else if (f.occ.mestre) await atualizarSerie(sb, f.occ.mestre, dados);
        else await atualizarEvento(sb, f.occ.evento.id, dados);
        setFormulario(null);
        setConfirmacao(null);
        setSelecionada(null);
        recarregar();
        setAviso(f.modo === "criar" ? "Evento criado." : "Alterações salvas.");
      } catch (e) {
        setAviso(mensagemErro(e));
      } finally {
        setSalvando(false);
      }
    };

    // Editar a série mudando horário/repetição apaga as filhas: avisa antes.
    if (f.modo === "editar" && f.escopo === "serie" && f.occ.mestre && vaiDescartarFilhas(f.occ.mestre, dados)) {
      const temFilhas = linhas.some((l) => l.series_id === f.occ.mestre!.id);
      if (temFilhas) {
        setConfirmacao({
          titulo: "Descartar edições individuais?",
          texto: "Você mudou o horário ou a repetição da série. As ocorrências editadas ou removidas individualmente voltam ao padrão da série.",
          rotulo: "Salvar mesmo assim",
          acao: executar,
        });
        return;
      }
    }
    await executar();
  }

  const form = formulario ? valoresIniciais(formulario) : null;

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoAgenda
        vista={vista}
        titulo={titulo}
        busca={busca}
        carregando={carregando}
        aoMudarVista={setVista}
        aoAnterior={() => navegar(-1)}
        aoProximo={() => navegar(1)}
        aoHoje={irHoje}
        aoBuscar={setBusca}
        aoNovo={podeEditar ? () => abrirCriar() : undefined}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FiltroCategorias ativas={filtros} aoAlternar={alternarFiltro} />
        <p className="hidden text-[0.75rem] text-ia-meta lg:block">← → navegam · T hoje{podeEditar && " · N novo"}</p>
      </div>

      {erro && (
        <p role="alert" className="rounded-lg bg-perigo-fundo px-3 py-2 text-[0.875rem] text-perigo">
          Não foi possível carregar os eventos: {erro}
        </p>
      )}

      <AnimatePresence mode="wait" initial={false} custom={direcao}>
        <motion.div
          key={chavePeriodo}
          custom={direcao}
          variants={TRANSICAO_PERIODO}
          initial="entra"
          animate="parado"
          exit="sai"
          className="flex min-w-0 flex-col"
          onTouchStart={comecarToque}
          onTouchEnd={terminarToque}
        >
          {vista === "mes" && <VistaMes ancora={dataAncora} ocorrencias={ocorrencias} hoje={hoje} aoSelecionar={setSelecionada} aoCriarEm={podeEditar ? (dia) => abrirCriar(setHours(dia, 9)) : undefined} />}
          {vista === "semana" && <VistaSemana ancora={dataAncora} ocorrencias={ocorrencias} hoje={hoje} aoSelecionar={setSelecionada} aoCriarEm={podeEditar ? (inicio) => abrirCriar(inicio) : undefined} />}
          {vista === "proximos" && <VistaProximos ocorrencias={ocorrencias} carregando={carregando} aoSelecionar={setSelecionada} />}
        </motion.div>
      </AnimatePresence>

      <PainelEvento
        occ={selecionada}
        membros={membros}
        aoFechar={() => setSelecionada(null)}
        aoEditar={selecionada && podeMexer(selecionada) ? pedirEditar : undefined}
        aoExcluir={selecionada && podeMexer(selecionada) ? pedirExcluir : undefined}
      />

      {form && (
        <FormularioEvento
          key={chaveForm}
          aberto={formulario !== null}
          modo={form.modo}
          inicial={form.inicial}
          salvando={salvando}
          aoSalvar={salvar}
          aoFechar={() => !salvando && setFormulario(null)}
          travarMembros={eu.nivel === "membro"}
        />
      )}

      <DialogoSerie
        pergunta={pergunta}
        aoFechar={() => setPergunta(null)}
        aoEscolher={(escopo) => {
          if (!pergunta) return;
          if (pergunta.acao === "editar") abrirEditar(pergunta.occ, escopo);
          else void excluir(pergunta.occ, escopo);
        }}
      />

      <Dialogo
        aberto={confirmacao !== null}
        aoFechar={() => setConfirmacao(null)}
        titulo={confirmacao?.titulo}
        rodape={
          confirmacao && (
            <>
              <Botao variante="fantasma" onClick={() => setConfirmacao(null)}>
                Cancelar
              </Botao>
              <Botao variante={confirmacao.rotulo.startsWith("Excluir") ? "perigo" : "primario"} onClick={() => void confirmacao.acao()}>
                {confirmacao.rotulo}
              </Botao>
            </>
          )
        }
      >
        <p className="t-apoio">{confirmacao?.texto}</p>
      </Dialogo>

      {podeEditar && <BotaoFlutuante aoClicar={() => abrirCriar()} rotulo="Novo evento" />}
      <Aviso mensagem={aviso} aoFechar={fecharAviso} />
    </div>
  );
}
