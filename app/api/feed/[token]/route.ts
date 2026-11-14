import { addMonths } from "date-fns";
import { after, NextResponse } from "next/server";
import { identificarCliente } from "@/lib/feed";
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
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) return naoEncontrado();

  const admin = supabaseAdmin();
  const { data: dono } = await admin.from("feed_tokens").select("member_id").eq("token", token).maybeSingle();
  if (!dono) return naoEncontrado();

  const { data: membro } = await admin.from("members").select("id,nivel").eq("id", dono.member_id).maybeSingle();
  if (!membro) return naoEncontrado();

  const agora = new Date();
  const { data: linhas, error } = await admin.rpc("events_in_range", {
    p_ini: addMonths(agora, -6).toISOString(),
    p_fim: addMonths(agora, 18).toISOString(),
  });
  if (error) return new NextResponse("Erro ao gerar o calendário.", { status: 500 });

  const agente = request.headers.get("user-agent") ?? "";
  const cliente = identificarCliente(agente);
  let visiveis = visiveisPara(linhas ?? [], membro);

  // Quem recebe na hora no Google Agenda (0014) veria tudo duas vezes se também
  // assinou este link no Google: para o Google, o feed tira o que já foi enviado.
  // Apple e Outlook continuam recebendo tudo pelo link.
  if (cliente === "google") {
    const { data: inscricao } = await admin.from("google_inscricoes").select("member_id").eq("member_id", membro.id).maybeSingle();
    if (inscricao) {
      const { data: enviados } = await admin.rpc("google_series_enviadas");
      const series = new Set(enviados ?? []);
      visiveis = visiveis.filter((l) => !series.has(l.series_id ?? l.id));
    }
  }

  const corpo = serializarCalendario(visiveis, "Insper AI · Agenda", agora);

  // Depois de responder: anota que este app buscou (página Conectar mostra). Falhar aqui não afeta o feed.
  after(async () => {
    try {
      const { error: erroBusca } = await admin.rpc("registrar_busca_feed", { p_member: membro.id, p_cliente: cliente, p_agente: agente });
      if (erroBusca) console.error("[feed] não registrou a busca:", erroBusca.message);
    } catch (e) {
      console.error("[feed] não registrou a busca:", e instanceof Error ? e.message : e);
    }
  });

  return new NextResponse(corpo, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="agenda-insper-ai.ics"',
      // Nada de cache: quando o calendário finalmente vem buscar, tem de levar a versão de agora.
      "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

function naoEncontrado() {
  return new NextResponse("Não encontrado", { status: 404 });
}
