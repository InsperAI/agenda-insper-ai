"use client";

import { useState } from "react";
import BotaoGoogle from "./BotaoGoogle";
import EntrarComEmail from "./EntrarComEmail";

/** Google em destaque; e-mail com código para quem não tem conta Google. */
export default function OpcoesEntrar({ next }: { next: string }) {
  const [comEmail, setComEmail] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <BotaoGoogle next={next} />
      <div className="flex items-center gap-3 text-[0.8125rem] text-ia-meta" aria-hidden>
        <span className="regua flex-1" />
        ou
        <span className="regua flex-1" />
      </div>
      {comEmail ? (
        <EntrarComEmail next={next} />
      ) : (
        <button
          type="button"
          onClick={() => setComEmail(true)}
          className="h-12 w-full rounded-full border border-ia-regua font-display text-[0.95rem] font-semibold text-ia-petroleo transition-colors hover:bg-ia-nevoa"
        >
          Entrar com e-mail (iCloud, Insper, outros)
        </button>
      )}
    </div>
  );
}
