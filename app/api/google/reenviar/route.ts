import { NextResponse } from "next/server";
import { ErroGoogle } from "@/lib/google/api";
import { reenviarConvites } from "@/lib/google/reenviar";
import { obterMembroAtual } from "@/lib/membro";
import { INTERVALO_REENVIO_MIN } from "@/lib/reenvio";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Conectar → "Reenviar convites": a pessoa logada sai e entra de novo como
 * convidada nos próprios eventos (lib/google/reenviar.ts). Só para si mesma e no
 * máximo a cada INTERVALO_REENVIO_MIN minutos — contados também desde que ativou,
 * para desativar/ativar não furar a trava. A trava (`reenviado_em`, 0015) só o
 * servidor grava.
 */
export async function POST(request: Request) {
  // Só o próprio site chama (o cookie de sessão já é SameSite=Lax; isto é a segunda tranca).
  const origem = request.headers.get("origin");
  if (origem && origem !== new URL(request.url).origin) return NextResponse.json({ ok: false, erro: "origem" }, { status: 403 });

  const { membro } = await obterMembroAtual();
  if (!membro) return NextResponse.json({ ok: false, erro: "sessao" }, { status: 401 });

  const admin = supabaseAdmin();
  const agora = new Date();
  const limite = new Date(agora.getTime() - INTERVALO_REENVIO_MIN * 60_000).toISOString();
  const { data: travou, error } = await admin
    .from("google_inscricoes")
    .update({ reenviado_em: agora.toISOString() })
    .eq("member_id", membro.id)
    .lt("criada_em", limite)
    .or(`reenviado_em.is.null,reenviado_em.lt."${limite}"`)
    .select("member_id");
  if (error) return NextResponse.json({ ok: false, erro: "banco" }, { status: 500 });
  if (!travou?.length) {
    const { data: ativo } = await admin.from("google_inscricoes").select("member_id").eq("member_id", membro.id).maybeSingle();
    return NextResponse.json({ ok: false, erro: ativo ? "espere" : "inativo" }, { status: ativo ? 429 : 404 });
  }

  try {
    const resultado = await reenviarConvites(membro.id);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (e) {
    console.error("[google] reenviar:", e instanceof Error ? e.message : e);
    // Não foi culpa de quem tocou: libera para tentar de novo sem esperar.
    await admin.from("google_inscricoes").update({ reenviado_em: null }).eq("member_id", membro.id);
    return NextResponse.json({ ok: false, erro: "google" }, { status: e instanceof ErroGoogle ? 502 : 500 });
  }
}
