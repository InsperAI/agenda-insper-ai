"use client";

import { useMemo, useState, type FormEvent } from "react";
import Alternador from "@/components/ui/Alternador";
import Botao from "@/components/ui/Botao";
import Campo from "@/components/ui/Campo";
import Dialogo from "@/components/ui/Dialogo";
import { CARGOS_SUGERIDOS, EMAIL_VALIDO, traduzirErroMembro } from "@/lib/membros";
import { NIVEIS } from "@/lib/niveis";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { MembroRow, Nivel } from "@/lib/supabase/tipos";

/**
 * Edita e-mail, nome, cargo, nível e admin. Montado com `key={membro.id}` pelo
 * pai, então o estado nasce dos dados da pessoa a cada abertura.
 */
export default function DialogoMembro({
  membro,
  ehVoce,
  aoFechar,
  aoSalvar,
}: {
  membro: MembroRow;
  ehVoce: boolean;
  aoFechar: () => void;
  aoSalvar: (m: MembroRow) => void;
}) {
  const sb = useMemo(() => supabaseNavegador(), []);
  const [email, setEmail] = useState(membro.email);
  const [nome, setNome] = useState(membro.name);
  const [cargo, setCargo] = useState(membro.cargo);
  const [nivel, setNivel] = useState<Nivel>(membro.nivel);
  const [admin, setAdmin] = useState(membro.is_admin);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const em = email.trim().toLowerCase();
  const mudouEmail = em !== membro.email;
  const ehAdmin = nivel === "diretoria" && admin;
  // Você mesmo: trocar o e-mail, sair da diretoria ou largar o admin tira seu acesso a esta tela.
  const perdeAcesso = ehVoce && (mudouEmail || nivel !== "diretoria" || !ehAdmin);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_VALIDO.test(em)) return setErro("Digite um e-mail válido.");
    if (!nome.trim()) return setErro("Digite o nome.");
    if (perdeAcesso && !confirmando) return setConfirmando(true);

    setOcupado(true);
    const { data, error } = await sb
      .from("members")
      .update({ email: em, name: nome.trim(), cargo: cargo.trim(), nivel, is_admin: ehAdmin })
      .eq("id", membro.id)
      .select("*")
      .single();
    setOcupado(false);
    if (error) {
      setConfirmando(false);
      return setErro(traduzirErroMembro(error.message));
    }
    aoSalvar(data);
  }

  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo={`Editar ${membro.name}`}
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao variante={confirmando ? "perigo" : "primario"} type="submit" form="form-membro" disabled={ocupado}>
            {confirmando ? "Salvar mesmo assim" : "Salvar"}
          </Botao>
        </>
      }
    >
      <form id="form-membro" onSubmit={salvar} className="flex flex-col gap-3">
        <Campo id="e-email" rotulo="E-mail (conta Google)" dica={mudouEmail ? "A pessoa passa a entrar com a conta Google deste e-mail. O link do feed continua o mesmo." : undefined}>
          <input id="e-email" type="email" className="campo" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Campo>
        <Campo id="e-nome" rotulo="Nome">
          <input id="e-nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="e-nivel" rotulo="Nível">
            <select id="e-nivel" className="campo" value={nivel} onChange={(e) => setNivel(e.target.value as Nivel)}>
              {NIVEIS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="e-cargo" rotulo="Cargo" opcional>
            <input id="e-cargo" className="campo" value={cargo} onChange={(e) => setCargo(e.target.value)} list="cargos-editar" />
            <datalist id="cargos-editar">
              {CARGOS_SUGERIDOS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Campo>
        </div>
        {nivel === "diretoria" && (
          <label className="flex items-center gap-3 text-[0.9rem] text-ia-corpo">
            <Alternador ligado={admin} aoMudar={setAdmin} rotulo={`${membro.name} é admin`} />
            Admin (gerencia esta lista)
          </label>
        )}

        {confirmando && (
          <p role="alert" className="rounded-lg bg-perigo-fundo px-3 py-2 text-[0.875rem] text-perigo">
            {mudouEmail
              ? "Você está mudando o seu próprio e-mail: vai precisar entrar de novo com a conta Google nova."
              : "Com essa mudança você deixa de ser admin e perde o acesso a esta tela."}
          </p>
        )}
        {erro && (
          <p role="alert" className="text-[0.875rem] text-perigo">
            {erro}
          </p>
        )}
      </form>
    </Dialogo>
  );
}
