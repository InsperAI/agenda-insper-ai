import type { Metadata } from "next";
import Agenda from "@/components/agenda/Agenda";
import { lerParametros } from "@/lib/url";

export const metadata: Metadata = { title: "Agenda" };

export default async function PaginaAgenda({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { vista, ancora } = lerParametros(await searchParams);
  return <Agenda vistaInicial={vista} ancoraInicial={ancora} />;
}
