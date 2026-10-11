"use client";

import { useMemo, useState, type FormEvent } from "react";
import Alternador from "@/components/ui/Alternador";
import Botao from "@/components/ui/Botao";
import Campo from "@/components/ui/Campo";
import { IcoMais } from "@/components/ui/Icones";
import { CARGOS_SUGERIDOS, EMAIL_VALIDO, traduzirErroMembro } from "@/lib/membros";
import { NIVEIS } from "@/lib/niveis";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { MembroRow, Nivel } from "@/lib/supabase/tipos";

/** Cadastro de uma pessoa. Admin só existe na diretoria (regra também no banco). */
export default function FormNovoMembro({ aoAdicionar, aoAvisar }: { aoAdicionar: (m: MembroRow) => void; aoAvisar: (msg: string) => void }) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const [ocupado, setOcupado] = useState(false);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [nivel, setNivel] = useState<Nivel>("membro");
  const [admin, setAdmin] = useState(false);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!EMAIL_VALIDO.test(em)) return aoAvisar("Digite um e-mail válido.");
    if (!nome.trim()) return aoAvisar("Digite o nome.");
    setOcupado(true);
    const { data, error } = await sb
      .from("members")
      .insert({ email: em, name: nome.trim(), cargo: cargo.trim(), nivel, is_admin: nivel === "diretoria" && admin })
      .select("*")
      .single();
    setOcupado(false);
    if (error) return aoAvisar(traduzirErroMembro(error.message));
    setEmail("");
    setNome("");
    setCargo("");
    setAdmin(false);
    aoAdicionar(data);
    aoAvisar(`${data.name} agora pode entrar.`);
  }

  return (
    <form onSubmit={adicionar} className="flex flex-col gap-3 rounded-xl border border-ia-regua p-4">
      <p className="font-display font-semibold text-ia-petroleo">Adicionar pessoa</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo id="m-email" rotulo="E-mail (conta Google)">
          <input id="m-email" type="email" className="campo" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@al.insper.edu.br" required />
        </Campo>
        <Campo id="m-nome" rotulo="Nome">
          <input id="m-nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome Sobrenome" required />
        </Campo>
        <Campo id="m-nivel" rotulo="Nível">
          <select id="m-nivel" className="campo" value={nivel} onChange={(e) => setNivel(e.target.value as Nivel)}>
            {NIVEIS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="m-cargo" rotulo="Cargo" opcional>
          <input id="m-cargo" className="campo" value={cargo} onChange={(e) => setCargo(e.target.value)} list="cargos" placeholder="Diretor(a) de…" />
          <datalist id="cargos">
            {CARGOS_SUGERIDOS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Campo>
      </div>
      <div className="flex items-center justify-between gap-3">
        {nivel === "diretoria" ? (
          <label className="flex items-center gap-3 text-[0.9rem] text-ia-corpo">
            <Alternador ligado={admin} aoMudar={setAdmin} rotulo="Nova pessoa é admin" />
            Admin (gerencia esta lista)
          </label>
        ) : (
          <span />
        )}
        <Botao variante="primario" type="submit" disabled={ocupado}>
          <IcoMais /> Adicionar
        </Botao>
      </div>
    </form>
  );
}
