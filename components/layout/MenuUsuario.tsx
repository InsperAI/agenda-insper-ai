"use client";

import { useEffect, useRef, useState } from "react";
import Segmentado from "@/components/ui/Segmentado";
import type { MembroAtual } from "@/lib/membro";
import { atributoTema, COOKIE_TEMA, OPCOES_TEMA, UM_ANO_EM_SEGUNDOS, type Tema } from "@/lib/tema";

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Grava a preferência e aplica na hora, sem recarregar. */
function aplicarTema(tema: Tema) {
  document.cookie = `${COOKIE_TEMA}=${tema}; path=/; max-age=${UM_ANO_EM_SEGUNDOS}; samesite=lax`;
  const attr = atributoTema(tema);
  if (attr) document.documentElement.dataset.theme = attr;
  else delete document.documentElement.dataset.theme;
}

/** Avatar com iniciais; abre um cartão com nome, cargo, e-mail, tema e "Sair". */
export default function MenuUsuario({ membro, temaInicial }: { membro: MembroAtual; temaInicial: Tema }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [tema, setTema] = useState(temaInicial);

  function mudarTema(t: Tema) {
    setTema(t);
    aplicarTema(t);
  }

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fora = (e: MouseEvent) => {
      if (el.open && !el.contains(e.target as Node)) el.open = false;
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && el.open) el.open = false;
    };
    document.addEventListener("click", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", fora);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  return (
    <details ref={ref} className="relative shrink-0">
      <summary
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-ia-petroleo font-display text-[0.8125rem] font-semibold text-ia-papel select-none [&::-webkit-details-marker]:hidden"
        aria-label={`Conta de ${membro.name}`}
        title={membro.name}
      >
        {iniciais(membro.name)}
      </summary>
      <div className="absolute right-0 mt-2 w-64 rounded-xl border border-ia-regua bg-ia-papel p-1.5 shadow-pop">
        <div className="px-3 py-2.5">
          <p className="truncate font-display font-semibold text-ia-petroleo">{membro.name}</p>
          {membro.cargo && <p className="truncate text-[0.8125rem] text-ia-apoio">{membro.cargo}</p>}
          <p className="mt-0.5 truncate text-[0.8125rem] text-ia-meta">{membro.email}</p>
        </div>
        <div className="regua mx-1.5" />
        <div className="px-3 py-2.5">
          <p className="t-meta mb-2">Tema</p>
          <Segmentado opcoes={OPCOES_TEMA} valor={tema} aoMudar={mudarTema} rotulo="Tema" />
        </div>
        <div className="regua mx-1.5" />
        <form action="/auth/sair" method="post" className="p-1">
          <button type="submit" className="w-full rounded-lg px-2 py-2 text-left text-[0.875rem] text-ia-apoio transition-colors hover:bg-ia-nevoa hover:text-ia-petroleo">
            Sair
          </button>
        </form>
      </div>
    </details>
  );
}
