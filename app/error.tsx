"use client";

import TelaErro from "@/components/estados/TelaErro";

/** Erro fora do app logado (entrar, link curto, privacidade…). */
export default function Erro({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <TelaErro comMarca error={error} tentarDeNovo={unstable_retry} />;
}
