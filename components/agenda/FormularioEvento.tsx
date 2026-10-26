"use client";

import { addDays } from "date-fns";
import { useState, type CSSProperties, type FormEvent } from "react";
import Alternador from "@/components/ui/Alternador";
import Botao from "@/components/ui/Botao";
import Campo from "@/components/ui/Campo";
import Dialogo from "@/components/ui/Dialogo";
import { IcoChecar } from "@/components/ui/Icones";
import { CATEGORIAS } from "@/lib/categorias";
import type { DadosEvento } from "@/lib/eventos";
import { fimDoSemestre } from "@/lib/datas";
import { deChaveDia, deInputDataHora, paraInputData, paraInputDataHora, sp } from "@/lib/fuso";
import { alternarPublico, NIVEIS_PUBLICO } from "@/lib/niveis";
import type { Categoria, Frequencia, NivelPublico } from "@/lib/supabase/tipos";
import CampoRecorrencia, { type FreqOuNunca } from "./CampoRecorrencia";

export type ModoFormulario = "criar" | "editar-unico" | "editar-esta" | "editar-serie";

export type ValoresIniciais = {
  title?: string;
  category?: Categoria;
  inicio: Date;
  fim: Date;
  all_day?: boolean;
  location?: string;
  link?: string;
  description?: string;
  freq?: Frequencia | null;
  until?: string | null;
  publico?: NivelPublico[];
};

const TITULOS: Record<ModoFormulario, string> = {
  criar: "Novo evento",
  "editar-unico": "Editar evento",
  "editar-esta": "Editar esta ocorrência",
  "editar-serie": "Editar a série",
};

/**
 * Criar/editar. O componente é montado com `key` nova a cada abertura, então
 * o estado interno nasce de `inicial` e não precisa de sincronização.
 */
