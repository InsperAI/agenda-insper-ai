"use client";

import Dialogo from "@/components/ui/Dialogo";
import type { Ocorrencia } from "@/lib/recorrencia";

export type PerguntaSerie = { acao: "editar" | "excluir"; occ: Ocorrencia };
export type Escopo = "esta" | "serie";

const OPCAO = "flex w-full flex-col items-start gap-0.5 rounded-xl border border-ia-regua px-4 py-3 text-left transition-colors hover:border-ia-cobalto hover:bg-ia-nevoa";

/** "Somente esta ocorrência" ou "Toda a série", para editar ou excluir. */
export default function DialogoSerie({ pergunta, aoEscolher, aoFechar }: { pergunta: PerguntaSerie | null; aoEscolher: (e: Escopo) => void; aoFechar: () => void }) {
  const editar = pergunta?.acao === "editar";
  return (
    <Dialogo aberto={pergunta !== null} aoFechar={aoFechar} titulo={editar ? "Editar evento recorrente" : "Excluir evento recorrente"}>
      <p className="t-apoio">Este evento se repete. O que você quer {editar ? "editar" : "excluir"}?</p>
      <div className="mt-5 flex flex-col gap-2">
        <button type="button" className={OPCAO} onClick={() => aoEscolher("esta")}>
          <span className="font-display font-semibold text-ia-petroleo">Somente esta ocorrência</span>
          <span className="text-[0.8125rem] text-ia-apoio">{editar ? "As outras datas continuam como estão." : "As outras datas continuam na agenda."}</span>
        </button>
        <button type="button" className={OPCAO} onClick={() => aoEscolher("serie")}>
          <span className="font-display font-semibold text-ia-petroleo">Toda a série</span>
          <span className="text-[0.8125rem] text-ia-apoio">
            {editar ? "Muda todas as ocorrências, passadas e futuras." : "Remove todas as ocorrências, passadas e futuras."}
          </span>
        </button>
      </div>
    </Dialogo>
  );
}
