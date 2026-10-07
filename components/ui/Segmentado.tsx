"use client";

/** Controle segmentado: um grupo de botões em que exatamente um está ativo. */
export default function Segmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
  className = "",
}: {
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  aoMudar: (v: T) => void;
  rotulo: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className={`inline-flex h-10 items-center rounded-full border border-ia-regua bg-ia-nevoa p-1 ${className}`}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => aoMudar(o.valor)}
            className={`h-8 rounded-full px-3.5 text-[0.875rem] transition-colors duration-150 ${
              ativo ? "bg-ia-papel text-ia-petroleo shadow-sm" : "text-ia-apoio hover:text-ia-petroleo"
            }`}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}
