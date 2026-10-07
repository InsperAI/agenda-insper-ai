import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type Variante = "primario" | "secundario" | "fantasma" | "perigo";
export type Tamanho = "sm" | "md";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-ia-petroleo text-ia-papel hover:bg-ia-cobalto",
  secundario: "border border-ia-regua bg-ia-papel text-ia-petroleo hover:bg-ia-nevoa",
  fantasma: "text-ia-apoio hover:bg-ia-nevoa hover:text-ia-petroleo",
  perigo: "text-perigo hover:bg-perigo-fundo",
};
const TAMANHOS: Record<Tamanho, string> = {
  sm: "h-8 gap-1.5 px-3 text-[0.8125rem]",
  md: "h-10 gap-2 px-4 text-[0.9rem]",
};

export function classesBotao(variante: Variante = "secundario", tamanho: Tamanho = "md", extra = ""): string {
  return `inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-display font-semibold tracking-[-0.01em] transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${extra}`;
}

type PropsBotao = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; tamanho?: Tamanho };

export default function Botao({ variante = "secundario", tamanho = "md", className = "", type = "button", ...props }: PropsBotao) {
  return <button type={type} className={classesBotao(variante, tamanho, className)} {...props} />;
}

type PropsBotaoLink = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  variante?: Variante;
  tamanho?: Tamanho;
  children: ReactNode;
};

export function BotaoLink({ href, variante = "secundario", tamanho = "md", className = "", children, ...rest }: PropsBotaoLink) {
  const externo = /^https?:\/\//.test(href) || href.startsWith("webcal:");
  if (externo) {
    return (
      <a href={href} className={classesBotao(variante, tamanho, className)} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classesBotao(variante, tamanho, className)} {...rest}>
      {children}
    </Link>
  );
}

/** Botão redondo só com ícone. `rotulo` vira aria-label e title. */
export function BotaoIcone({
  rotulo,
  className = "",
  tamanho = "md",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> & { rotulo: string; tamanho?: Tamanho }) {
  const dim = tamanho === "sm" ? "h-8 w-8" : "h-9 w-9";
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-ia-apoio transition-colors hover:bg-ia-nevoa hover:text-ia-petroleo disabled:pointer-events-none disabled:opacity-50 ${dim} ${className}`}
      {...props}
    />
  );
}
