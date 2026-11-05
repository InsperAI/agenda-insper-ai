import Link from "next/link";
import { IcoChecar } from "@/components/ui/Icones";
import type { ItemPedido } from "@/lib/itensPedidos";

/** Seção da página Disponibilidade: título com contagem e a lista de pedidos. */
export default function ListaPedidos({ titulo, itens }: { titulo: string; itens: ItemPedido[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="t-meta">{titulo}</h2>
      <ul className="divide-y divide-ia-regua overflow-hidden rounded-xl border border-ia-regua">
        {itens.map((v) => (
          <li key={v.id}>
            <Link href={v.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ia-nevoa">
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-2 text-[0.95rem] text-ia-petroleo">
                  <span className="truncate">{v.titulo}</span>
                  {v.selo && <span className="shrink-0 rounded-full border border-ia-regua px-2 py-0.5 text-[0.7rem] text-ia-apoio">{v.selo}</span>}
                  {v.minha && <span className="shrink-0 rounded-full bg-ia-nevoa px-2 py-0.5 text-[0.7rem] text-ia-apoio">você pediu</span>}
                </p>
                <p className="mt-0.5 text-pretty text-[0.8125rem] text-ia-apoio">{v.detalhe}</p>
              </div>
              {v.feito && (
                <span className="inline-flex max-w-[40%] shrink-0 items-center gap-1 text-[0.8125rem] text-ia-apoio">
                  <IcoChecar width={14} height={14} className="shrink-0" /> <span className="truncate">{v.feito}</span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Aba sem pedidos: caixa tracejada com o porquê e o próximo passo. */
export function VazioPedidos({ texto, dica }: { texto: string; dica?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ia-regua-forte px-4 py-8 text-center">
      <p className="text-[0.95rem] text-ia-petroleo">{texto}</p>
      {dica && <p className="t-apoio mx-auto mt-1 max-w-sm text-pretty">{dica}</p>}
    </div>
  );
}
