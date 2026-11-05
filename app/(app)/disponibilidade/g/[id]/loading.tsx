import { Bloco, Esqueleto, ListaEsqueleto } from "@/components/estados/Esqueleto";

/** Voltar, título, "seu grupo" e a lista de horários. */
export default function CarregandoAgendamento() {
  return (
    <Esqueleto rotulo="Carregando os horários…" className="wrap-estreito gap-6">
      <Bloco className="h-3 w-28" />
      <div className="flex flex-col gap-3">
        <Bloco className="h-8 w-72 max-w-full" />
        <Bloco className="h-4 w-56 max-w-full" />
      </div>
      <Bloco className="h-32 rounded-xl" />
      <ListaEsqueleto linhas={5} />
    </Esqueleto>
  );
}
