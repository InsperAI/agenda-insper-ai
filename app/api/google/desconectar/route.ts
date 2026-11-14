import { NextResponse } from "next/server";
import { encerrarConta } from "@/lib/google/api";
import { adminLogado } from "@/lib/google/rotas";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Para de mandar para o Google: apaga a agenda "Insper AI · Agenda" da conta
 * (os convites somem da agenda de quem ativou), revoga o acesso e esquece a conta.
 */
export async function POST() {
  if (!(await adminLogado())) return new NextResponse("Não autorizado", { status: 401 });
  const db = supabaseAdmin();
  const { data: conta } = await db.from("google_conta").select("refresh_token,calendario_id").maybeSingle();
  if (conta) await encerrarConta(conta.refresh_token, conta.calendario_id);
  await db.from("google_conta").delete().eq("id", true);
  await db.from("google_espelho").delete().not("evento_id", "is", null);
  await db.from("google_fila").delete().not("serie_id", "is", null);
  return NextResponse.json({ ok: true });
}