export default function FormularioEvento({
  aberto,
  modo,
  inicial,
  salvando,
  aoSalvar,
  aoFechar,
}: {
  aberto: boolean;
  modo: ModoFormulario;
  inicial: ValoresIniciais;
  salvando: boolean;
  aoSalvar: (dados: DadosEvento) => void;
  aoFechar: () => void;
}) {
  const [title, setTitle] = useState(inicial.title ?? "");
  const [category, setCategory] = useState<Categoria>(inicial.category ?? "evento");
  const [diaInteiro, setDiaInteiro] = useState(inicial.all_day ?? false);
  const [inicioStr, setInicioStr] = useState(() => (inicial.all_day ? paraInputData(inicial.inicio) : paraInputDataHora(inicial.inicio)));
  const [fimStr, setFimStr] = useState(() => (inicial.all_day ? paraInputData(addDays(sp(inicial.fim), -1)) : paraInputDataHora(inicial.fim)));
  const [location, setLocation] = useState(inicial.location ?? "");
  const [link, setLink] = useState(inicial.link ?? "");
  const [description, setDescription] = useState(inicial.description ?? "");
  const [freq, setFreq] = useState<FreqOuNunca>(inicial.freq ?? "nunca");
  const [until, setUntil] = useState(inicial.until ?? fimDoSemestre(inicial.inicio));
  const [publico, setPublico] = useState<NivelPublico[]>(inicial.publico ?? []);
  const [erro, setErro] = useState<string | null>(null);

  const mostraRecorrencia = modo !== "editar-esta";

  function mudarInicio(v: string) {
    if (diaInteiro) {
      setInicioStr(v);
      if (fimStr < v) setFimStr(v);
      return;
    }
    const antes = deInputDataHora(inicioStr).getTime();
    const duracao = deInputDataHora(fimStr).getTime() - antes;
    const novo = deInputDataHora(v).getTime();
    setInicioStr(v);
    if (!Number.isNaN(novo) && !Number.isNaN(duracao) && duracao > 0) setFimStr(paraInputDataHora(new Date(novo + duracao)));
  }

  function alternarDiaInteiro(v: boolean) {
    setDiaInteiro(v);
    if (v) {
      setInicioStr(inicioStr.slice(0, 10));
      setFimStr(fimStr.slice(0, 10));
    } else {
      setInicioStr(`${inicioStr.slice(0, 10)}T09:00`);
      setFimStr(`${(fimStr || inicioStr).slice(0, 10)}T10:00`);
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const titulo = title.trim();
    if (!titulo) return setErro("Dê um título ao evento.");

    let inicio: Date;
    let fim: Date;
    if (diaInteiro) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(inicioStr) || !/^\d{4}-\d{2}-\d{2}$/.test(fimStr)) return setErro("Informe o primeiro e o último dia.");
      inicio = deChaveDia(inicioStr);
      fim = addDays(deChaveDia(fimStr), 1); // exclusivo
      if (fim.getTime() <= inicio.getTime()) return setErro("O último dia não pode ser antes do primeiro.");
    } else {
      inicio = deInputDataHora(inicioStr);
      fim = deInputDataHora(fimStr);
      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return setErro("Informe início e fim.");
      if (fim.getTime() <= inicio.getTime()) return setErro("O fim precisa ser depois do início.");
    }

    const linkLimpo = link.trim();
    if (linkLimpo && !/^https?:\/\//i.test(linkLimpo)) return setErro("O link precisa começar com http:// ou https://.");

    const repete = mostraRecorrencia && freq !== "nunca";
    if (repete && (!/^\d{4}-\d{2}-\d{2}$/.test(until) || until < inicioStr.slice(0, 10))) return setErro("A data final da repetição precisa ser depois do início.");

    setErro(null);
    aoSalvar({
      title: titulo,
      category,
      start_at: inicio.toISOString(),
      end_at: fim.toISOString(),
      all_day: diaInteiro,
      location: location.trim(),
      link: linkLimpo,
      description: description.trim(),
      freq: repete ? (freq as Frequencia) : null,
      until: repete ? until : null,
      publico,
    });
  }

  const idForm = "form-evento";

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={TITULOS[modo]}
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao variante="primario" type="submit" form={idForm} disabled={salvando}>
            {salvando ? "Salvando…" : modo === "criar" ? "Criar evento" : "Salvar"}
          </Botao>
        </>
      }
    >
      <form id={idForm} onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <Campo id="ev-title" rotulo="Título">
          <input id="ev-title" className="campo" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus placeholder="Reunião geral" />
        </Campo>

        <div className="flex flex-col gap-1.5">
          <span className="text-[0.8125rem] text-ia-apoio">Categoria</span>
          <div role="radiogroup" aria-label="Categoria" className="flex flex-wrap gap-1.5">
            {CATEGORIAS.map((c) => {
              const on = c.id === category;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setCategory(c.id)}
                  style={{ "--cor": `var(${c.varCss})` } as CSSProperties}
                  className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[0.875rem] transition-colors ${
                    on ? "border-ia-petroleo bg-ia-petroleo text-ia-papel" : "border-ia-regua text-ia-corpo hover:bg-ia-nevoa"
                  }`}
                >
                  <span className="ponto-cat" />
                  {c.singular}
                </button>
              );
            })}
          </div>
        </div>

        {/* Uma ocorrência isolada segue o público da série. */}
        {modo !== "editar-esta" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.8125rem] text-ia-apoio">Quem vê</span>
            <div role="group" aria-label="Quem vê" className="flex flex-wrap gap-1.5">
              <span className="inline-flex h-9 items-center gap-2 rounded-full border border-ia-regua bg-ia-nevoa px-3.5 text-[0.875rem] text-ia-apoio" title="A diretoria sempre vê">
                <IcoChecar width={14} height={14} /> Diretoria
              </span>
              {NIVEIS_PUBLICO.map((n) => {
                const on = publico.includes(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => setPublico((p) => alternarPublico(p, n.id))}
                    className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[0.875rem] transition-colors ${
                      on ? "border-ia-petroleo bg-ia-petroleo text-ia-papel" : "border-ia-regua text-ia-corpo hover:bg-ia-nevoa"
                    }`}
                  >
                    {on && <IcoChecar width={14} height={14} />}
                    {n.plural}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-ia-regua px-3 py-2.5">
          <label htmlFor="ev-dia-inteiro" className="text-[0.9rem] text-ia-corpo">
            Dia inteiro
          </label>
          <Alternador id="ev-dia-inteiro" ligado={diaInteiro} aoMudar={alternarDiaInteiro} rotulo="Dia inteiro" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="ev-inicio" rotulo={diaInteiro ? "Primeiro dia" : modo === "editar-serie" ? "Início (primeira ocorrência)" : "Início"}>
            <input id="ev-inicio" type={diaInteiro ? "date" : "datetime-local"} className="campo" value={inicioStr} onChange={(e) => mudarInicio(e.target.value)} required />
          </Campo>
          <Campo id="ev-fim" rotulo={diaInteiro ? "Último dia" : "Fim"}>
            <input id="ev-fim" type={diaInteiro ? "date" : "datetime-local"} className="campo" value={fimStr} min={diaInteiro ? inicioStr : undefined} onChange={(e) => setFimStr(e.target.value)} required />
          </Campo>
        </div>

        {mostraRecorrencia && (
          <>
            <CampoRecorrencia
              freq={freq}
              until={until}
              minimo={inicioStr.slice(0, 10)}
              aoMudar={(f, u) => {
                setFreq(f);
                setUntil(u);
              }}
            />
            {modo === "editar-serie" && (
              <p className="rounded-lg bg-ia-nevoa px-3 py-2 text-[0.8125rem] text-ia-apoio">
                Mudar horário, dia inteiro ou repetição descarta as edições feitas em ocorrências individuais desta série.
              </p>
            )}
          </>
        )}

        <Campo id="ev-local" rotulo="Local" opcional>
          <input id="ev-local" className="campo" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Sala 404 · Insper" />
        </Campo>
        <Campo id="ev-link" rotulo="Link" opcional dica="Reunião online, inscrição, documento…">
          <input id="ev-link" type="url" className="campo" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" inputMode="url" />
        </Campo>
        <Campo id="ev-descricao" rotulo="Descrição" opcional>
          <textarea id="ev-descricao" className="campo" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Campo>

        {erro && (
          <p role="alert" className="rounded-lg bg-perigo-fundo px-3 py-2 text-[0.875rem] text-perigo">
            {erro}
          </p>
        )}
      </form>
    </Dialogo>
  );
}
