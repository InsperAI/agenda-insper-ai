"use client";

import Botao, { BotaoIcone } from "@/components/ui/Botao";
import { IcoDireita, IcoEsquerda, IcoLupa, IcoMais } from "@/components/ui/Icones";
import Segmentado from "@/components/ui/Segmentado";
import type { Vista } from "@/lib/url";

const VISTAS: { valor: Vista; rotulo: string }[] = [
  { valor: "mes", rotulo: "Mês" },
  { valor: "semana", rotulo: "Semana" },
  { valor: "proximos", rotulo: "Próximos" },
];

export default function CabecalhoAgenda({
  vista,
  titulo,
  busca,
  carregando,
  aoMudarVista,
  aoAnterior,
  aoProximo,
  aoHoje,
  aoBuscar,
  aoNovo,
}: {
  vista: Vista;
  titulo: string;
  busca: string;
  carregando: boolean;
  aoMudarVista: (v: Vista) => void;
  aoAnterior: () => void;
  aoProximo: () => void;
  aoHoje: () => void;
  aoBuscar: (q: string) => void;
  aoNovo: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {vista !== "proximos" && (
          <div className="flex shrink-0 items-center gap-0.5">
            <BotaoIcone rotulo="Período anterior (←)" onClick={aoAnterior}>
              <IcoEsquerda />
            </BotaoIcone>
            <BotaoIcone rotulo="Próximo período (→)" onClick={aoProximo}>
              <IcoDireita />
            </BotaoIcone>
            <Botao tamanho="sm" onClick={aoHoje} title="Ir para hoje (T)" className="ml-1">
              Hoje
            </Botao>
          </div>
        )}
        <h1 className="t-h3 tabular truncate">{titulo}</h1>
        {carregando && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-ia-cobalto" role="status" aria-label="Carregando" />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative order-last basis-full sm:order-none sm:basis-auto">
          <IcoLupa className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ia-meta" />
          <input
            type="search"
            value={busca}
            onChange={(e) => aoBuscar(e.target.value)}
            placeholder="Buscar"
            aria-label="Buscar por título ou local"
            className="campo h-10 min-h-0 w-full pl-9 sm:w-52"
          />
        </label>
        <Segmentado opcoes={VISTAS} valor={vista} aoMudar={aoMudarVista} rotulo="Vista da agenda" />
        <Botao variante="primario" onClick={aoNovo} title="Novo evento (N)" aria-label="Novo evento" className="ml-auto sm:ml-0">
          <IcoMais />
          <span className="hidden sm:inline">Novo evento</span>
        </Botao>
      </div>
    </div>
  );
}
