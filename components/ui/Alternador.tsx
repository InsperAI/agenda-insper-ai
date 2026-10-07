"use client";

/** Interruptor acessível (role="switch"). */
export default function Alternador({
  ligado,
  aoMudar,
  rotulo,
  id,
  desabilitado,
}: {
  ligado: boolean;
  aoMudar: (v: boolean) => void;
  rotulo: string;
  id?: string;
  desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={() => aoMudar(!ligado)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${
        ligado ? "bg-ia-cobalto" : "bg-ia-canvas"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          ligado ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
