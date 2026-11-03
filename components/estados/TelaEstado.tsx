import MarcaInsper from "@/components/ui/MarcaInsper";

/**
 * Tela de "não encontrado" / "deu errado". Dentro do app (barra no topo) vai
 * sem marca; fora dele (rota solta, erro no layout) leva a marca Insper AI.
 */
export default function TelaEstado({
  titulo,
  texto,
  detalhe,
  comMarca = false,
  children,
}: {
  titulo: string;
  texto: string;
  /** Linha pequena para quem for reportar (ex.: código do erro). */
  detalhe?: string;
  comMarca?: boolean;
  children?: React.ReactNode;
}) {
  const conteudo = (
    <div className="flex max-w-md flex-col items-start gap-3">
      <h1 className="t-h2 text-balance">{titulo}</h1>
      <p className="t-apoio text-pretty">{texto}</p>
      {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
      {detalhe && <p className="mt-4 text-[0.75rem] text-ia-meta tabular-nums">{detalhe}</p>}
    </div>
  );

  if (!comMarca) return <div className="wrap-estreito py-10">{conteudo}</div>;
  return (
    <main className="flex flex-1 flex-col px-6 py-8 sm:px-10">
      <MarcaInsper />
      <div className="flex flex-1 flex-col justify-center py-10">{conteudo}</div>
    </main>
  );
}
