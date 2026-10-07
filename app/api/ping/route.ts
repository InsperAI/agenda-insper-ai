import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Alvo do cron diário (vercel.json). Faz uma consulta mínima para o projeto
 * gratuito do Supabase não ser pausado por inatividade.
 */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new NextResponse("Não autorizado", { status: 401 });
  }
  const { count, error } = await supabaseAdmin().from("members").select("id", { count: "exact", head: true });
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, membros: count ?? 0, em: new Date().toISOString() });
}
