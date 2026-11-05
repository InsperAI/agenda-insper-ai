"use client";

import { useState, type FormEvent } from "react";
import Botao from "@/components/ui/Botao";
import { NOME_GRUPO_MAX, nomeGrupoValido, type GrupoVisao } from "@/lib/agendamento";
import { dataCurta, diaSemanaCurto, hora } from "@/lib/datas";
import type { useAcao } from "./useAcao";

type Acao = ReturnType<typeof useAcao>;

/**
 * O "Classroom": sem grupo, cria um ou entra num existente; com grupo, mostra
 * quem está e o horário, e deixa sair (até o prazo).
 */
export default function SeuGrupo({ agId, aberto, meuGrupo, grupos, acao }: { agId: string; aberto: boolean; meuGrupo: GrupoVisao | null; grupos: GrupoVisao[]; acao: Acao }) {
  const [nome, setNome] = useState("");

  async function criar(e: FormEvent) {
    e.preventDefault();
    if (!nomeGrupoValido(nome)) return;
    const ok = await acao.executar((sb) => sb.rpc("criar_grupo", { p_ag: agId, p_nome: nome.trim() }), "Grupo criado. Agora reserve um horário.");
    if (ok) setNome("");
  }

  if (meuGrupo) {
    return (
      <section aria-labelledby="seu-grupo" className="flex flex-col gap-3 rounded-xl border border-ia-petroleo/30 bg-ia-nevoa p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="t-meta">Seu grupo</p>
            <h2 id="seu-grupo" className="mt-1 break-words font-display text-[1.15rem] font-semibold text-ia-petroleo">
              {meuGrupo.nome}
            </h2>
            <p className="mt-1 text-[0.875rem] text-ia-apoio">{meuGrupo.pessoas.map((p) => p.nome).join(", ")}</p>
          </div>
          {aberto && (
            <Botao tamanho="sm" variante="fantasma" disabled={acao.ocupado} onClick={() => acao.executar((sb) => sb.rpc("sair_grupo", { p_ag: agId }), "Você saiu do grupo.")}>
              Sair do grupo
            </Botao>
          )}
        </div>
        <p className="text-[0.9rem] text-ia-petroleo">
          {meuGrupo.horario ? (
            <>
              Horário: <strong className="font-semibold tabular-nums">{rotuloHorario(meuGrupo.horario.inicio, meuGrupo.horario.fim)}</strong>
            </>
          ) : aberto ? (
            "Ainda sem horário: escolha um livre abaixo."
          ) : (
            "Sem horário."
          )}
        </p>
      </section>
    );
  }

  if (!aberto) return null;

  const outros = grupos;
  return (
    <section aria-labelledby="entrar-grupo" className="flex flex-col gap-4 rounded-xl border border-ia-regua p-4">
      <h2 id="entrar-grupo" className="font-display text-[1.05rem] font-semibold text-ia-petroleo">
        Entre num grupo ou crie o seu
      </h2>
      {outros.length > 0 && (
        <ul className="flex flex-col divide-y divide-ia-regua">
          {outros.map((g) => (
            <li key={g.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.95rem] text-ia-petroleo">{g.nome}</p>
                <p className="truncate text-[0.8125rem] text-ia-apoio">
                  {g.pessoas.map((p) => p.nome).join(", ") || "sem ninguém"}
                  {g.horario && ` · ${rotuloHorario(g.horario.inicio, g.horario.fim)}`}
                </p>
              </div>
              <Botao tamanho="sm" disabled={acao.ocupado} onClick={() => acao.executar((sb) => sb.rpc("entrar_grupo", { p_grupo: g.id }), `Você entrou em ${g.nome}.`)}>
                Entrar
              </Botao>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={criar} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="novo-grupo" className="sr-only">
          Nome do novo grupo
        </label>
        <input
          id="novo-grupo"
          className="campo flex-1"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={NOME_GRUPO_MAX}
          placeholder={outros.length ? "Ou crie um grupo: nome" : "Nome do grupo (ex.: Grupo 3)"}
        />
        <Botao type="submit" variante="primario" disabled={acao.ocupado || !nomeGrupoValido(nome)}>
          Criar grupo
        </Botao>
      </form>
    </section>
  );
}

/** "qui 12/11 · 14h–14h20" */
export function rotuloHorario(inicio: string, fim: string): string {
  const i = new Date(inicio);
  return `${diaSemanaCurto(i)} ${dataCurta(i)} · ${hora(i)}–${hora(new Date(fim))}`;
}
