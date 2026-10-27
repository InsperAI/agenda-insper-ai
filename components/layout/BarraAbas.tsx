"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { estaAtivo, type LinkNav } from "./navegacao";

/**
 * Barra de abas inferior, só no celular (como app nativo): ícone + rótulo, alvo
 * de toque grande, contador de pendências e respiro para a barra de início do iPhone.
 */
export default function BarraAbas({ links }: { links: LinkNav[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="barra-abas fixed inset-x-0 bottom-0 z-40 md:hidden">
      <ul className="mx-auto flex max-w-lg">
        {links.map(({ href, rotulo, Icone, contador }) => {
          const ativo = estaAtivo(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={`relative flex h-14 flex-col items-center justify-center gap-0.5 text-[0.6875rem] transition-colors ${ativo ? "text-ia-cobalto" : "text-ia-apoio"}`}
              >
                {ativo && <motion.span layoutId="aba-ativa" className="absolute top-0 h-0.5 w-8 rounded-full bg-ia-cobalto" />}
                <span className="relative">
                  <Icone width={22} height={22} strokeWidth={ativo ? 2.1 : 1.75} />
                  {!!contador && (
                    <span
                      className="absolute -top-1.5 -right-2.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-ia-cobalto px-1 text-[0.625rem] font-semibold text-ia-papel"
                      aria-label={`${contador} pendentes`}
                    >
                      {contador}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate px-1">{rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
