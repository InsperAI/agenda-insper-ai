"use client";

import { useState, type FormEvent } from "react";
import Botao from "@/components/ui/Botao";
import Campo from "@/components/ui/Campo";
import Dialogo from "@/components/ui/Dialogo";
import { FREQUENCIAS } from "@/lib/categorias";
import { fimDoSemestre } from "@/lib/datas";
import { agoraSP, deChaveDia } from "@/lib/fuso";
import type { Frequencia, ModoVotacao } from "@/lib/supabase/tipos";
import { inicioDoHorario, MIN_BLOCO, proximaData, rotuloBloco, rotuloDia, rotuloDuracao, type Faixa } from "@/lib/votacao";

export type Confirmacao = { inicio: Date; freq: Frequencia | null; until: string | null };

/**
 * Escolhe o início dentro da faixa e, se o pedido é recorrente, a data da
 * primeira reunião, a frequência e até quando. Quem chama grava (confirmar_votacao).
 */
export default function DialogoConfirmar({
  faixa,
  modo,
  duracaoMin,
  salvando,
  aoFechar,
  aoConfirmar,
}: {
  faixa: Faixa;
  modo: ModoVotacao;
  duracaoMin: number;
  salvando: boolean;
  aoFechar: () => void;
  aoConfirmar: (c: Confirmacao) => void;
}) {
  const n = duracaoMin / MIN_BLOCO;
  const inicios = Array.from({ length: faixa.fim - n - faixa.inicio + 1 }, (_, i) => faixa.inicio + i);
  const hoje = agoraSP();
  const [bloco, setBloco] = useState(faixa.inicio);
  const [primeira, setPrimeira] = useState(() => (modo === "recorrente" ? proximaData(faixa.dia, hoje) : faixa.dia));
  const [freq, setFreq] = useState<Frequencia>("semanal");
  const [until, setUntil] = useState(() => fimDoSemestre(hoje));
  const [erro, setErro] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (modo === "recorrente") {
      const diaDaSemana = String(((deChaveDia(primeira).getDay() + 6) % 7) + 1);
      if (diaDaSemana !== faixa.dia) return setErro(`A primeira reunião precisa cair numa ${rotuloDia(modo, faixa.dia)}.`);
      if (until < primeira) return setErro("A data final precisa ser depois da primeira reunião.");
    }
    setErro(null);
    aoConfirmar({ inicio: inicioDoHorario(primeira, bloco), freq: modo === "recorrente" ? freq : null, until: modo === "recorrente" ? until : null });
  }

  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo="Confirmar horário"
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao variante="primario" type="submit" form="form-confirmar" disabled={salvando}>
            {salvando ? "Criando…" : "Confirmar e criar evento"}
          </Botao>
        </>
      }
    >
      <form id="form-confirmar" onSubmit={enviar} className="flex flex-col gap-4">
        <p className="t-apoio">
          {rotuloDia(modo, faixa.dia)} · reunião de {rotuloDuracao(duracaoMin)}. O evento aparece na agenda de todos
          os convidados.
        </p>
        <Campo id="c-inicio" rotulo="Começa às">
          <select id="c-inicio" className="campo" value={bloco} onChange={(e) => setBloco(Number(e.target.value))}>
            {inicios.map((b) => (
              <option key={b} value={b}>
                {rotuloBloco(b)} – {rotuloBloco(b + n)}
              </option>
            ))}
          </select>
        </Campo>

        {modo === "recorrente" && (
          <>
            <Campo id="c-primeira" rotulo="Primeira reunião em">
              <input id="c-primeira" type="date" className="campo" value={primeira} onChange={(e) => setPrimeira(e.target.value)} required />
            </Campo>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo id="c-freq" rotulo="Repete">
                <select id="c-freq" className="campo" value={freq} onChange={(e) => setFreq(e.target.value as Frequencia)}>
                  {FREQUENCIAS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.rotulo}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo id="c-until" rotulo="Até">
                <input id="c-until" type="date" className="campo" value={until} min={primeira} onChange={(e) => setUntil(e.target.value)} required />
              </Campo>
            </div>
          </>
        )}

        {erro && (
          <p role="alert" className="rounded-lg bg-perigo-fundo px-3 py-2 text-[0.875rem] text-perigo">
            {erro}
          </p>
        )}
      </form>
    </Dialogo>
  );
}
