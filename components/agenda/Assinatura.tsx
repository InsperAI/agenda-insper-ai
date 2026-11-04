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
    return <p className="rounded-lg bg-perigo-fundo px-3 py-2 text-[0.875rem] text-perigo">Seu link ainda não foi gerado. Peça a um admin para conferir seu cadastro.</p>;
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
    setAviso("Novo link gerado. Conecte de novo nos seus calendários.");
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

      <div className="flex flex-col gap-3">
        <Passo
          titulo="iPhone, iPad e Mac · Calendário da Apple"
          selo="Atualiza mais rápido"
          texto="Toque no botão e confirme “Assinar”. Para receber mudanças em minutos: em Ajustes → Apps → Calendário → Contas, abra “Obter Dados” e escolha “A cada 15 minutos”. No Mac: clique com o botão direito na agenda → Obter Informações → Atualização automática."
        >
          <BotaoLink href={webcal} variante="primario" tamanho="sm">
            Assinar no Calendário <IcoExterno />
          </BotaoLink>
        </Passo>
        <Passo
          titulo="Google Agenda"
          texto="Faça pelo computador: o app do Google no celular não adiciona agenda por link (depois de adicionada, ela aparece no celular sozinha). Se você tem mais de uma conta Google, confira no canto de cima qual abriu; se for a errada, troque de conta ou use Outras agendas → + → Do URL e cole o link."
        >
          <BotaoLink href={google} target="_blank" rel="noreferrer" variante="secundario" tamanho="sm">
            Abrir no Google Agenda <IcoExterno />
          </BotaoLink>
        </Passo>
        <Passo titulo="Outlook" texto="Adicionar calendário → Assinar da Web (ou “Da Internet”) → cole o link copiado acima. O Outlook busca mudanças mais ou menos de hora em hora." />
      </div>

      <div className="rounded-xl bg-ia-nevoa p-4">
        <p className="text-[0.95rem] text-ia-petroleo">Mudança demorando para aparecer?</p>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[0.8125rem] text-ia-apoio marker:text-ia-meta">
          <li>
            <strong className="font-medium text-ia-corpo">Google Agenda</strong> busca agendas por link só a cada 12 a 24 horas, e não dá para forçar. Não adianta remover e
            adicionar de novo. Se você precisa ver mudanças rápido, use o Calendário da Apple ou abra esta agenda no site.
          </li>
          <li>
            <strong className="font-medium text-ia-corpo">Calendário da Apple</strong> segue o “Obter Dados” que você escolheu (veja acima). Em Modo de Pouca Energia o iPhone
            pode atrasar.
          </li>
          <li>A agenda aqui no site está sempre atualizada.</li>
        </ul>
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

function Passo({ titulo, selo, texto, children }: { titulo: string; selo?: string; texto: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ia-regua p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-display font-semibold text-ia-petroleo">
          {titulo}
          {selo && <span className="rounded-full bg-ia-nevoa px-2 py-0.5 font-sans text-[0.7rem] font-normal text-ia-apoio">{selo}</span>}
        </p>
        <p className="mt-1 max-w-prose text-pretty text-[0.8125rem] text-ia-apoio">{texto}</p>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
