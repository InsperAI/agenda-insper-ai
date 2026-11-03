import { Bloco, Esqueleto } from "@/components/estados/Esqueleto";

/** Voltar, título, resumo e a grade de horários. */
export default function CarregandoPedido() {
  return (
    <Esqueleto rotulo="Carregando o pedido…" className="gap-5">
      <Bloco className="h-3 w-28" />
      <div className="flex flex-col gap-3">
        <Bloco className="h-8 w-64 max-w-full" />
        <Bloco className="h-4 w-80 max-w-full" />
      </div>
      <Bloco className="h-[24rem] rounded-xl" />
    </Esqueleto>
  );
}
