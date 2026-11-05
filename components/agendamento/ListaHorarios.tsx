"use client";

import Botao from "@/components/ui/Botao";
import { porDia, type GrupoVisao, type HorarioVisao } from "@/lib/agendamento";
import { dataCurta, diaSemana, hora } from "@/lib/datas";
import { deChaveDia } from "@/lib/fuso";
import type { useAcao } from "./useAcao";

type Acao = ReturnType<typeof useAcao>;

/**
 * Horários do dia a dia. Livre → "Reservar" (ou "Trocar para este") para quem
 * está num grupo; do meu grupo → destacado com "Soltar"; de outro → o nome.
 */
export default function ListaHorarios({ agId, aberto, horarios, meuGrupo, acao }: { agId: string; aberto: boolean; horarios: HorarioVisao[]; meuGrupo: GrupoVisao | null; acao: Acao }) {
  const dias = porDia(horarios.map((h) => ({ ...h, inicio: new Date(h.horario.inicio) })));
  const livres = horarios.filter((h) => !h.grupo && !h.passado).length;

  const reservar = (id: string | null, msg: string) => acao.executar((sb) => sb.rpc("reservar_horario", { p_ag: agId, p_horario: id }), msg);

  return (
    <section aria-labelledby="horarios" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="horarios" className="t-meta">
          Horários
        </h2>
        <p className="text-[0.8125rem] text-ia-meta tabular-nums">
          {livres} de {horarios.length} livres
        </p>
      </div>
      {dias.map((d) => (
        <div key={d.dia} className="flex flex-col gap-1.5">
          <p className="text-[0.875rem] text-ia-apoio first-letter:uppercase">
            {diaSemana(deChaveDia(d.dia))}, {dataCurta(deChaveDia(d.dia))}
          </p>
          <ul className="divide-y divide-ia-regua overflow-hidden rounded-xl border border-ia-regua">
            {d.horarios.map(({ horario, grupo, passado }) => {
              const meu = !!meuGrupo && grupo?.id === meuGrupo.id;
              return (
                <li key={horario.id} className={`flex min-h-12 items-center gap-3 px-4 py-2 ${meu ? "bg-ia-cobalto/10" : ""} ${passado ? "opacity-60" : ""}`}>
                  <span className="w-[6.5rem] shrink-0 text-[0.95rem] text-ia-petroleo tabular-nums">
                    {hora(new Date(horario.inicio))}–{hora(new Date(horario.fim))}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-[0.875rem] ${grupo ? "text-ia-petroleo" : "text-ia-meta"}`}>
                    {meu ? (
                      <>
                        <strong className="font-semibold">{grupo!.nome}</strong>
                        <span className="sr-only"> (seu grupo)</span>
                      </>
                    ) : grupo ? (
                      grupo.nome
                    ) : passado ? (
                      "passou"
                    ) : (
                      "livre"
                    )}
                  </span>
                  {aberto && meuGrupo && !passado && (
                    <>
                      {meu && (
                        <Botao tamanho="sm" variante="fantasma" disabled={acao.ocupado} onClick={() => reservar(null, "Horário liberado.")}>
                          Soltar
                        </Botao>
                      )}
                      {!grupo && (
                        <Botao tamanho="sm" variante={meuGrupo.horario ? "fantasma" : "primario"} disabled={acao.ocupado} onClick={() => reservar(horario.id, meuGrupo.horario ? "Horário trocado." : "Horário reservado para o seu grupo.")}>
                          {meuGrupo.horario ? "Trocar" : "Reservar"}
                        </Botao>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
