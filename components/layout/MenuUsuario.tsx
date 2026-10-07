"use client";

import { useEffect, useRef } from "react";
import type { MembroAtual } from "@/lib/membro";

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Avatar com iniciais; abre um cartão com nome, cargo, e-mail e "Sair". */
export default function MenuUsuario({ membro }: { membro: MembroAtual }) {
  const ref = useRef<HTMLDetailsElement>(null);

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
      <div className="absolute right-0 mt-2 w-64 rounded-xl border border-ia-regua bg-ia-papel p-1.5 shadow-[0_16px_48px_rgba(1,30,66,0.12)]">
        <div className="px-3 py-2.5">
          <p className="truncate font-display font-semibold text-ia-petroleo">{membro.name}</p>
          {membro.cargo && <p className="truncate text-[0.8125rem] text-ia-apoio">{membro.cargo}</p>}
          <p className="mt-0.5 truncate text-[0.8125rem] text-ia-meta">{membro.email}</p>
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
