"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import Botao from "@/components/ui/Botao";
import Campo from "@/components/ui/Campo";
import { dataHoraCurta } from "@/lib/datas";
import { NIVEIS_PUBLICO, ROTULO_NIVEL } from "@/lib/niveis";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { NivelPublico, PedidoRow } from "@/lib/supabase/tipos";

function traduzir(m: string): string {
  if (/duplicate key/i.test(m)) return "Você já tem um pedido aguardando aprovação.";
  // A RLS barra os dois casos com a mesma mensagem: já é membro ou a fila (100) está cheia.
  if (/row-level security/i.test(m)) return "Não foi possível enviar: talvez você já esteja cadastrado (recarregue a página) ou a fila de pedidos está cheia agora.";
  if (/check constraint/i.test(m)) return "Confira o nome e o cargo (até 120 caracteres).";
  return m;
}

/**
 * Pedido de acesso de quem entrou com o Google mas não está em `members`. O
 * e-mail vem do login (default no banco), então só dá para pedir para si mesmo.
 */
export default function PedidoAcesso({ pedido, nomeSugerido }: { pedido: PedidoRow | null; nomeSugerido: string }) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const router = useRouter();
  const [nome, setNome] = useState(nomeSugerido);
  const [cargo, setCargo] = useState("");
  const [nivel, setNivel] = useState<NivelPublico>("membro");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("Digite seu nome.");
    setOcupado(true);
    const { error } = await sb.from("access_requests").insert({ name: nome.trim(), cargo: cargo.trim(), nivel });
    setOcupado(false);
    if (error) return setErro(traduzir(error.message));
    router.refresh();
  }

  async function cancelar() {
    if (!pedido) return;
    setOcupado(true);
    const { error } = await sb.from("access_requests").delete().eq("id", pedido.id);
    setOcupado(false);
    if (error) return setErro(traduzir(error.message));
    router.refresh();
  }

  if (pedido) {
    return (
      <div className="mt-6 flex w-full flex-col gap-3 rounded-xl border border-ia-regua p-4 text-left">
        <p className="font-display font-semibold text-ia-petroleo">Pedido enviado</p>
        <p className="t-apoio">
          {pedido.name} · {ROTULO_NIVEL[pedido.nivel]}
          {pedido.cargo ? ` · ${pedido.cargo}` : ""}
        </p>
        <p className="text-[0.8125rem] text-ia-meta">
          Enviado em {dataHoraCurta(new Date(pedido.created_at))}. Assim que um admin aprovar, é só recarregar esta página.
        </p>
        {erro && <p role="alert" className="text-[0.875rem] text-perigo">{erro}</p>}
        <div className="flex justify-between gap-2">
          <Botao variante="fantasma" tamanho="sm" onClick={cancelar} disabled={ocupado}>
            Cancelar pedido
          </Botao>
          <Botao tamanho="sm" onClick={() => router.refresh()}>
            Recarregar
          </Botao>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-6 flex w-full flex-col gap-3 rounded-xl border border-ia-regua p-4 text-left">
      <p className="font-display font-semibold text-ia-petroleo">Pedir acesso</p>
      <Campo id="p-nome" rotulo="Nome">
        <input id="p-nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} required />
      </Campo>
      <Campo id="p-nivel" rotulo="Você é">
        <select id="p-nivel" className="campo" value={nivel} onChange={(e) => setNivel(e.target.value as NivelPublico)}>
          {NIVEIS_PUBLICO.map((n) => (
            <option key={n.id} value={n.id}>
              {ROTULO_NIVEL[n.id]}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="p-cargo" rotulo="Cargo / área" opcional>
        <input id="p-cargo" className="campo" value={cargo} onChange={(e) => setCargo(e.target.value)} maxLength={120} placeholder="Ex.: Projetos, Marketing…" />
      </Campo>
      {erro && <p role="alert" className="text-[0.875rem] text-perigo">{erro}</p>}
      <Botao variante="primario" type="submit" disabled={ocupado}>
        Enviar pedido
      </Botao>
    </form>
  );
}
