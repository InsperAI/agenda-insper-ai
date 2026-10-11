import type { Metadata } from "next";
import Link from "next/link";
import BrandMark from "@/components/ui/BrandMark";

export const metadata: Metadata = { title: "Privacidade" };

// Exigida pelo Google para publicar o app OAuth. Pública (fora de PROTEGIDAS no proxy).
const SECOES: { titulo: string; texto: string }[] = [
  {
    titulo: "O que guardamos",
    texto:
      "Ao entrar com o Google, recebemos apenas seu nome, e-mail e foto de perfil (escopos openid, email e profile). Na lista de membros guardamos nome, e-mail, cargo e nível de acesso. Se você pedir acesso, guardamos o nome, o e-mail, o cargo e o nível do pedido até um admin aprovar ou recusar; recusado ou cancelado, o pedido é apagado. Nos eventos registramos quem criou e quem alterou cada um.",
  },
  {
    titulo: "Para que usamos",
    texto:
      "Só para identificar você, liberar o acesso à agenda se o seu e-mail estiver na lista de membros, mostrar só os eventos liberados para o seu nível (diretoria, membros ou trainees) e mostrar aos colegas quem fez cada alteração. Não usamos os dados para publicidade, não vendemos e não compartilhamos com terceiros.",
  },
  {
    titulo: "Onde ficam",
    texto:
      "Os dados ficam no Supabase (banco de dados e login) e o site roda na Vercel. Usamos só dois cookies: o de sessão, necessário para manter você conectado, e um que lembra o tema escolhido (claro ou escuro).",
  },
  {
    titulo: "Feed de calendário",
    texto:
      "Cada membro tem um link de feed .ics pessoal e secreto. Quem tiver o link consegue ler a agenda; se ele vazar, gere um novo em Assinar.",
  },
  {
    titulo: "Seus direitos",
    texto:
      "Você pode pedir a correção ou a exclusão dos seus dados a qualquer momento falando com a diretoria da Insper AI. Ao sair da lista de membros, você perde o acesso à agenda.",
  },
];

export default function Privacidade() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-xl flex-col">
        <BrandMark className="h-10 w-12" />
        <p className="t-meta mt-6">Insper AI</p>
        <h1 className="t-h2 mt-2">Política de privacidade</h1>
        <p className="t-apoio mt-3">
          A Agenda Insper AI é uma ferramenta interna da Insper AI para organizar eventos, aulas, reuniões e prazos. Esta página explica quais dados o app usa.
        </p>

        {SECOES.map(({ titulo, texto }) => (
          <section key={titulo} className="mt-8">
            <h2 className="font-display text-[1.05rem] font-semibold text-ia-petroleo">{titulo}</h2>
            <p className="t-apoio mt-2">{texto}</p>
          </section>
        ))}

        <Link href="/entrar" className="t-apoio mt-10 underline underline-offset-4 hover:text-ia-petroleo">
          Voltar para a agenda
        </Link>
      </div>
    </main>
  );
}
