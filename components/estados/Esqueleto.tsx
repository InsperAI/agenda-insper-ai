/**
 * Peças dos esqueletos de carregamento (loading.tsx). O pulso só roda para
 * quem não pediu menos movimento no sistema.
 */
export function Esqueleto({ rotulo, className = "", children }: { rotulo: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className={`flex motion-safe:animate-pulse flex-col ${className}`}>
      <span className="sr-only">{rotulo}</span>
      {children}
    </div>
  );
}

export function Bloco({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`rounded-lg bg-ia-nevoa ${className}`} />;
}

/** Título + linha de apoio, como o cabeçalho das páginas (t-h2 + t-apoio). */
export function CabecalhoEsqueleto({ apoio = true }: { apoio?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <Bloco className="h-8 w-52" />
      {apoio && <Bloco className="h-4 w-full max-w-md" />}
    </div>
  );
}

/** Lista em cartão com divisórias, como as de Disponibilidade e Membros. */
export function ListaEsqueleto({ linhas = 4 }: { linhas?: number }) {
  return (
    <div aria-hidden className="divide-y divide-ia-regua overflow-hidden rounded-xl border border-ia-regua">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 px-4 py-3">
          <Bloco className="h-4 w-2/3 max-w-xs" />
          <Bloco className="h-3 w-1/2 max-w-[14rem]" />
        </div>
      ))}
    </div>
  );
}
