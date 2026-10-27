"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MembroAtual } from "@/lib/membro";
import type { Tema } from "@/lib/tema";
import BrandMark from "@/components/ui/BrandMark";
import BarraAbas from "./BarraAbas";
import MenuUsuario from "./MenuUsuario";
import { estaAtivo, linksNavegacao } from "./navegacao";

/**
 * Barra de 64 px: marca à esquerda, links no meio, usuário à direita. No
 * celular os links descem para a barra de abas inferior (BarraAbas).
 */
export default function Barra({ membro, tema, pedidos = 0, votacoes = 0 }: { membro: MembroAtual; tema: Tema; pedidos?: number; votacoes?: number }) {
  const pathname = usePathname();
  const links = linksNavegacao(membro, { pedidos, votacoes });

  return (
    <>
      <header className="barra sticky top-0 z-40">
        <div className="wrap flex h-16 items-center justify-between gap-3 sm:gap-4">
          <Link href="/agenda" className="flex shrink-0 items-center gap-2.5" aria-label="Agenda Insper AI — início">
            <BrandMark className="h-6 w-[28px] shrink-0" />
            <span className="font-display text-[1.0625rem] font-semibold tracking-[-0.03em] text-ia-petroleo">Insper AI</span>
            <span className="hidden truncate text-[0.9rem] text-ia-meta md:inline">· Agenda</span>
          </Link>

          <nav aria-label="Navegação principal" className="hidden min-w-0 items-center gap-1 md:flex">
            {links.map((l) => {
              const ativo = estaAtivo(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[0.9rem] transition-colors ${
                    ativo ? "bg-ia-nevoa text-ia-petroleo" : "text-ia-apoio hover:text-ia-petroleo"
                  }`}
                >
                  {l.rotulo}
                  {!!l.contador && (
                    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ia-cobalto px-1.5 text-[0.7rem] font-semibold text-ia-papel" aria-label={`${l.contador} pendentes`}>
                      {l.contador}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <MenuUsuario membro={membro} temaInicial={tema} />
        </div>
      </header>
      <BarraAbas links={links} />
    </>
  );
}
