import { Bloco, CabecalhoEsqueleto, Esqueleto } from "@/components/estados/Esqueleto";

/** Formulário do novo pedido: campos empilhados. */
export default function CarregandoNovoPedido() {
  return (
    <Esqueleto rotulo="Carregando…" className="wrap-estreito gap-6">
      <CabecalhoEsqueleto />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Bloco className="h-3 w-24" />
          <Bloco className="h-11 w-full" />
        </div>
      ))}
    </Esqueleto>
  );
}
