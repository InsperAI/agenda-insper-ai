/**
 * Esqueleto mostrado na hora ao trocar de aba, enquanto o servidor busca os
 * dados (a barra de cima e a de abas continuam, porque ficam no layout).
 */
export default function Carregando() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="flex animate-pulse flex-col gap-4">
      <div className="h-9 w-56 rounded-lg bg-ia-nevoa" />
      <div className="flex gap-2">
        <div className="h-8 w-24 rounded-full bg-ia-nevoa" />
        <div className="h-8 w-20 rounded-full bg-ia-nevoa" />
        <div className="h-8 w-24 rounded-full bg-ia-nevoa" />
      </div>
      <div className="h-[22rem] rounded-xl bg-ia-nevoa" />
    </div>
  );
}
