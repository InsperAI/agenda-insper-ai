import type { ComponentType, SVGProps } from "react";
import { IcoCalendario, IcoConectar, IcoDisponibilidade, IcoPessoa } from "@/components/ui/Icones";
import type { MembroAtual } from "@/lib/membro";

export type LinkNav = { href: string; rotulo: string; Icone: ComponentType<SVGProps<SVGSVGElement>>; contador?: number };

/** Destinos principais do app: menu do topo no desktop, barra de abas no celular. */
export function linksNavegacao(membro: MembroAtual, contadores: { pedidos: number; votacoes: number }): LinkNav[] {
  return [
    { href: "/agenda", rotulo: "Agenda", Icone: IcoCalendario },
    { href: "/disponibilidade", rotulo: "Disponibilidade", Icone: IcoDisponibilidade, contador: contadores.votacoes },
    { href: "/conectar", rotulo: "Conectar", Icone: IcoConectar },
    ...(membro.is_admin ? [{ href: "/admin", rotulo: "Membros", Icone: IcoPessoa, contador: contadores.pedidos }] : []),
  ];
}

export function estaAtivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
