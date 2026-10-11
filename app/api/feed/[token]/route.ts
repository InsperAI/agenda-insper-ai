import { addMonths } from "date-fns";
import { NextResponse } from "next/server";
import { serializarCalendario } from "@/lib/ics";
import { visiveisPara } from "@/lib/niveis";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Feed .ics por membro, autenticado só pelo token na URL (é assim que Google e
 * Apple Calendar assinam). Usa a service role porque não há sessão de usuário;
 * o token é o que prova quem está pedindo. A service role ignora a RLS, então a
 * visibilidade por nível (público do evento) é aplicada aqui com `visiveisPara`.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) return naoEncontrado();

  const admin = supabaseAdmin();
  const { data: dono } = await admin.from("feed_tokens").select("member_id").eq("token", token).maybeSingle();
  if (!dono) return naoEncontrado();

  const { data: membro } = await admin.from("members").select("nivel").eq("id", dono.member_id).maybeSingle();
  if (!membro) return naoEncontrado();

  const agora = new Date();
  const { data: linhas, error } = await admin.rpc("events_in_range", {
    p_ini: addMonths(agora, -6).toISOString(),
    p_fim: addMonths(agora, 18).toISOString(),
  });
  if (error) return new NextResponse("Erro ao gerar o calendário.", { status: 500 });

  return new NextResponse(serializarCalendario(visiveisPara(linhas ?? [], membro.nivel), "Insper AI · Agenda", agora), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="agenda-insper-ai.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}

function naoEncontrado() {
  return new NextResponse("Não encontrado", { status: 404 });
}
