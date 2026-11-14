import { after, NextResponse } from "next/server";
import { adminLogado, mesmoSegredo } from "@/lib/google/rotas";
import { pedirOutraRodada, sincronizarGoogle } from "@/lib/google/sincronizar";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Esvazia a fila do Google. Quem chama:
 *  • o banco, pelo pg_net, logo depois de cada mudança (header x-agenda-segredo);
 *  • o botão "Sincronizar agora" (admin logado).
 * Responde na hora (202) e trabalha depois da resposta: o pg_net não espera.
 */
export async function POST(request: Request) {
  const autorizado = (await segredoConfere(request.headers.get("x-agenda-segredo"))) || (await adminLogado()) !== null;
  if (!autorizado) return new NextResponse("Não autorizado", { status: 401 });

  after(async () => {
    try {
      const r = await sincronizarGoogle();
      if (r.restam) await pedirOutraRodada();
    } catch (e) {
      console.error("[google] sincronizar:", e instanceof Error ? e.message : e);
    }
  });
  return NextResponse.json({ ok: true }, { status: 202 });
}

async function segredoConfere(segredo: string | null): Promise<boolean> {
  if (!segredo) return false;
  const { data } = await supabaseAdmin().from("google_conta").select("segredo").maybeSingle();
  return mesmoSegredo(segredo, data?.segredo);
}
