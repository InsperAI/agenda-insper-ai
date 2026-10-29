import type { Metadata } from "next";
import Link from "next/link";
import CenaSemana from "@/components/entrar/CenaSemana";
import MarcaInsper from "@/components/ui/MarcaInsper";
import { destinoSeguro } from "@/lib/url";
import OpcoesEntrar from "./OpcoesEntrar";

export const metadata: Metadata = { title: "Entrar" };

const ERROS: Record<string, string> = {
  auth: "Não foi possível concluir o login com o Google. Tente de novo.",
};

export default async function Entrar({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const { next, erro } = await searchParams;
  const destino = destinoSeguro(next);

  return (
    <main className="grid flex-1 grid-cols-1 grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:grid-rows-1">
      {/* Cena: a semana se preenchendo. No celular fica abaixo do formulário. */}
      <section className="order-2 flex flex-col justify-start gap-8 lg:justify-center border-t border-ia-regua bg-ia-nevoa px-6 py-10 sm:px-10 lg:order-1 lg:border-t-0 lg:border-r lg:px-14 lg:py-16">
        <div className="max-w-md">
          <h2 className="font-display text-[clamp(1.5rem,1.1rem+1.4vw,2.25rem)] leading-[1.08] font-semibold tracking-[-0.035em] text-ia-petroleo">
            A semana inteira da Insper AI, num lugar só.
          </h2>
          <p className="t-apoio mt-3">Reuniões, aulas, prazos e eventos, e cada um vê o que é do seu nível. Conecte e tudo aparece no seu Google Agenda.</p>
        </div>
        <div className="w-full max-w-xl rounded-2xl border border-ia-regua bg-ia-papel p-4 shadow-pop sm:p-5">
          <CenaSemana />
        </div>
      </section>

      <section className="order-1 flex flex-col px-6 py-8 sm:px-10 lg:order-2 lg:px-14">
        <MarcaInsper />
        <div className="flex flex-1 flex-col justify-center py-10 lg:py-0">
          <div className="w-full max-w-sm">
            <h1 className="t-h1">Entrar na agenda</h1>
            <p className="t-apoio mt-3">Entre com a conta Google ou com um código no seu e-mail. Ainda não tem acesso? Entre mesmo assim e peça por lá; um admin aprova.</p>

            <div className="mt-8">
              <OpcoesEntrar next={destino} />
            </div>

            {erro && ERROS[erro] && (
              <p role="alert" className="mt-4 rounded-lg bg-perigo-fundo px-3 py-2 text-[0.875rem] text-perigo">
                {ERROS[erro]}
              </p>
            )}
          </div>
        </div>
        <Link href="/privacidade" className="self-start text-[0.8125rem] text-ia-meta underline-offset-4 hover:text-ia-petroleo hover:underline">
          Política de privacidade
        </Link>
      </section>
    </main>
  );
}
