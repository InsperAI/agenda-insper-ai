import type { ReactNode } from "react";

/** Rótulo + controle + erro, empilhados. O controle usa a classe `.campo`. */
export default function Campo({
  id,
  rotulo,
  dica,
  erro,
  opcional,
  children,
  className = "",
}: {
  id: string;
  rotulo: string;
  dica?: string;
  erro?: string | null;
  opcional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="flex items-baseline justify-between text-[0.8125rem] text-ia-apoio">
        <span>{rotulo}</span>
        {opcional && <span className="text-ia-meta">opcional</span>}
      </label>
      {children}
      {erro ? (
        <p className="text-[0.8125rem] text-perigo" role="alert">
          {erro}
        </p>
      ) : dica ? (
        <p className="text-[0.8125rem] text-ia-meta">{dica}</p>
      ) : null}
    </div>
  );
}
