"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { traduzirErroAgendamento } from "@/lib/agendamento";
import { supabaseNavegador, type ClienteSupabase } from "@/lib/supabase/client";

type Resultado = PromiseLike<{ error: { message: string } | null }>;

/**
 * Roda uma função do banco, avisa o resultado e recarrega a página (os dados
 * vêm do servidor). Uma ação por vez: `ocupado` desliga os botões.
 */
export function useAcao(aoAvisar: (mensagem: string) => void) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);

  const executar = useCallback(
    async (acao: (sb: ClienteSupabase) => Resultado, sucesso?: string): Promise<boolean> => {
      setOcupado(true);
      const { error } = await acao(sb);
      setOcupado(false);
      if (error) {
        aoAvisar(traduzirErroAgendamento(error.message));
        router.refresh(); // o erro costuma ser "alguém mudou antes": mostra o estado novo
        return false;
      }
      if (sucesso) aoAvisar(sucesso);
      router.refresh();
      return true;
    },
    [sb, router, aoAvisar],
  );

  return { ocupado, executar };
}
