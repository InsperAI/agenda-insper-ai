"use client";

import type { CSSProperties, ReactNode } from "react";
import Botao from "@/components/ui/Botao";
import Dialogo from "@/components/ui/Dialogo";
import { IcoBaixar, IcoCalendario, IcoLapis, IcoLink, IcoLixeira, IcoLocal, IcoPessoa, IcoRepetir } from "@/components/ui/Icones";
import { CATEGORIA, FREQUENCIA } from "@/lib/categorias";
import { dataComAno, dataHoraCurta, linhaQuando } from "@/lib/datas";
import { deChaveDia } from "@/lib/fuso";
import { serializarOcorrencia } from "@/lib/ics";
import { FRASE_VISIBILIDADE } from "@/lib/niveis";
import { ehDeSerie, type Ocorrencia } from "@/lib/recorrencia";
import type { MembroRow } from "@/lib/supabase/tipos";

function Linha({ icone, children }: { icone: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-[3px] shrink-0 text-ia-meta">{icone}</span>
      <span className="min-w-0 text-ia-corpo">{children}</span>
    </div>
  );
}

function descricaoSerie(occ: Ocorrencia): string {
  const m = occ.mestre;
  if (!m?.freq || !m.until) return "Faz parte de uma série; esta ocorrência foi editada individualmente.";
  const base = `Repete ${FREQUENCIA[m.freq].frase} até ${dataComAno(deChaveDia(m.until))}`;
  return occ.virtual ? base : `${base} · esta ocorrência foi editada individualmente`;
}

function baixarIcs(occ: Ocorrencia) {
  const blob = new Blob([serializarOcorrencia(occ)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${occ.evento.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase() || "evento"}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Folha lateral com os detalhes de uma ocorrência e as ações. */
export default function PainelEvento({
  occ,
  membros,
  aoFechar,
  aoEditar,
  aoExcluir,
}: {
  occ: Ocorrencia | null;
  membros: Map<string, MembroRow>;
  aoFechar: () => void;
  /** Ausentes = só leitura (membro/trainee). */
  aoEditar?: (o: Ocorrencia) => void;
  aoExcluir?: (o: Ocorrencia) => void;
}) {
  const cat = occ ? CATEGORIA[occ.evento.category] : null;
  const nome = (id: string | null) => (id && membros.get(id)?.name) || "alguém";

  let auditoria = "";
  if (occ) {
    const e = occ.evento;
    auditoria = `Criado por ${nome(e.created_by)} em ${dataHoraCurta(new Date(e.created_at))}`;
    if (Date.parse(e.updated_at) - Date.parse(e.created_at) > 60_000) {
      auditoria += ` · editado por ${nome(e.updated_by)} em ${dataHoraCurta(new Date(e.updated_at))}`;
    }
  }

  return (
    <Dialogo
      aberto={occ !== null}
      aoFechar={aoFechar}
      variante="folha"
      titulo={
        cat ? (
          <span className="flex items-center gap-2 text-[0.9rem] font-sans font-normal text-ia-apoio">
            <span className="ponto-cat" style={{ "--cor": `var(${cat.varCss})` } as CSSProperties} />
            {cat.singular}
          </span>
        ) : undefined
      }
      rodape={
        occ && (
          <>
            <Botao variante="fantasma" tamanho="sm" onClick={() => baixarIcs(occ)} className="mr-auto">
              <IcoBaixar /> .ics
            </Botao>
            {aoExcluir && (
              <Botao variante="perigo" tamanho="sm" onClick={() => aoExcluir(occ)}>
                <IcoLixeira /> Excluir
              </Botao>
            )}
            {aoEditar && (
              <Botao variante="primario" tamanho="sm" onClick={() => aoEditar(occ)}>
                <IcoLapis /> Editar
              </Botao>
            )}
          </>
        )
      }
    >
      {occ && (
        <>
          <h3 className="t-h3">{occ.evento.title}</h3>
          <div className="mt-5 flex flex-col gap-3 text-[0.9375rem]">
            <Linha icone={<IcoCalendario />}>{linhaQuando(occ.inicio, occ.fim, occ.evento.all_day)}</Linha>
            {ehDeSerie(occ) && <Linha icone={<IcoRepetir />}>{descricaoSerie(occ)}</Linha>}
            {occ.evento.location && <Linha icone={<IcoLocal />}>{occ.evento.location}</Linha>}
            <Linha icone={<IcoPessoa />}>Visível para {FRASE_VISIBILIDADE[occ.evento.visibilidade]}</Linha>
            {occ.evento.link && (
              <Linha icone={<IcoLink />}>
                <a href={occ.evento.link} target="_blank" rel="noreferrer" className="break-all text-ia-cobalto underline decoration-1 underline-offset-4 hover:text-ia-petroleo">
                  {occ.evento.link.replace(/^https?:\/\//, "")}
                </a>
              </Linha>
            )}
          </div>
          {occ.evento.description && <p className="t-corpo mt-5 whitespace-pre-wrap">{occ.evento.description}</p>}
          <div className="regua my-5" />
          <p className="text-[0.8125rem] text-ia-meta">{auditoria}</p>
        </>
      )}
    </Dialogo>
  );
}
