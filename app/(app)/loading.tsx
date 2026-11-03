import { CabecalhoEsqueleto, Esqueleto, ListaEsqueleto } from "@/components/estados/Esqueleto";

/**
 * Esqueleto genérico ao trocar de aba (a barra de cima e a de abas continuam,
 * porque ficam no layout). Cada aba com cara própria tem o seu loading.tsx.
 */
export default function Carregando() {
  return (
    <Esqueleto rotulo="Carregando…" className="wrap-estreito gap-6">
      <CabecalhoEsqueleto />
      <ListaEsqueleto />
    </Esqueleto>
  );
}
