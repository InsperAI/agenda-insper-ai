import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

/** Ícones de traço 1.5 em caixa 16 × 16. Sempre decorativos (aria-hidden). */
function base(p: P): P {
  return {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...p,
  };
}

export const IcoEsquerda = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 3L5 8l5 5" />
  </svg>
);
export const IcoDireita = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 3l5 5-5 5" />
  </svg>
);
export const IcoMais = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 3v10M3 8h10" />
  </svg>
);
export const IcoFechar = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);
export const IcoLupa = (p: P) => (
  <svg {...base(p)}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L14 14" />
  </svg>
);
export const IcoLocal = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 14s4.5-4 4.5-7.5a4.5 4.5 0 10-9 0C3.5 10 8 14 8 14z" />
    <circle cx="8" cy="6.5" r="1.5" />
  </svg>
);
export const IcoLink = (p: P) => (
  <svg {...base(p)}>
    <path d="M6.5 9.5l3-3" />
    <path d="M7 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1" />
    <path d="M9 11.5l-1 1A2.5 2.5 0 014.5 9l1-1" />
  </svg>
);
export const IcoRepetir = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 7a5.5 5.5 0 019.5-3.5L13.5 5" />
    <path d="M13.5 9a5.5 5.5 0 01-9.5 3.5L2.5 11" />
    <path d="M13.5 2v3h-3M2.5 14v-3h3" />
  </svg>
);
export const IcoBaixar = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10" />
  </svg>
);
export const IcoLixeira = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 4.5h10M6.5 2.5h3M5 4.5l.5 8.5h5l.5-8.5" />
  </svg>
);
export const IcoLapis = (p: P) => (
  <svg {...base(p)}>
    <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z" />
  </svg>
);
export const IcoRelogio = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 5v3l2 1.5" />
  </svg>
);
export const IcoCalendario = (p: P) => (
  <svg {...base(p)}>
    <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
    <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
  </svg>
);
export const IcoCopiar = (p: P) => (
  <svg {...base(p)}>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 5.5v-2a1 1 0 00-1-1h-6a1 1 0 00-1 1v6a1 1 0 001 1h2" />
  </svg>
);
export const IcoChecar = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8.5l3 3 7-7" />
  </svg>
);
export const IcoPessoa = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="5.5" r="2.75" />
    <path d="M2.75 14a5.25 5.25 0 0110.5 0" />
  </svg>
);
export const IcoExterno = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 3h4v4M13 3L7.5 8.5M11 9.5V12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1h2.5" />
  </svg>
);

/** Logo do Google, colorido, para o botão de entrar. */
export const IcoGoogle = (p: P) => (
  <svg width={18} height={18} viewBox="0 0 48 48" aria-hidden="true" {...p}>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 019.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 000 24c0 3.9.9 7.5 2.6 10.7l7.8-6z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.9l-7.8 6C6.5 42.6 14.6 48 24 48z" />
  </svg>
);
