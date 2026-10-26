import { ImageResponse } from "next/og";

/**
 * Imagens de prévia (Open Graph) para WhatsApp, iMessage etc. 1200 × 630,
 * fundo claro, símbolo da marca e Space Grotesk. Se a fonte não carregar,
 * cai na fonte padrão em vez de quebrar a prévia.
 */
export const TAMANHO_OG = { width: 1200, height: 630 };

const NOS: [number, number, number][] = [
  [150, 230, 27],
  [515, 65, 48],
  [850, 135, 39],
  [850, 635, 32],
  [180, 635, 34],
];
const ARESTAS: [number, number, number, number, number][] = [
  [150, 230, 850, 635, 36],
  [180, 635, 515, 65, 51],
  [515, 65, 850, 635, 40],
  [850, 135, 850, 635, 34],
];

/** Space Grotesk 600 do Google Fonts, só com os caracteres usados (TTF, que o satori lê). */
async function carregarFonte(texto: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600&text=${encodeURIComponent(texto)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

function Marca() {
  return (
    <svg width="66" height="56" viewBox="123 17 766 652" fill="none">
      <defs>
        <linearGradient id="g" gradientUnits="userSpaceOnUse" x1="123" y1="669" x2="889" y2="17">
          <stop offset="0" stopColor="#2074DE" />
          <stop offset="0.5" stopColor="#5A9CE9" />
          <stop offset="1" stopColor="#9AC8F4" />
        </linearGradient>
      </defs>
      {ARESTAS.map(([x1, y1, x2, y2, w], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#g)" strokeWidth={w} strokeLinecap="round" />
      ))}
      {NOS.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="url(#g)" />
      ))}
    </svg>
  );
}

/** Mini grade de disponibilidade, decorativa, à direita do cartão. */
function Grade() {
  const forca = [
    [0, 0.3, 0.7, 1, 1, 0.6, 0],
    [0.2, 0.5, 1, 1, 0.8, 0.3, 0],
    [0, 0, 0.4, 0.9, 1, 1, 0.5],
    [0.1, 0.4, 0.6, 0.6, 0.3, 0, 0],
    [0, 0.2, 0.8, 1, 0.7, 0.2, 0],
  ];
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {forca.map((coluna, c) => (
        <div key={c} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {coluna.map((f, l) => (
            <div key={l} style={{ width: 46, height: 34, borderRadius: 6, background: f ? `rgba(10,108,241,${0.12 + f * 0.78})` : "#f1f4f8" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export async function cartaoOG({ rotulo, titulo, detalhe, comGrade = false }: { rotulo: string; titulo: string; detalhe: string; comGrade?: boolean }) {
  const fonte = await carregarFonte(`${rotulo}${titulo}${detalhe}Insper AI`);
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff", padding: 72, fontFamily: fonte ? "Space Grotesk" : undefined }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, paddingRight: comGrade ? 48 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Marca />
            <span style={{ fontSize: 34, color: "#011e42", letterSpacing: -1 }}>Insper AI</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span style={{ fontSize: 28, color: "#0a6cf1" }}>{rotulo}</span>
            <span style={{ fontSize: titulo.length > 40 ? 58 : 72, color: "#011e42", lineHeight: 1.05, letterSpacing: -2 }}>{titulo}</span>
            <span style={{ fontSize: 30, color: "#5a6472" }}>{detalhe}</span>
          </div>
        </div>
        {comGrade && (
          <div style={{ display: "flex", alignItems: "center" }}>
            <Grade />
          </div>
        )}
      </div>
    ),
    { ...TAMANHO_OG, fonts: fonte ? [{ name: "Space Grotesk", data: fonte, weight: 600, style: "normal" }] : undefined },
  );
}
