import BrandMark from "./BrandMark";

/** Símbolo + "Insper AI" na fonte de display: a assinatura das telas públicas. */
export default function MarcaInsper({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark className="h-6 w-[28px] shrink-0" />
      <span className="font-display text-[1.0625rem] font-semibold tracking-[-0.03em] text-ia-petroleo">Insper AI</span>
    </span>
  );
}
