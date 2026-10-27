"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import Botao from "@/components/ui/Botao";
import Campo from "@/components/ui/Campo";
import { CODIGO_LOGIN, EMAIL_LOGIN, limparCodigo, normalizarEmail, traduzirErroLogin } from "@/lib/login";
import { supabaseNavegador } from "@/lib/supabase/client";

/**
 * Login para quem não tem conta Google (iCloud, e-mail do Insper…): digita o
 * e-mail, recebe um código de 6 dígitos e digita o código. A lista de membros
 * continua decidindo quem entra; o código só prova que a pessoa é dona do e-mail.
 */
export default function EntrarComEmail({ next }: { next: string }) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [etapa, setEtapa] = useState<"email" | "codigo">("email");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviarCodigo(e?: FormEvent) {
    e?.preventDefault();
    const em = normalizarEmail(email);
    if (!EMAIL_LOGIN.test(em)) return setErro("Digite um e-mail válido.");
    setErro(null);
    setOcupado(true);
    const { error } = await sb.auth.signInWithOtp({ email: em, options: { shouldCreateUser: true } });
    setOcupado(false);
    if (error) return setErro(traduzirErroLogin(error.message));
    setEmail(em);
    setEtapa("codigo");
  }

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    const c = limparCodigo(codigo);
    if (!CODIGO_LOGIN.test(c)) return setErro("Digite o código que chegou no seu e-mail.");
    setErro(null);
    setOcupado(true);
    const { error } = await sb.auth.verifyOtp({ email, token: c, type: "email" });
    if (error) {
      setOcupado(false);
      return setErro(traduzirErroLogin(error.message));
    }
    router.replace(next);
    router.refresh();
  }

  if (etapa === "codigo") {
    return (
      <form onSubmit={confirmar} className="flex flex-col gap-3">
        <p className="t-apoio">
          Mandamos um código para <span className="text-ia-petroleo">{email}</span>. Pode levar um minuto; olhe também o spam.
        </p>
        <Campo id="login-codigo" rotulo="Código">
          <input
            id="login-codigo"
            className="campo text-center text-[1.25rem] tracking-[0.3em] tabular"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={12}
            autoFocus
          />
        </Campo>
        {erro && <p role="alert" className="text-[0.875rem] text-perigo">{erro}</p>}
        <Botao variante="primario" type="submit" disabled={ocupado} className="h-12 w-full">
          {ocupado ? "Entrando…" : "Entrar"}
        </Botao>
        <div className="flex justify-between text-[0.8125rem]">
          <button type="button" className="text-ia-apoio hover:text-ia-petroleo" onClick={() => (setEtapa("email"), setCodigo(""), setErro(null))}>
            Usar outro e-mail
          </button>
          <button type="button" className="text-ia-apoio hover:text-ia-petroleo disabled:opacity-50" disabled={ocupado} onClick={() => void enviarCodigo()}>
            Mandar de novo
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={enviarCodigo} className="flex flex-col gap-3">
      <Campo id="login-email" rotulo="E-mail">
        <input
          id="login-email"
          type="email"
          className="campo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@icloud.com"
          autoComplete="email"
          inputMode="email"
        />
      </Campo>
      {erro && <p role="alert" className="text-[0.875rem] text-perigo">{erro}</p>}
      <Botao type="submit" disabled={ocupado} className="h-12 w-full">
        {ocupado ? "Enviando…" : "Receber código por e-mail"}
      </Botao>
    </form>
  );
}
