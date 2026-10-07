"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import Alternador from "@/components/ui/Alternador";
import Aviso from "@/components/ui/Aviso";
import Botao, { BotaoIcone } from "@/components/ui/Botao";
import Campo from "@/components/ui/Campo";
import Dialogo from "@/components/ui/Dialogo";
import { IcoLixeira, IcoMais } from "@/components/ui/Icones";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { MembroRow } from "@/lib/supabase/tipos";

const CARGOS = [
  "Presidente",
  "Vice-Presidente",
  "Diretor(a) Acadêmico(a)",
  "Diretor(a) de Projetos",
  "Diretor(a) Institucional",
  "Diretor(a) de Gestão de Pessoas",
];

function traduzir(m: string): string {
  if (/duplicate key/i.test(m)) return "Esse e-mail já está cadastrado.";
  if (/row-level security/i.test(m)) return "Só admins podem alterar a lista de membros.";
  if (/último admin/i.test(m)) return "Não é possível remover o último admin.";
  return m;
}

export default function TabelaMembros({ inicial, meuId }: { inicial: MembroRow[]; meuId: string }) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const router = useRouter();
  const [lista, setLista] = useState(inicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);
  const [ocupado, setOcupado] = useState(false);
  const [removendo, setRemovendo] = useState<MembroRow | null>(null);

  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [admin, setAdmin] = useState(false);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setAviso("Digite um e-mail válido.");
    if (!nome.trim()) return setAviso("Digite o nome.");
    setOcupado(true);
    const { data, error } = await sb.from("members").insert({ email: em, name: nome.trim(), cargo: cargo.trim(), is_admin: admin }).select("*").single();
    setOcupado(false);
    if (error) return setAviso(traduzir(error.message));
    setLista((l) => [...l, data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    setEmail("");
    setNome("");
    setCargo("");
    setAdmin(false);
    setAviso(`${data.name} agora pode entrar.`);
    router.refresh();
  }

  async function alternarAdmin(m: MembroRow, valor: boolean) {
    const { error } = await sb.from("members").update({ is_admin: valor }).eq("id", m.id);
    if (error) return setAviso(traduzir(error.message));
    setLista((l) => l.map((x) => (x.id === m.id ? { ...x, is_admin: valor } : x)));
    router.refresh();
  }

  async function remover(m: MembroRow) {
    setOcupado(true);
    const { error } = await sb.from("members").delete().eq("id", m.id);
    setOcupado(false);
    setRemovendo(null);
    if (error) return setAviso(traduzir(error.message));
    setLista((l) => l.filter((x) => x.id !== m.id));
    setAviso(`${m.name} foi removido(a).`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={adicionar} className="flex flex-col gap-3 rounded-xl border border-ia-regua p-4">
        <p className="font-display font-semibold text-ia-petroleo">Adicionar membro</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="m-email" rotulo="E-mail (conta Google)">
            <input id="m-email" type="email" className="campo" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@al.insper.edu.br" required />
          </Campo>
          <Campo id="m-nome" rotulo="Nome">
            <input id="m-nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome Sobrenome" required />
          </Campo>
          <Campo id="m-cargo" rotulo="Cargo" opcional>
            <input id="m-cargo" className="campo" value={cargo} onChange={(e) => setCargo(e.target.value)} list="cargos" placeholder="Diretor(a) de…" />
            <datalist id="cargos">
              {CARGOS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Campo>
          <div className="flex items-end">
            <label className="flex h-10 w-full items-center justify-between rounded-lg border border-ia-regua px-3 text-[0.9rem] text-ia-corpo">
              Admin
              <Alternador ligado={admin} aoMudar={setAdmin} rotulo="Novo membro é admin" />
            </label>
          </div>
        </div>
        <div className="flex justify-end">
          <Botao variante="primario" type="submit" disabled={ocupado}>
            <IcoMais /> Adicionar
          </Botao>
        </div>
      </form>

      <ul className="divide-y divide-ia-regua overflow-hidden rounded-xl border border-ia-regua">
        {lista.map((m) => {
          const souEu = m.id === meuId;
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.95rem] text-ia-petroleo">
                  {m.name}
                  {souEu && <span className="ml-2 text-[0.75rem] text-ia-meta">(você)</span>}
                </p>
                <p className="truncate text-[0.8125rem] text-ia-apoio">
                  {m.cargo ? `${m.cargo} · ` : ""}
                  {m.email}
                </p>
              </div>
              <label className="flex items-center gap-2 text-[0.8125rem] text-ia-apoio">
                <span className="hidden sm:inline">Admin</span>
                <Alternador ligado={m.is_admin} aoMudar={(v) => alternarAdmin(m, v)} rotulo={`${m.name} é admin`} />
              </label>
              <BotaoIcone rotulo={`Remover ${m.name}`} disabled={souEu || ocupado} onClick={() => setRemovendo(m)} className="hover:!bg-perigo-fundo hover:!text-perigo">
                <IcoLixeira />
              </BotaoIcone>
            </li>
          );
        })}
      </ul>

      <Dialogo
        aberto={removendo !== null}
        aoFechar={() => setRemovendo(null)}
        titulo="Remover membro"
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
