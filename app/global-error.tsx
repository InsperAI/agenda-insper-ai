"use client";

import "./globals.css";

/**
 * Último recurso: o layout raiz falhou, então nada dele (fontes, tema) está
 * aqui. Fica com o mínimo — html/body próprios, as cores do sistema.
 */
export default function ErroGlobal({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-svh flex-col items-start justify-center gap-3 bg-ia-papel px-6 sm:px-10">
        <title>Algo deu errado · Agenda Insper AI</title>
        <h1 className="text-[1.75rem] font-semibold text-ia-petroleo">Algo deu errado</h1>
        <p className="max-w-md text-ia-apoio">A agenda não conseguiu abrir. Tente de novo em instantes; se continuar, avise a diretoria.</p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-3 rounded-full bg-ia-cobalto px-5 py-2.5 text-[0.9rem] font-medium text-white hover:opacity-90"
        >
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
