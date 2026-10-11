"use client";

import { useMemo, useState } from "react";
import Botao from "@/components/ui/Botao";
import { dataHoraCurta } from "@/lib/datas";
import { traduzirErroMembro } from "@/lib/membros";
import { NIVEIS } from "@/lib/niveis";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { MembroRow, Nivel, PedidoRow } from "@/lib/supabase/tipos";

/**
 * Pedidos de quem entrou com o Google e ainda não é membro. Aprovar chama a
 * função `aprovar_pedido` (cria o membro e apaga o pedido numa transação).
 */
export default function PedidosAcesso({
  pedidos,
  aoResolver,
  aoAprovar,
  aoAvisar,
}: {
  pedidos: PedidoRow[];
  aoResolver: (id: string) => void;
  aoAprovar: (m: MembroRow) => void;
  aoAvisar: (msg: string) => void;
}) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const [niveis, setNiveis] = useState<Record<string, Nivel>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);

  if (pedidos.length === 0) return null;

  async function aprovar(p: PedidoRow) {
    setOcupado(p.id);
    const { data, error } = await sb.rpc("aprovar_pedido", { p_id: p.id, p_nivel: niveis[p.id] ?? p.nivel });
    setOcupado(null);
    if (error) return aoAvisar(traduzirErroMembro(error.message));
    aoResolver(p.id);
    aoAprovar(data);
    aoAvisar(`${data.name} agora pode entrar.`);
  }

  async function recusar(p: PedidoRow) {
    setOcupado(p.id);
    const { error } = await sb.from("access_requests").delete().eq("id", p.id);
    setOcupado(null);
    if (error) return aoAvisar(traduzirErroMembro(error.message));
    aoResolver(p.id);
    aoAvisar(`Pedido de ${p.name} recusado.`);
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="t-meta">Pedidos de acesso · {pedidos.length}</h2>
      <ul className="divide-y divide-ia-regua overflow-hidden rounded-xl border border-ia-cobalto/40">
        {pedidos.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.95rem] text-ia-petroleo">{p.name}</p>
              <p className="truncate text-[0.8125rem] text-ia-apoio">
                {p.cargo ? `${p.cargo} · ` : ""}
                {p.email} · {dataHoraCurta(new Date(p.created_at))}
              </p>
            </div>
            <select
              aria-label={`Nível de ${p.name}`}
              className="campo h-9 min-h-0 w-auto py-1"
              value={niveis[p.id] ?? p.nivel}
              onChange={(e) => setNiveis((n) => ({ ...n, [p.id]: e.target.value as Nivel }))}
            >
              {NIVEIS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.rotulo}
                </option>
              ))}
            </select>
            <Botao variante="fantasma" tamanho="sm" onClick={() => recusar(p)} disabled={ocupado === p.id}>
              Recusar
            </Botao>
            <Botao variante="primario" tamanho="sm" onClick={() => aprovar(p)} disabled={ocupado === p.id}>
              Aprovar
            </Botao>
          </li>
        ))}
      </ul>
    </section>
  );
}
