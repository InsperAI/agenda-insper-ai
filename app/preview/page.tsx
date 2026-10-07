import { notFound } from "next/navigation";
import Galeria from "./Galeria";

/**
 * Galeria visual dos componentes com dados de exemplo, SEM banco nem login.
 * Só existe em desenvolvimento (`npm run dev`); em produção devolve 404.
 */
export default function PaginaPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Galeria />;
}
