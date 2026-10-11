"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Aviso from "@/components/ui/Aviso";
import Botao, { BotaoLink } from "@/components/ui/Botao";
import { IcoChecar, IcoCopiar, IcoExterno, IcoRepetir } from "@/components/ui/Icones";
import { supabaseNavegador } from "@/lib/supabase/client";

export default function Assinatura({ token: tokenInicial }: { token: string | null }) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const [token, setToken] = useState(tokenInicial);
  const [origem, setOrigem] = useState<string>(process.env.NEXT_PUBLIC_SITE_URL ?? "");
  const [copiado, setCopiado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);
  const [girando, setGirando] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigem(window.location.origin);
  }, []);

  if (!token) {
    return <p className="rounded-lg bg-perigo-fundo px-3 py-2 text-[0.875rem] text-perigo">Seu link de assinatura ainda não foi gerado. Peça a um admin para conferir seu cadastro.</p>;
  }

  const https = `${origem}/api/feed/${token}`;
  const webcal = https.replace(/^https?:/, "webcal:");
  const google = `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(webcal)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(https);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setAviso("Não deu para copiar automaticamente. Selecione o link e copie.");
    }
  }

  async function gerarNovo() {
    if (!confirm("Gerar um novo link invalida o atual. Quem assinou com o link antigo para de receber atualizações. Continuar?")) return;
    setGirando(true);
    const { data, error } = await sb.rpc("rotate_feed_token");
    setGirando(false);
    if (error || !data) return setAviso(error?.message ?? "Não foi possível gerar o link.");
    setToken(data);
    setAviso("Novo link gerado. Assine de novo nos seus calendários.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-ia-regua p-4">
        <p className="t-meta mb-2">Seu link pessoal</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="campo min-h-0 flex-1 truncate bg-ia-nevoa font-mono text-[0.8125rem] text-ia-corpo select-all" title={https}>
            {https}
          </code>
          <Botao onClick={copiar} className="shrink-0">
            {copiado ? <IcoChecar /> : <IcoCopiar />}
            {copiado ? "Copiado" : "Copiar"}
          </Botao>
        </div>
        <p className="mt-2 text-[0.8125rem] text-ia-meta">Quem tem este link vê os mesmos eventos que você. Não compartilhe.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Passo titulo="Google Agenda" texto="Abre o Google Agenda já com o link preenchido. Se não abrir, use Outras agendas → + → Por URL e cole o link acima.">
          <BotaoLink href={google} target="_blank" rel="noreferrer" variante="primario" tamanho="sm">
            Abrir no Google Agenda <IcoExterno />
          </BotaoLink>
        </Passo>
        <Passo titulo="Apple Calendar · Outlook" texto="Abre o app de calendário do seu computador ou celular pedindo para assinar.">
          <BotaoLink href={webcal} variante="secundario" tamanho="sm">
            Assinar via webcal <IcoExterno />
          </BotaoLink>
        </Passo>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-ia-regua p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.95rem] text-ia-petroleo">Link vazou?</p>
          <p className="text-[0.8125rem] text-ia-apoio">Gere outro. O antigo para de funcionar na hora.</p>
        </div>
        <Botao variante="fantasma" tamanho="sm" onClick={gerarNovo} disabled={girando}>
          <IcoRepetir /> {girando ? "Gerando…" : "Gerar novo link"}
        </Botao>
      </div>

      <Aviso mensagem={aviso} aoFechar={fecharAviso} />
    </div>
  );
}

function Passo({ titulo, texto, children }: { titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ia-regua p-4">
      <div>
        <p className="font-display font-semibold text-ia-petroleo">{titulo}</p>
        <p className="mt-1 text-[0.8125rem] text-ia-apoio">{texto}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}
