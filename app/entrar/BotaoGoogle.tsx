"use client";

import { useState } from "react";
import { IcoGoogle } from "@/components/ui/Icones";
import { supabaseNavegador } from "@/lib/supabase/client";

export default function BotaoGoogle({ next }: { next: string }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar() {
    setCarregando(true);
    setErro(null);
    const supabase = supabaseNavegador();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setErro(error.message);
      setCarregando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={entrar}
        disabled={carregando}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-ia-regua bg-ia-papel px-5 font-display text-[0.95rem] font-semibold text-ia-petroleo transition-colors hover:bg-ia-nevoa disabled:opacity-60"
      >
        <IcoGoogle />
        {carregando ? "Abrindo o Google…" : "Entrar com Google"}
      </button>
      {erro && (
        <p role="alert" className="mt-3 text-[0.875rem] text-perigo">
          {erro}
        </p>
      )}
    </>
  );
}
