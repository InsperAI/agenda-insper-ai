import type { Metadata } from "next";
import Agenda from "@/components/agenda/Agenda";
import { obterMembroAtual } from "@/lib/membro";
import { podeEditar } from "@/lib/niveis";
import { lerParametros } from "@/lib/url";

export const metadata: Metadata = { title: "Agenda" };

export default async function PaginaAgenda({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { vista, ancora } = lerParametros(await searchParams);
  // O layout de (app) já garante que há membro; `cache()` evita uma segunda consulta.
  const { membro } = await obterMembroAtual();
  return <Agenda vistaInicial={vista} ancoraInicial={ancora} podeEditar={membro ? podeEditar(membro.nivel) : false} />;
}
