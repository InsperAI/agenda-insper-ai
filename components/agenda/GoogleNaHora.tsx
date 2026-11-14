"use client";

import { useCallback, useMemo, useState } from "react";
import Aviso from "@/components/ui/Aviso";
import Botao from "@/components/ui/Botao";
import { IcoChecar } from "@/components/ui/Icones";
import { ehFalhaDeRede, SEM_CONEXAO } from "@/lib/erros";
import { supabaseNavegador } from "@/lib/supabase/client";

type Props = { membroId: string; emailLogin: string; inscricao: { email: string } | null };

/** Domínios que sabemos não ser Google (o login por código existe por causa deles). */
const NAO_GOOGLE = /@(al\.insper\.edu\.br|insper\.edu\.br|insperai\.com|icloud\.com|me\.com|mac\.com|outlook\.com|hotmail\.com|live\.com)$/i;

/**
 * "Google Agenda · na hora" (0014): a conta da Insper AI põe cada evento direto
 * na sua agenda do Google, como convite, segundos depois de alguém salvar.
 */
export default function GoogleNaHora({ membroId, emailLogin, inscricao: inicial }: Props) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const [inscricao, setInscricao] = useState(inicial);
  const [email, setEmail] = useState(inicial?.email ?? (NAO_GOOGLE.test(emailLogin) ? "" : emailLogin));
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);

  const valido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const pareceNaoGoogle = NAO_GOOGLE.test(email.trim());

  async function ativar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setOcupado(true);
    const limpo = email.trim().toLowerCase();
    const { error } = await sb.from("google_inscricoes").upsert({ member_id: membroId, email: limpo }, { onConflict: "member_id" });
    setOcupado(false);
    if (error) return setAviso(ehFalhaDeRede(error.message) ? SEM_CONEXAO : "Não deu para ativar. Tente de novo.");
    setInscricao({ email: limpo });
    setAviso("Ativado. Os eventos começam a aparecer no seu Google Agenda em instantes.");
  }

  async function desativar() {
    setOcupado(true);
    const { error } = await sb.from("google_inscricoes").delete().eq("member_id", membroId);
    setOcupado(false);
    if (error) return setAviso(ehFalhaDeRede(error.message) ? SEM_CONEXAO : "Não deu para desativar. Tente de novo.");
    setInscricao(null);
    setAviso("Desativado. Os eventos saem do seu Google Agenda em instantes.");
  }

  return (
    <section className="rounded-xl border border-ia-regua p-4">
      <p className="flex flex-wrap items-center gap-2 font-display font-semibold text-ia-petroleo">
        Google Agenda · na hora
        <span className="rounded-full bg-ia-nevoa px-2 py-0.5 font-sans text-[0.7rem] font-normal text-ia-apoio">Recomendado para quem usa Google</span>
      </p>
      <p className="mt-1 max-w-prose text-pretty text-[0.8125rem] text-ia-apoio">
        Cada evento entra direto no seu Google Agenda, como convite da Insper AI, segundos depois de alguém criar ou mudar. Funciona no celular e no computador,
        sem precisar assinar link. Ninguém recebe e-mail e ninguém vê quem mais foi convidado.
      </p>

      {inscricao ? (
        <div className="mt-3 flex flex-col gap-3">
          <p className="flex items-center gap-2 text-[0.875rem] text-ia-corpo">
            <IcoChecar /> Ativo para <strong className="font-medium">{inscricao.email}</strong>
          </p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[0.8125rem] text-ia-apoio marker:text-ia-meta">
            <li>Já tinha assinado o link no Google Agenda? Pode remover aquela agenda: ela para de repetir os eventos que chegam por aqui.</li>
            <li>
              Não apareceu nada em alguns minutos? No Google Agenda, vá em Configurações → Eventos de convites → “Adicionar convites à minha agenda” e escolha “De todos”.
            </li>
          </ul>
          <div>
            <Botao variante="fantasma" tamanho="sm" onClick={desativar} disabled={ocupado}>
              {ocupado ? "Desativando…" : "Desativar"}
            </Botao>
          </div>
        </div>
      ) : (
        <form onSubmit={ativar} className="mt-3 flex flex-col gap-2">
          <label htmlFor="google-email" className="text-[0.8125rem] text-ia-apoio">
            E-mail da sua conta Google (Gmail ou @insperai.com.br)
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="google-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              className="campo flex-1"
              placeholder="voce@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Botao type="submit" variante="primario" disabled={!valido || ocupado}>
              {ocupado ? "Ativando…" : "Ativar"}
            </Botao>
          </div>
          {pareceNaoGoogle && (
            <p className="text-[0.8125rem] text-perigo">Esse e-mail não parece ser de uma conta Google. Use o link abaixo no Calendário da Apple ou no Outlook.</p>
          )}
        </form>
      )}
      <Aviso mensagem={aviso} aoFechar={fecharAviso} />
    </section>
  );
}
