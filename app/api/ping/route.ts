import { after, NextResponse } from "next/server";
import { pedirOutraRodada, sincronizarGoogle } from "@/lib/google/sincronizar";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Alvo do cron diário (vercel.json). Faz uma consulta mínima para o projeto
 * gratuito do Supabase não ser pausado por inatividade. Aproveita para varrer a
 * fila do Google Agenda (o que o aviso imediato do pg_net não conseguiu mandar).
 */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new NextResponse("Não autorizado", { status: 401 });
  }
  const { count, error } = await supabaseAdmin().from("members").select("id", { count: "exact", head: true });
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  after(async () => {
    try {
      const r = await sincronizarGoogle();
      if (r.restam) await pedirOutraRodada();
    } catch (e) {
      console.error("[ping] google:", e instanceof Error ? e.message : e);
    }
  });
  return NextResponse.json({ ok: true, membros: count ?? 0, em: new Date().toISOString() });
}
