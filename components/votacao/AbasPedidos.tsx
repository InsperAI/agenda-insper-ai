import Link from "next/link";

export type Aba = "abertos" | "encerrados";

/**
 * Abertos / Encerrados como links (a aba fica na URL, então dá para voltar e
 * compartilhar). Mesmo desenho do controle segmentado do resto do app.
 */
export default function AbasPedidos({ ativa, abertos, encerrados }: { ativa: Aba; abertos: number; encerrados: number }) {
  const abas: { id: Aba; rotulo: string; total: number; href: string }[] = [
    { id: "abertos", rotulo: "Abertos", total: abertos, href: "/disponibilidade" },
    { id: "encerrados", rotulo: "Encerrados", total: encerrados, href: "/disponibilidade?aba=encerrados" },
  ];
  return (
    <nav aria-label="Pedidos" className="inline-flex h-10 items-center self-start rounded-full border border-ia-regua bg-ia-nevoa p-1">
      {abas.map((a) => {
        const ativo = a.id === ativa;
        return (
          <Link
            key={a.id}
            href={a.href}
            replace
            scroll={false}
            aria-current={ativo ? "page" : undefined}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[0.875rem] transition-colors duration-150 ${
              ativo ? "bg-ia-papel text-ia-petroleo shadow-sm" : "text-ia-apoio hover:text-ia-petroleo"
            }`}
          >
            {a.rotulo}
            <span className={`tabular-nums ${ativo ? "text-ia-apoio" : "text-ia-meta"}`}>{a.total}</span>
          </Link>
        );
      })}
    </nav>
  );
}
