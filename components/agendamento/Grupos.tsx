"use client";

import { useState } from "react";
import Botao, { BotaoIcone } from "@/components/ui/Botao";
import Dialogo from "@/components/ui/Dialogo";
import { IcoLapis, IcoLixeira } from "@/components/ui/Icones";
import { NOME_GRUPO_MAX, nomeGrupoValido, type GrupoVisao, type HorarioVisao, type PessoaVisao } from "@/lib/agendamento";
import { rotuloHorario } from "./SeuGrupo";
import type { useAcao } from "./useAcao";

type Acao = ReturnType<typeof useAcao>;

/**
 * Todos os grupos e quem está sem grupo. Para quem organiza (ou a diretoria),
 * cada linha ganha controles: horário, renomear, excluir e mover pessoas.
 */
export default function Grupos({
  agId,
  grupos,
  semGrupo,
  horarios,
  editavel,
  acao,
}: {
  agId: string;
  grupos: GrupoVisao[];
  semGrupo: PessoaVisao[];
  horarios: HorarioVisao[];
  editavel: boolean;
  acao: Acao;
}) {
  const [renomeando, setRenomeando] = useState<GrupoVisao | null>(null);
  const [excluindo, setExcluindo] = useState<GrupoVisao | null>(null);
  const [novo, setNovo] = useState("");

  const mover = (pessoa: PessoaVisao, grupoId: string) =>
    acao.executar(
      (sb) => sb.rpc("org_mover_pessoa", { p_ag: agId, p_member: pessoa.id, p_grupo: grupoId || null }),
      grupoId ? `${pessoa.nome} foi para ${grupos.find((g) => g.id === grupoId)?.nome ?? "o grupo"}.` : `${pessoa.nome} ficou sem grupo.`,
    );

  return (
    <section aria-labelledby="grupos" className="flex flex-col gap-3">
      <h2 id="grupos" className="t-meta">
        Grupos · {grupos.length}
      </h2>

      {grupos.length === 0 && <p className="rounded-xl border border-dashed border-ia-regua-forte px-4 py-6 text-center text-[0.875rem] text-ia-apoio">Nenhum grupo ainda.</p>}

      {grupos.length > 0 && (
        <ul className="divide-y divide-ia-regua overflow-hidden rounded-xl border border-ia-regua">
          {grupos.map((g) => (
            <li key={g.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <p className="min-w-0 flex-1 basis-40 break-words text-[0.95rem] text-ia-petroleo">{g.nome}</p>
                {editavel ? (
                  <div className="flex items-center gap-1">
                    <label className="sr-only" htmlFor={`h-${g.id}`}>
                      Horário de {g.nome}
                    </label>
                    <select
                      id={`h-${g.id}`}
                      className="campo h-9 w-auto min-w-0 py-0 text-[0.8125rem]"
                      value={g.horario?.id ?? ""}
                      disabled={acao.ocupado}
                      onChange={(e) => acao.executar((sb) => sb.rpc("org_definir_horario", { p_grupo: g.id, p_horario: e.target.value || null }), "Horário do grupo atualizado.")}
                    >
                      <option value="">Sem horário</option>
                      {horarios
                        .filter((h) => !h.grupo || h.grupo.id === g.id)
                        .map((h) => (
                          <option key={h.horario.id} value={h.horario.id}>
                            {rotuloHorario(h.horario.inicio, h.horario.fim)}
                          </option>
                        ))}
                    </select>
                    <BotaoIcone rotulo={`Renomear ${g.nome}`} onClick={() => setRenomeando(g)}>
                      <IcoLapis />
                    </BotaoIcone>
                    <BotaoIcone rotulo={`Excluir ${g.nome}`} onClick={() => setExcluindo(g)}>
                      <IcoLixeira />
                    </BotaoIcone>
                  </div>
                ) : (
                  <span className="text-[0.8125rem] text-ia-apoio tabular-nums">{g.horario ? rotuloHorario(g.horario.inicio, g.horario.fim) : "sem horário"}</span>
                )}
              </div>
              <Pessoas pessoas={g.pessoas} grupoAtual={g.id} grupos={grupos} editavel={editavel} ocupado={acao.ocupado} aoMover={mover} />
            </li>
          ))}
        </ul>
      )}

      {semGrupo.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[0.8125rem] text-ia-apoio">Sem grupo · {semGrupo.length}</p>
          <Pessoas pessoas={semGrupo} grupoAtual="" grupos={grupos} editavel={editavel && grupos.length > 0} ocupado={acao.ocupado} aoMover={mover} />
        </div>
      )}

      {editavel && (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!nomeGrupoValido(novo)) return;
            if (await acao.executar((sb) => sb.rpc("org_criar_grupo", { p_ag: agId, p_nome: novo.trim() }), "Grupo criado.")) setNovo("");
          }}
        >
          <label htmlFor="org-novo" className="sr-only">
            Nome do novo grupo
          </label>
          <input id="org-novo" className="campo flex-1" value={novo} onChange={(e) => setNovo(e.target.value)} maxLength={NOME_GRUPO_MAX} placeholder="Criar grupo vazio (para mover pessoas)" />
          <Botao type="submit" disabled={acao.ocupado || !nomeGrupoValido(novo)}>
            Criar grupo
          </Botao>
        </form>
      )}

      {renomeando && <DialogoRenomear grupo={renomeando} aoFechar={() => setRenomeando(null)} acao={acao} />}
      <Dialogo
        aberto={!!excluindo}
        aoFechar={() => setExcluindo(null)}
        titulo={`Excluir ${excluindo?.nome ?? "grupo"}`}
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setExcluindo(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              disabled={acao.ocupado}
              onClick={async () => {
                if (excluindo && (await acao.executar((sb) => sb.rpc("org_excluir_grupo", { p_grupo: excluindo.id }), "Grupo excluído."))) setExcluindo(null);
              }}
            >
              Excluir
            </Botao>
          </>
        }
      >
        <p className="t-apoio">As pessoas ficam sem grupo e o horário volta a ficar livre.</p>
      </Dialogo>
    </section>
  );
}

