"use client";

import { useState } from "react";
import { IcoChecar } from "@/components/ui/Icones";
import { NIVEIS } from "@/lib/niveis";
import type { Nivel } from "@/lib/supabase/tipos";

export type Pessoa = { id: string; name: string; nivel: Nivel };

function alternar<T>(lista: readonly T[], item: T): T[] {
  return lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item];
}

/** Estado de "quem é convidado": níveis inteiros + ajustes por pessoa (quem cria sempre entra). */
export function useConvidados(pessoas: Pessoa[], meuId: string, niveisIniciais: Nivel[] = ["diretoria"]) {
  const [niveis, setNiveis] = useState<Nivel[]>(niveisIniciais);
  const [incluir, setIncluir] = useState<ReadonlySet<string>>(new Set());
  const [excluir, setExcluir] = useState<ReadonlySet<string>>(new Set());

  const convidado = (p: Pessoa) => p.id === meuId || incluir.has(p.id) || (niveis.includes(p.nivel) && !excluir.has(p.id));
  const total = pessoas.filter(convidado).length;

  function alternarPessoa(p: Pessoa) {
    const trocar = (s: ReadonlySet<string>) => {
      const novo = new Set(s);
      if (novo.has(p.id)) novo.delete(p.id);
      else novo.add(p.id);
      return novo;
    };
    if (niveis.includes(p.nivel)) setExcluir(trocar);
    else setIncluir(trocar);
  }

  return {
    niveis,
    incluir,
    excluir,
    total,
    convidado,
    alternarPessoa,
    alternarNivel: (n: Nivel) => setNiveis((ns) => alternar(ns, n)),
  };
}

export type Convidados = ReturnType<typeof useConvidados>;

/** Chips de níveis + "Ajustar pessoas" (lista por nível, clique inclui/exclui). */
export function SeletorConvidados({ c, pessoas, meuId }: { c: Convidados; pessoas: Pessoa[]; meuId: string }) {
  return (
    <>
      <Chips
        rotulo="Convidar"
        opcoes={NIVEIS.map((n) => ({ id: n.id, rotulo: n.plural }))}
        ligados={c.niveis}
        aoAlternar={(id) => c.alternarNivel(id as Nivel)}
        dica="Todos desses níveis, inclusive quem entrar depois. Ajuste pessoas abaixo."
      />
      <details className="rounded-xl border border-ia-regua">
        <summary className="cursor-pointer list-none p-4 text-[0.9rem] text-ia-petroleo [&::-webkit-details-marker]:hidden">
          Ajustar pessoas · {c.total} convidado{c.total === 1 ? "" : "s"}
        </summary>
        <div className="flex flex-col gap-4 px-4 pb-4">
          {NIVEIS.map((n) => {
            const grupo = pessoas.filter((p) => p.nivel === n.id);
            if (grupo.length === 0) return null;
            return (
              <div key={n.id} className="flex flex-col gap-1.5">
                <p className="t-meta">{n.plural}</p>
                <div className="flex flex-wrap gap-1.5">
                  {grupo.map((p) => {
                    const on = c.convidado(p);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        disabled={p.id === meuId}
                        onClick={() => c.alternarPessoa(p)}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] transition-colors disabled:opacity-70 ${
                          on ? "border-ia-petroleo bg-ia-petroleo text-ia-papel" : "border-ia-regua text-ia-corpo hover:bg-ia-nevoa"
                        }`}
                      >
                        {on && <IcoChecar width={13} height={13} />}
                        {p.name}
                        {p.id === meuId && " (você)"}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </>
  );
}

export function Chips({ rotulo, opcoes, ligados, aoAlternar, dica }: { rotulo: string; opcoes: { id: string; rotulo: string }[]; ligados: readonly string[]; aoAlternar: (id: string) => void; dica?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.8125rem] text-ia-apoio">{rotulo}</span>
      <div role="group" aria-label={rotulo} className="flex flex-wrap gap-1.5">
        {opcoes.map((o) => {
          const on = ligados.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => aoAlternar(o.id)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.875rem] transition-colors ${
                on ? "border-ia-petroleo bg-ia-petroleo text-ia-papel" : "border-ia-regua text-ia-corpo hover:bg-ia-nevoa"
              }`}
            >
              {on && <IcoChecar width={14} height={14} />}
              {o.rotulo}
            </button>
          );
        })}
      </div>
      {dica && <p className="text-[0.8125rem] text-ia-meta">{dica}</p>}
    </div>
  );
}
