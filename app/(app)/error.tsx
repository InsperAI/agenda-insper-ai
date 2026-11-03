"use client";

import TelaErro from "@/components/estados/TelaErro";

/** Erro numa aba do app: a barra e as abas continuam, só o conteúdo troca. */
export default function ErroApp({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <TelaErro error={error} tentarDeNovo={unstable_retry} />;
}
