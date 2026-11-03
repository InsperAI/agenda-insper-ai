import { Bloco, CabecalhoEsqueleto, Esqueleto, ListaEsqueleto } from "@/components/estados/Esqueleto";

export default function CarregandoDisponibilidade() {
  return (
    <Esqueleto rotulo="Carregando pedidos de disponibilidade…" className="wrap-estreito gap-8">
      <CabecalhoEsqueleto />
      <div className="flex flex-col gap-2">
        <Bloco className="h-3 w-40" />
        <ListaEsqueleto linhas={3} />
      </div>
    </Esqueleto>
  );
}