const MANTER = "";
const TIRAR = "__tirar";

function Pessoas({
  pessoas,
  grupoAtual,
  grupos,
  editavel,
  ocupado,
  aoMover,
}: {
  pessoas: PessoaVisao[];
  grupoAtual: string;
  grupos: GrupoVisao[];
  editavel: boolean;
  ocupado: boolean;
  aoMover: (p: PessoaVisao, grupoId: string) => void;
}) {
  if (pessoas.length === 0) return <p className="text-[0.8125rem] text-ia-meta">Ninguém.</p>;
  if (!editavel) return <p className="text-[0.8125rem] text-ia-apoio">{pessoas.map((p) => p.nome).join(", ")}</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {pessoas.map((p) => (
        <li key={p.id} className="inline-flex h-8 items-center gap-1 rounded-full border border-ia-regua py-0 pr-1 pl-3 text-[0.8125rem] text-ia-corpo">
          {p.nome}
          <label className="sr-only" htmlFor={`m-${grupoAtual}-${p.id}`}>
            Mover {p.nome}
          </label>
          <select
            id={`m-${grupoAtual}-${p.id}`}
            value={MANTER}
            disabled={ocupado}
            onChange={(e) => aoMover(p, e.target.value === TIRAR ? "" : e.target.value)}
            className="h-6 cursor-pointer rounded-full bg-ia-nevoa px-1.5 text-[0.75rem] text-ia-apoio"
          >
            <option value={MANTER} disabled>
              {grupoAtual ? "mover" : "pôr em…"}
            </option>
            {grupos
              .filter((g) => g.id !== grupoAtual)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            {grupoAtual && <option value={TIRAR}>tirar do grupo</option>}
          </select>
        </li>
      ))}
    </ul>
  );
}

function DialogoRenomear({ grupo, aoFechar, acao }: { grupo: GrupoVisao; aoFechar: () => void; acao: Acao }) {
  const [nome, setNome] = useState(grupo.nome);
  const salvar = async () => {
    if (nomeGrupoValido(nome) && (await acao.executar((sb) => sb.rpc("org_renomear_grupo", { p_grupo: grupo.id, p_nome: nome.trim() }), "Grupo renomeado."))) aoFechar();
  };
  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo="Renomear grupo"
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao variante="primario" disabled={acao.ocupado || !nomeGrupoValido(nome)} onClick={salvar}>
            Salvar
          </Botao>
        </>
      }
    >
      <label htmlFor="renomear" className="sr-only">
        Nome do grupo
      </label>
      <input id="renomear" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={NOME_GRUPO_MAX} autoFocus />
    </Dialogo>
  );
}
