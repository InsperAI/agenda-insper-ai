import { NOME_CLIENTE, resumirBusca, type BuscaFeed } from "@/lib/feed";

type Props = { buscas: BuscaFeed[]; agora: Date };

/** "Google Agenda · buscou há 9 h · a cada 12 h": mostra se o calendário está mesmo vindo buscar mudanças. */
export default function BuscasFeed({ buscas, agora }: Props) {
  const apps = buscas.filter((b) => b.cliente !== "navegador").toSorted((a, b) => Date.parse(b.ultima_em) - Date.parse(a.ultima_em));
  if (apps.length === 0) return null;

  return (
    <section className="rounded-xl border border-ia-regua p-4">
      <p className="t-meta mb-2">Seus calendários conectados</p>
      <ul className="flex flex-col gap-1.5 text-[0.875rem] text-ia-apoio">
        {apps.map((b) => {
          const { quando, media } = resumirBusca(b, agora);
          return (
            <li key={b.cliente}>
              <span className="font-medium text-ia-corpo">{NOME_CLIENTE[b.cliente]}</span> · buscou {quando}
              {media && <> · em média {media}</>}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[0.8125rem] text-ia-meta">O que mudou depois da última busca só aparece no seu calendário na próxima.</p>
    </section>
  );
}
