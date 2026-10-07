"use client";

import Campo from "@/components/ui/Campo";
import { FREQUENCIAS } from "@/lib/categorias";
import type { Frequencia } from "@/lib/supabase/tipos";

export type FreqOuNunca = Frequencia | "nunca";

export default function CampoRecorrencia({
  freq,
  until,
  minimo,
  aoMudar,
}: {
  freq: FreqOuNunca;
  until: string;
  minimo: string;
  aoMudar: (freq: FreqOuNunca, until: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Campo id="ev-freq" rotulo="Repetir">
        <select id="ev-freq" className="campo" value={freq} onChange={(e) => aoMudar(e.target.value as FreqOuNunca, until)}>
          <option value="nunca">Não se repete</option>
          {FREQUENCIAS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.rotulo}
            </option>
          ))}
        </select>
      </Campo>
      {freq !== "nunca" && (
        <Campo id="ev-until" rotulo="Até" dica="Último dia incluído">
          <input id="ev-until" type="date" className="campo" value={until} min={minimo} required onChange={(e) => aoMudar(freq, e.target.value)} />
        </Campo>
      )}
    </div>
  );
}
