import { iconeApp } from "@/lib/og";

/** Ícones PNG do manifest: /icone/192, /icone/512 e /icone/maskable (Android recorta em círculo). */
const TAMANHOS: Record<string, { px: number; margem?: number }> = {
  "192": { px: 192 },
  "512": { px: 512 },
  maskable: { px: 512, margem: 0.3 },
};

export async function GET(_req: Request, { params }: { params: Promise<{ tamanho: string }> }) {
  const t = TAMANHOS[(await params).tamanho];
  if (!t) return new Response("Não encontrado", { status: 404 });
  const imagem = iconeApp(t.px, t.margem);
  imagem.headers.set("Cache-Control", "public, max-age=604800, immutable");
  return imagem;
}
