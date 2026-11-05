"use client";

import { addDays } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Aviso from "@/components/ui/Aviso";
import Botao from "@/components/ui/Botao";
import Dialogo from "@/components/ui/Dialogo";
import { IcoCalendario, IcoCopiar } from "@/components/ui/Icones";
import { montarVisao, type DadosAgendamento } from "@/lib/agendamento";
import { dataHoraCurta } from "@/lib/datas";
import { agoraSP, deInputDataHora, paraInputDataHora } from "@/lib/fuso";
import Grupos from "./Grupos";
import ListaHorarios from "./ListaHorarios";
import SeuGrupo from "./SeuGrupo";
import { useAcao } from "./useAcao";

/** Enquanto está aberto, outras pessoas reservam: busca o estado novo de tempos em tempos. */
const ATUALIZAR_MS = 20_000;

export default function PaginaAgendamento({
  dados,
  meuId,
  souConvidado,
  podeDecidir,
  podeExcluir,
  pedidoPor,
}: {
  dados: DadosAgendamento;
  meuId: string;
  souConvidado: boolean;
  podeDecidir: boolean;
  podeExcluir: boolean;
  pedidoPor: string | null;
}) {
  const router = useRouter();
  const [aviso, setAviso] = useState<string | null>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);
  const acao = useAcao(setAviso);
  const [agora, setAgora] = useState(() => new Date().getTime());
  const v = montarVisao(dados, meuId, agora);
  const { ag } = dados;
  const confirmado = ag.confirmado_em !== null;
  const editavel = podeDecidir && !confirmado;

  useEffect(() => {
    if (confirmado) return;
    const tique = () => {
      if (document.visibilityState !== "visible") return;
      setAgora(new Date().getTime());
      router.refresh();
    };
    const id = setInterval(tique, ATUALIZAR_MS);
    document.addEventListener("visibilitychange", tique);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tique);
    };
  }, [confirmado, router]);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/disponibilidade/g/${ag.id}`);
      setAviso("Link copiado. Cole no grupo para todos formarem os grupos.");
    } catch {
      setAviso("Não deu para copiar; copie o endereço da barra do navegador.");
    }
  }

  const prazoPassou = Date.parse(ag.prazo) <= agora;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link href="/disponibilidade" className="self-start text-[0.8125rem] text-ia-apoio hover:text-ia-petroleo">
          ← Disponibilidade
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="t-h2 text-balance">{ag.titulo}</h1>
            {ag.descricao && <p className="t-apoio mt-2 max-w-prose whitespace-pre-line">{ag.descricao}</p>}
            <p className="mt-2 text-[0.875rem] text-ia-apoio">
              Horários por grupo
              {pedidoPor && ` · pedido por ${pedidoPor}`} · {confirmado ? "confirmado" : prazoPassou ? "prazo encerrado" : `escolha até ${dataHoraCurta(new Date(ag.prazo))}`}
            </p>
          </div>
          <Botao onClick={copiarLink}>
            <IcoCopiar /> Copiar link
          </Botao>
        </div>
        {confirmado && (
          <p className="inline-flex items-center gap-2 self-start rounded-lg bg-ia-nevoa px-3 py-2 text-[0.875rem] text-ia-petroleo">
            <IcoCalendario /> Confirmado: cada grupo já tem o evento na agenda.
            <Link href="/agenda" className="underline underline-offset-4">
              Ver agenda
            </Link>
          </p>
        )}
        {!confirmado && prazoPassou && !podeDecidir && <p className="rounded-lg bg-ia-nevoa px-3 py-2 text-[0.875rem] text-ia-apoio">O prazo acabou. Agora só quem organizou pode mudar algo.</p>}
      </header>

      {souConvidado && <SeuGrupo agId={ag.id} aberto={v.aberto} meuGrupo={v.meuGrupo} grupos={v.grupos} acao={acao} />}

      <ListaHorarios agId={ag.id} aberto={v.aberto} horarios={v.horarios} meuGrupo={v.meuGrupo} acao={acao} />

      <Grupos agId={ag.id} grupos={v.grupos} semGrupo={v.semGrupo} horarios={v.horarios} editavel={editavel} acao={acao} />

      {(editavel || podeExcluir) && (
        <AcoesOrganizador
          agId={ag.id}
          prazo={ag.prazo}
          editavel={editavel}
          podeExcluir={podeExcluir}
          comHorario={v.grupos.filter((g) => g.horario && g.pessoas.length).length}
          semHorario={v.grupos.filter((g) => !g.horario && g.pessoas.length).length}
          semGrupo={v.semGrupo.length}
          acao={acao}
        />
      )}

      <Aviso mensagem={aviso} aoFechar={fecharAviso} />
    </div>
  );
}

type Dialogos = "prazo" | "confirmar" | "excluir" | null;

function AcoesOrganizador({
  agId,
  prazo,
  editavel,
  podeExcluir,
  comHorario,
  semHorario,
  semGrupo,
  acao,
}: {
  agId: string;
  prazo: string;
  editavel: boolean;
  podeExcluir: boolean;
  comHorario: number;
  semHorario: number;
  semGrupo: number;
  acao: ReturnType<typeof useAcao>;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState<Dialogos>(null);
  const [novoPrazo, setNovoPrazo] = useState(() => paraInputDataHora(addDays(new Date(Math.max(Date.parse(prazo), agoraSP().getTime())), 1)));
  const fechar = () => setAberto(null);

  return (
    <section aria-label="Ações de quem organiza" className="flex flex-col gap-3 border-t border-ia-regua pt-5">
      <div className="flex flex-wrap justify-end gap-2">
        {podeExcluir && (
          <Botao variante="fantasma" tamanho="sm" onClick={() => setAberto("excluir")}>
            Excluir
          </Botao>
        )}
        {editavel && (
          <>
            <Botao tamanho="sm" onClick={() => setAberto("prazo")}>
              Estender prazo
            </Botao>
            <Botao variante="primario" tamanho="sm" disabled={comHorario === 0} onClick={() => setAberto("confirmar")}>
              Confirmar e pôr na agenda
            </Botao>
          </>
        )}
      </div>

      <Dialogo
        aberto={aberto === "confirmar"}
        aoFechar={fechar}
        titulo="Confirmar horários"
        rodape={
          <>
            <Botao variante="fantasma" onClick={fechar}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              disabled={acao.ocupado || semHorario > 0}
              onClick={async () => (await acao.executar((sb) => sb.rpc("confirmar_agendamento", { p_ag: agId }), "Confirmado! Cada grupo recebeu o evento na agenda.")) && fechar()}
            >
              Confirmar
            </Botao>
          </>
        }
      >
        <div className="flex flex-col gap-2 text-[0.9rem] text-ia-corpo">
          <p>
            {comHorario} {comHorario === 1 ? "grupo ganha" : "grupos ganham"} um evento na agenda, visível para os integrantes. Depois disso, ninguém mais muda grupos nem horários.
          </p>
          {semHorario > 0 && <p className="rounded-lg bg-perigo-fundo px-3 py-2 text-perigo">{semHorario === 1 ? "Um grupo está" : `${semHorario} grupos estão`} sem horário. Defina um horário ou exclua antes de confirmar.</p>}
          {semGrupo > 0 && semHorario === 0 && <p className="text-ia-apoio">{semGrupo === 1 ? "Uma pessoa convidada ficou" : `${semGrupo} pessoas convidadas ficaram`} sem grupo e não recebe evento.</p>}
        </div>
      </Dialogo>

      <Dialogo
        aberto={aberto === "prazo"}
        aoFechar={fechar}
        titulo="Estender prazo"
        rodape={
          <>
            <Botao variante="fantasma" onClick={fechar}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              disabled={acao.ocupado}
              onClick={async () => (await acao.executar((sb) => sb.rpc("org_estender_prazo", { p_ag: agId, p_prazo: deInputDataHora(novoPrazo).toISOString() }), "Prazo atualizado.")) && fechar()}
            >
              Salvar
            </Botao>
          </>
        }
      >
        <label htmlFor="novo-prazo" className="mb-1.5 block text-[0.8125rem] text-ia-apoio">
          Novo prazo para escolher
        </label>
        <input id="novo-prazo" type="datetime-local" className="campo" value={novoPrazo} onChange={(e) => setNovoPrazo(e.target.value)} />
      </Dialogo>

      <Dialogo
        aberto={aberto === "excluir"}
        aoFechar={fechar}
        titulo="Excluir agendamento"
        rodape={
          <>
            <Botao variante="fantasma" onClick={fechar}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              disabled={acao.ocupado}
              onClick={async () => {
                if (await acao.executar((sb) => sb.from("agendamentos").delete().eq("id", agId))) router.push("/disponibilidade");
              }}
            >
              Excluir
            </Botao>
          </>
        }
      >
        <p className="t-apoio">Grupos e reservas somem. Eventos já criados na agenda continuam.</p>
      </Dialogo>
    </section>
  );
}
