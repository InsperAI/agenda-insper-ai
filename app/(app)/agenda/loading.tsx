import { Bloco, Esqueleto } from "@/components/estados/Esqueleto";

/** Cabeçalho, filtros de categoria e a grade do mês. */
export default function CarregandoAgenda() {
  return (
    <Esqueleto rotulo="Carregando a agenda…" className="gap-4">
      <div className="flex items-center justify-between gap-3">
        <Bloco className="h-9 w-48" />
        <div className="flex gap-2">
          <Bloco className="h-9 w-16 rounded-full" />
          <Bloco className="h-9 w-28 rounded-full" />
        </div>
      </div>
      <div className="flex gap-2">
        <Bloco className="h-8 w-24 rounded-full" />
        <Bloco className="h-8 w-20 rounded-full" />
        <Bloco className="h-8 w-24 rounded-full" />
        <Bloco className="h-8 w-20 rounded-full" />
      </div>
      <Bloco className="h-[22rem] rounded-xl md:h-[32rem]" />
    </Esqueleto>
  );
}
