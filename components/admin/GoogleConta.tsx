"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import Aviso from "@/components/ui/Aviso";
import Botao, { classesBotao } from "@/components/ui/Botao";
import { IcoGoogle, IcoRepetir } from "@/components/ui/Icones";
import type { GoogleStatus } from "@/lib/supabase/tipos";

const quando = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "nunca";

/**
 * Painel do admin para o Google Agenda "na hora" (0014): qual conta da Insper
 * AI organiza os eventos, a fila e o último erro.
 */
/** Códigos que /api/google/retorno manda de volta; nunca mostramos texto vindo da URL. */
const RETORNO: Record<string, string> = {
  ok: "Conta conectada. Os eventos estão sendo enviados.",
  expirou: "A conexão expirou. Tente de novo.",
  cancelou: "Você cancelou na tela do Google.",
  escopo: "Não conectou: marque a permissão de agendas na tela do Google.",
  sem_refresh: "Não conectou: o Google não mandou o acesso offline. Tente de novo.",
  config: "Não conectou: faltam GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET na Vercel.",
  revogado: "Não conectou: o Google recusou o acesso. Tente de novo.",
  email: "Não conectou: não deu para ler o e-mail da conta Google.",
  falhou: "Não conectou. Tente de novo; se repetir, veja os logs da Vercel.",
};

export default function GoogleConta({ status, retorno }: { status: GoogleStatus | null; retorno: string | null }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(() => (retorno ? (RETORNO[retorno] ?? RETORNO.falhou) : null));
  const fecharAviso = useCallback(() => setAviso(null), []);

  // Sem a 0014 a função não existe: o painel não aparece.
  if (!status) return null;

  async function sincronizar() {
    setOcupado(true);
    const r = await fetch("/api/google/sincronizar", { method: "POST" }).catch(() => null);
    if (!r?.ok) {
      setOcupado(false);
      return setAviso("Não deu para pedir a sincronização.");
    }
    setAviso("Sincronizando…");
    setTimeout(() => {
      setOcupado(false);
      router.refresh();
    }, 4000);
  }

  async function desconectar() {
    if (!confirm("Parar de mandar eventos para o Google? A agenda “Insper AI · Agenda” da conta é apagada e os eventos somem do Google Agenda de quem ativou.")) return;
    setOcupado(true);
    const r = await fetch("/api/google/desconectar", { method: "POST" }).catch(() => null);
    setOcupado(false);
    if (!r?.ok) return setAviso("Não deu para desconectar.");
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-ia-regua p-4">
      <p className="font-display font-semibold text-ia-petroleo">Google Agenda · na hora</p>
      {status.conectada ? (
        <>
          <p className="mt-1 text-[0.875rem] text-ia-apoio">
            Organizado por <strong className="font-medium text-ia-corpo">{status.email}</strong> · {status.inscritos ?? 0}{" "}
            {status.inscritos === 1 ? "pessoa ativou" : "pessoas ativaram"} em Conectar · última sincronização {quando(status.sincronizada_em)}
            {status.pendentes ? ` · ${status.pendentes} na fila` : ""}
            {status.com_erro ? ` (${status.com_erro} com erro)` : ""}
          </p>
          {status.erro && <p className="mt-2 rounded-lg bg-perigo-fundo px-3 py-2 text-[0.8125rem] text-perigo">{status.erro}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Botao tamanho="sm" onClick={sincronizar} disabled={ocupado}>
              <IcoRepetir /> Sincronizar agora
            </Botao>
            {status.erro && (
              <a href="/api/google/conectar" className={classesBotao("secundario", "sm")}>
                <IcoGoogle /> Conectar de novo
              </a>
            )}
            <Botao variante="perigo" tamanho="sm" onClick={desconectar} disabled={ocupado}>
              Desconectar
            </Botao>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 max-w-prose text-pretty text-[0.8125rem] text-ia-apoio">
            Conecte uma conta Google da Insper AI (de preferência uma @insperai.com.br só para isso). Ela vira a organizadora: cada evento entra na agenda de quem
            ativou em Conectar segundos depois de salvo, em vez de esperar o Google buscar o link (12 a 24 h). A agenda só pede acesso à agenda que ela mesma cria nessa
            conta.
          </p>
          <a href="/api/google/conectar" className={`${classesBotao("primario", "sm")} mt-3`}>
            <IcoGoogle /> Conectar conta Google
          </a>
        </>
      )}
      <Aviso mensagem={aviso} aoFechar={fecharAviso} />
    </section>
  );
}
