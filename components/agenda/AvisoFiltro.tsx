import Botao from "@/components/ui/Botao";
import { TODAS_CATEGORIAS } from "@/lib/categorias";
import type { Categoria } from "@/lib/supabase/tipos";

/**
 * Mês e Semana não têm "lista vazia": a grade aparece em branco. Quando o
 * branco vem da busca ou dos filtros, e não da agenda, isto explica e desfaz.
 */
export default function AvisoFiltro({
  filtros,
  busca,
  vazio,
  aoMostrarTodas,
}: {
  filtros: Set<Categoria>;
  busca: string;
  vazio: boolean;
  aoMostrarTodas: () => void;
}) {
  const nenhumaCategoria = filtros.size === 0;
  const termo = busca.trim();
  if (!nenhumaCategoria && !(vazio && termo)) return null;

  const texto = nenhumaCategoria
    ? "Todas as categorias estão ocultas, por isso a agenda está vazia."
    : filtros.size < TODAS_CATEGORIAS.length
      ? `Nada com “${termo}” neste período, nas categorias visíveis.`
      : `Nada com “${termo}” neste período.`;

  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-ia-nevoa py-2 pr-2 pl-3 text-[0.875rem] text-ia-petroleo">
      <span className="min-w-0 break-words">{texto}</span>
      {nenhumaCategoria && (
        <Botao tamanho="sm" variante="fantasma" onClick={aoMostrarTodas}>
          Mostrar todas
        </Botao>
      )}
    </div>
  );
}
