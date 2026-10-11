"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import Aviso from "@/components/ui/Aviso";
import Botao, { BotaoIcone } from "@/components/ui/Botao";
import Dialogo from "@/components/ui/Dialogo";
import { IcoLapis, IcoLixeira } from "@/components/ui/Icones";
import { ordenarMembros, traduzirErroMembro } from "@/lib/membros";
import { NIVEIS } from "@/lib/niveis";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { MembroRow } from "@/lib/supabase/tipos";
import DialogoMembro from "./DialogoMembro";
import FormNovoMembro from "./FormNovoMembro";
import ImportarMembros from "./ImportarMembros";

/** Tela Membros: cadastro (um a um ou em lista), lista por nível, edição e remoção. */
export default function TabelaMembros({ inicial, meuId }: { inicial: MembroRow[]; meuId: string }) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const router = useRouter();
  const [lista, setLista] = useState(() => ordenarMembros(inicial));
  const [aviso, setAviso] = useState<string | null>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);
  const [editando, setEditando] = useState<MembroRow | null>(null);
  const [removendo, setRemovendo] = useState<MembroRow | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const grupos = useMemo(() => NIVEIS.map((n) => ({ ...n, membros: lista.filter((m) => m.nivel === n.id) })), [lista]);

  function adicionar(novos: MembroRow[]) {
    setLista((l) => ordenarMembros([...l, ...novos]));
    router.refresh();
  }

  function salvo(m: MembroRow) {
    setEditando(null);
    setLista((l) => ordenarMembros(l.map((x) => (x.id === m.id ? m : x))));
    setAviso(`${m.name} atualizado(a).`);
    router.refresh();
  }

  async function remover(m: MembroRow) {
    setOcupado(true);
    const { error } = await sb.from("members").delete().eq("id", m.id);
    setOcupado(false);
    setRemovendo(null);
    if (error) return setAviso(traduzirErroMembro(error.message));
    setLista((l) => l.filter((x) => x.id !== m.id));
    setAviso(`${m.name} foi removido(a).`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <FormNovoMembro aoAdicionar={(m) => adicionar([m])} aoAvisar={setAviso} />
      <ImportarMembros aoAdicionar={adicionar} aoAvisar={setAviso} />

      {grupos.map((g) => (
        <section key={g.id} className="flex flex-col gap-2">
          <h2 className="t-meta">
            {g.plural} · {g.membros.length}
          </h2>
          {g.membros.length === 0 ? (
            <p className="t-apoio">Ninguém ainda.</p>
          ) : (
            <ul className="divide-y divide-ia-regua overflow-hidden rounded-xl border border-ia-regua">
              {g.membros.map((m) => {
                const souEu = m.id === meuId;
                return (
                  <li key={m.id} className="flex items-center gap-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.95rem] text-ia-petroleo">
                        {m.name}
                        {souEu && <span className="ml-2 text-[0.75rem] text-ia-meta">(você)</span>}
                        {m.is_admin && <span className="ml-2 rounded-full bg-ia-nevoa px-2 py-0.5 text-[0.7rem] text-ia-apoio">admin</span>}
                      </p>
                      <p className="truncate text-[0.8125rem] text-ia-apoio">
                        {m.cargo ? `${m.cargo} · ` : ""}
                        {m.email}
                      </p>
                    </div>
                    <BotaoIcone rotulo={`Editar ${m.name}`} onClick={() => setEditando(m)}>
                      <IcoLapis />
                    </BotaoIcone>
                    <BotaoIcone rotulo={`Remover ${m.name}`} disabled={souEu || ocupado} onClick={() => setRemovendo(m)} className="hover:!bg-perigo-fundo hover:!text-perigo">
                      <IcoLixeira />
                    </BotaoIcone>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}

      {editando && <DialogoMembro key={editando.id} membro={editando} ehVoce={editando.id === meuId} aoFechar={() => setEditando(null)} aoSalvar={salvo} />}

      <Dialogo
        aberto={removendo !== null}
        aoFechar={() => setRemovendo(null)}
        titulo="Remover pessoa"
        rodape={
          removendo && (
            <>
              <Botao variante="fantasma" onClick={() => setRemovendo(null)}>
                Cancelar
              </Botao>
              <Botao variante="perigo" onClick={() => remover(removendo)} disabled={ocupado}>
                Remover
              </Botao>
            </>
          )
        }
      >
        <p className="t-apoio">
          {removendo?.name} perde o acesso na próxima vez que abrir a agenda. Os eventos que essa pessoa criou continuam na agenda.
        </p>
      </Dialogo>

      <Aviso mensagem={aviso} aoFechar={fecharAviso} />
    </div>
  );
}
