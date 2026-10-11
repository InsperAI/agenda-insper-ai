"use client";

import { useMemo, useState } from "react";
import Botao from "@/components/ui/Botao";
import { lerListaMembros, traduzirErroMembro } from "@/lib/membros";
import { ROTULO_NIVEL } from "@/lib/niveis";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { MembroRow } from "@/lib/supabase/tipos";

const EXEMPLO = "ana@al.insper.edu.br, Ana Souza, membro\nbia@gmail.com, Bia Lima, trainee";

/**
 * Cadastro em lote: cola linhas `email, nome, nível[, cargo]` (vírgula, `;` ou
 * tab de planilha). Quem já está cadastrado é pulado, sem erro.
 */
export default function ImportarMembros({ aoAdicionar, aoAvisar }: { aoAdicionar: (novos: MembroRow[]) => void; aoAvisar: (msg: string) => void }) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const { validos, invalidos } = useMemo(() => lerListaMembros(texto), [texto]);

  async function importar() {
    if (validos.length === 0) return;
    setOcupado(true);
    const { data, error } = await sb
      .from("members")
      .upsert(validos, { onConflict: "email", ignoreDuplicates: true })
      .select("*");
    setOcupado(false);
    if (error) return aoAvisar(traduzirErroMembro(error.message));

    const inseridos = data ?? [];
    const pulados = validos.length - inseridos.length;
    aoAdicionar(inseridos);
    setTexto("");
    aoAvisar(
      `${inseridos.length} ${inseridos.length === 1 ? "pessoa adicionada" : "pessoas adicionadas"}` +
        (pulados > 0 ? ` · ${pulados} já ${pulados === 1 ? "estava cadastrada" : "estavam cadastradas"}` : ""),
    );
  }

  return (
    <details className="group rounded-xl border border-ia-regua">
      <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-display font-semibold text-ia-petroleo [&::-webkit-details-marker]:hidden">
        Colar uma lista
        <span className="text-[0.8125rem] font-normal text-ia-meta group-open:hidden">várias pessoas de uma vez</span>
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <p className="t-apoio">
          Uma pessoa por linha: <span className="font-mono text-[0.8125rem]">e-mail, nome, nível, cargo</span>. Nível é diretoria, membro ou trainee (vazio = membro); cargo é opcional. Dá para copiar
          as colunas direto de uma planilha. Quem já está cadastrado é pulado; para mudar o nível de alguém, use o lápis na lista.
        </p>
        <textarea
          aria-label="Lista de pessoas"
          className="campo min-h-36 font-mono text-[0.8125rem]"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={EXEMPLO}
          spellCheck={false}
        />

        {(validos.length > 0 || invalidos.length > 0) && (
          <div className="flex flex-col gap-2 text-[0.8125rem]">
            {validos.length > 0 && (
              <p className="text-ia-apoio">
                Prontas para adicionar: {validos.length} ({contarPorNivel(validos)})
              </p>
            )}
            {invalidos.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-lg bg-perigo-fundo px-3 py-2 text-perigo">
                {invalidos.map((i) => (
                  <li key={i.linha}>
                    Linha {i.linha}: {i.motivo} — <span className="font-mono">{i.texto}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Botao variante="primario" onClick={importar} disabled={ocupado || validos.length === 0}>
            Adicionar {validos.length > 0 ? validos.length : ""} {validos.length === 1 ? "pessoa" : "pessoas"}
          </Botao>
        </div>
      </div>
    </details>
  );
}

function contarPorNivel(lista: { nivel: keyof typeof ROTULO_NIVEL }[]): string {
  const contagem = new Map<string, number>();
  for (const { nivel } of lista) contagem.set(ROTULO_NIVEL[nivel], (contagem.get(ROTULO_NIVEL[nivel]) ?? 0) + 1);
  return [...contagem].map(([rotulo, n]) => `${n} ${rotulo.toLowerCase()}`).join(", ");
}
