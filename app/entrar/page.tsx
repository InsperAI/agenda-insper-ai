import type { Metadata } from "next";
import Link from "next/link";
import BrandMark from "@/components/ui/BrandMark";
import { destinoSeguro } from "@/lib/url";
import BotaoGoogle from "./BotaoGoogle";

export const metadata: Metadata = { title: "Entrar" };

const ERROS: Record<string, string> = {
  auth: "Não foi possível concluir o login com o Google. Tente de novo.",
};

export default async function Entrar({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const { next, erro } = await searchParams;
  const destino = destinoSeguro(next);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <BrandMark className="h-10 w-12" />
        <p className="t-meta mt-6">Insper AI</p>
        <h1 className="t-h2 mt-2">Agenda</h1>
        <p className="t-apoio mt-3">Eventos, aulas, reuniões e prazos da Insper AI, em um só lugar. Só membros cadastrados entram.</p>

        <div className="mt-8 w-full">
          <BotaoGoogle next={destino} />
        </div>

        {erro && ERROS[erro] && (
          <p role="alert" className="mt-4 rounded-lg bg-perigo-fundo px-3 py-2 text-[0.875rem] text-perigo">
            {ERROS[erro]}
          </p>
        )}

        <Link href="/privacidade" className="t-meta mt-10 underline underline-offset-4 hover:text-ia-petroleo">
          Privacidade
        </Link>
      </div>
    </main>
  );
}
