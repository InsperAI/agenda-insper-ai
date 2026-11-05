"use client";

import { useState } from "react";
import Segmentado from "@/components/ui/Segmentado";
import type { Pessoa } from "./Convidados";
import FormNovaVotacao from "./FormNovaVotacao";
import FormNovoAgendamento from "./FormNovoAgendamento";

export type TipoPedido = "todos" | "grupos";

const TIPOS: { valor: TipoPedido; rotulo: string }[] = [
  { valor: "todos", rotulo: "Um horário para todos" },
  { valor: "grupos", rotulo: "Horários por grupo" },
];

const EXPLICACAO: Record<TipoPedido, string> = {
  todos: "Cada convidado marca quando pode; você (ou a diretoria) escolhe o melhor horário e ele entra na agenda de todos.",
  grupos: "Você cria os horários; os convidados formam grupos e cada grupo reserva um horário, sem dois grupos no mesmo. Bom para apresentações e entrevistas.",
};

/** Escolha do tipo de pedido + o formulário certo. O tipo fica na URL (?tipo=grupos) para dar link direto. */
export default function NovoPedido({ tipoInicial, pessoas, meuId }: { tipoInicial: TipoPedido; pessoas: Pessoa[]; meuId: string }) {
  const [tipo, setTipo] = useState<TipoPedido>(tipoInicial);

  function mudar(t: TipoPedido) {
    setTipo(t);
    window.history.replaceState(window.history.state, "", t === "grupos" ? "?tipo=grupos" : window.location.pathname);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Segmentado opcoes={TIPOS} valor={tipo} aoMudar={mudar} rotulo="Tipo de pedido" className="self-start" />
        <p className="text-pretty text-[0.8125rem] text-ia-meta">{EXPLICACAO[tipo]}</p>
      </div>
      {tipo === "grupos" ? <FormNovoAgendamento pessoas={pessoas} meuId={meuId} /> : <FormNovaVotacao pessoas={pessoas} meuId={meuId} />}
    </div>
  );
}
