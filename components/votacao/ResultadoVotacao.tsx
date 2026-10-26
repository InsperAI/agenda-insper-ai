"use client";

import { addDays } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Botao from "@/components/ui/Botao";
import Campo from "@/components/ui/Campo";
import Dialogo from "@/components/ui/Dialogo";
import { IcoChecar } from "@/components/ui/Icones";
import { agoraSP, deInputDataHora, paraInputDataHora } from "@/lib/fuso";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { RespostaRow, VotacaoRow } from "@/lib/supabase/tipos";
import { melhoresHorarios, rotuloBloco, rotuloDia, rotuloDuracao, traduzirErroVotacao, type Faixa } from "@/lib/votacao";
import DialogoConfirmar, { type Confirmacao } from "./DialogoConfirmar";

type Pessoa = { id: string; name: string };

/** Painel de quem abriu: quem respondeu, melhores horários, confirmar, reabrir, excluir. */
export default function ResultadoVotacao({
  votacao,
  respostas,
  convidados,
  aoAvisar,
}: {
  votacao: VotacaoRow;
  respostas: RespostaRow[];
  convidados: Pessoa[];
  aoAvisar: (msg: string) => void;
}) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const router = useRouter();
  const [escolhida, setEscolhida] = useState<Faixa | null>(null);
  const [reabrindo, setReabrindo] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const nomes = useMemo(() => new Map(convidados.map((p) => [p.id, p.name])), [convidados]);
  const responderam = new Set(respostas.map((r) => r.member_id));
  const { todosPodem, faixas } = useMemo(
    () => melhoresHorarios({ dias: votacao.dias, duracaoMin: votacao.duracao_min, respostas }),
    [votacao.dias, votacao.duracao_min, respostas],
  );
  const confirmada = votacao.confirmada_em !== null;

  async function confirmar(c: Confirmacao) {
    setOcupado(true);
    const { error } = await sb.rpc("confirmar_votacao", { p_id: votacao.id, p_inicio: c.inicio.toISOString(), p_freq: c.freq, p_until: c.until });
    setOcupado(false);
    if (error) return aoAvisar(traduzirErroVotacao(error.message));
    setEscolhida(null);
    aoAvisar("Confirmado! O evento já está na agenda dos convidados.");
    router.refresh();
  }

  async function excluir() {
    setOcupado(true);
    const { error } = await sb.from("votacoes").delete().eq("id", votacao.id);
    setOcupado(false);
    if (error) return aoAvisar(traduzirErroVotacao(error.message));
    router.push("/disponibilidade");
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-ia-regua p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display font-semibold text-ia-petroleo">Resultado</h2>
        <p className="text-[0.8125rem] text-ia-apoio">
          {responderam.size} de {convidados.length} responderam
        </p>
      </div>

      <ul className="flex flex-wrap gap-1.5">
        {convidados.map((p) => (
          <li
            key={p.id}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.8125rem] ${responderam.has(p.id) ? "bg-ia-nevoa text-ia-petroleo" : "border border-dashed border-ia-regua text-ia-meta"}`}
          >
            {responderam.has(p.id) && <IcoChecar width={13} height={13} />}
            {p.name}
          </li>
        ))}
      </ul>

      {!confirmada &&
        (faixas.length === 0 ? (
          <p className="t-apoio">Ainda não há um horário em que caiba uma reunião de {rotuloDuracao(votacao.duracao_min)}.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[0.875rem] text-ia-corpo">
              {todosPodem
                ? faixas.length === 1
                  ? "Só há um horário em que todos que responderam podem:"
                  : "Horários em que todos que responderam podem:"
                : "Nenhum horário serve para todos. Onde mais gente pode:"}
            </p>
            <ul className="flex flex-col divide-y divide-ia-regua rounded-lg border border-ia-regua">
              {faixas.map((f) => (
                <li key={`${f.dia}-${f.inicio}`} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.95rem] text-ia-petroleo">
                      {rotuloDia(votacao.modo, f.dia)} · {rotuloBloco(f.inicio)}–{rotuloBloco(f.fim)}
                    </p>
                    {f.naoPodem.length > 0 && (
                      <p className="text-[0.8125rem] text-ia-apoio">Não podem: {f.naoPodem.map((id) => nomes.get(id) ?? "alguém").join(", ")}</p>
                    )}
                  </div>
                  <Botao variante="primario" tamanho="sm" onClick={() => setEscolhida(f)}>
                    Confirmar
                  </Botao>
                </li>
              ))}
            </ul>
          </div>
        ))}

      <div className="flex flex-wrap justify-end gap-2">
        <Botao variante="fantasma" tamanho="sm" onClick={() => setExcluindo(true)}>
          Excluir pedido
        </Botao>
        {!confirmada && (
          <Botao tamanho="sm" onClick={() => setReabrindo(true)}>
            Reabrir / estender prazo
          </Botao>
        )}
      </div>

      {escolhida && (
        <DialogoConfirmar faixa={escolhida} modo={votacao.modo} duracaoMin={votacao.duracao_min} salvando={ocupado} aoFechar={() => setEscolhida(null)} aoConfirmar={confirmar} />
      )}
      {reabrindo && <DialogoReabrir votacaoId={votacao.id} aoFechar={() => setReabrindo(false)} aoAvisar={aoAvisar} />}
      <Dialogo
        aberto={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo="Excluir pedido"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setExcluindo(false)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" onClick={excluir} disabled={ocupado}>
              Excluir
            </Botao>
          </>
        }
      >
        <p className="t-apoio">As respostas somem. {confirmada && "O evento já criado continua na agenda."}</p>
      </Dialogo>
    </section>
  );
}

const TRES_DIAS = 3;

function DialogoReabrir({ votacaoId, aoFechar, aoAvisar }: { votacaoId: string; aoFechar: () => void; aoAvisar: (m: string) => void }) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const router = useRouter();
  const [prazo, setPrazo] = useState(() => paraInputDataHora(addDays(agoraSP(), TRES_DIAS)));
  const [ocupado, setOcupado] = useState(false);

  async function reabrir() {
    setOcupado(true);
    const { error } = await sb.rpc("reabrir_votacao", { p_id: votacaoId, p_prazo: deInputDataHora(prazo).toISOString(), p_dias: null });
    setOcupado(false);
    if (error) return aoAvisar(traduzirErroVotacao(error.message));
    aoFechar();
    aoAvisar("Pedido reaberto. Mande o link de novo no grupo.");
    router.refresh();
  }

  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo="Reabrir pedido"
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao variante="primario" onClick={reabrir} disabled={ocupado}>
            Reabrir
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="t-apoio">As respostas já dadas continuam valendo; quem ainda não respondeu ganha mais tempo.</p>
        <Campo id="r-prazo" rotulo="Novo prazo">
          <input id="r-prazo" type="datetime-local" className="campo" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </Campo>
      </div>
    </Dialogo>
  );
}
