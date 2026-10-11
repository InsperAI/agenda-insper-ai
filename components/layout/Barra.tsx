"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MembroAtual } from "@/lib/membro";
import type { Tema } from "@/lib/tema";
import BrandMark from "@/components/ui/BrandMark";
import MenuUsuario from "./MenuUsuario";

/** Barra de 64 px: marca + nome do app à esquerda, links no meio, usuário à direita. */
export default function Barra({ membro, tema }: { membro: MembroAtual; tema: Tema }) {
  const pathname = usePathname();
  const links = [
    { href: "/agenda", rotulo: "Agenda" },
    { href: "/assinar", rotulo: "Assinar" },
    ...(membro.is_admin ? [{ href: "/admin", rotulo: "Membros" }] : []),
  ];

  return (
    <header className="barra sticky top-0 z-40">
      <div className="wrap flex h-16 items-center justify-between gap-3 sm:gap-4">
        <Link href="/agenda" className="flex shrink-0 items-center gap-2.5" aria-label="Agenda da Diretoria — início">
          <BrandMark className="h-6 w-[28px] shrink-0" />
          <span className="hidden font-display text-[1.0625rem] font-semibold tracking-[-0.03em] text-ia-petroleo sm:inline">Insper AI</span>
          <span className="hidden truncate text-[0.9rem] text-ia-meta md:inline">· Agenda da Diretoria</span>
        </Link>

        <nav aria-label="Navegação principal" className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          {links.map((l) => {
            const ativo = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={ativo ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-2 py-1.5 text-[0.8125rem] transition-colors sm:px-3 sm:text-[0.9rem] ${
                  ativo ? "bg-ia-nevoa text-ia-petroleo" : "text-ia-apoio hover:text-ia-petroleo"
                }`}
              >
                {l.rotulo}
              </Link>
            );
          })}
        </nav>

        <MenuUsuario membro={membro} temaInicial={tema} />
      </div>
    </header>
  );
}
