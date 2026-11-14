import { after, NextResponse } from "next/server";
import { criarAgenda, encerrarConta, ErroGoogle, trocarCodigo } from "@/lib/google/api";
import { adminLogado, COOKIE_ESTADO, mesmoSegredo, origemDe, sitePublico } from "@/lib/google/rotas";
import { pedirOutraRodada, sincronizarGoogle } from "@/lib/google/sincronizar";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Volta do consentimento do Google. Guarda o refresh token (só a service role
 * lê `google_conta`), cria a agenda "Insper AI · Agenda" na conta e manda tudo.
 * A tela de Membros só recebe um código curto, nunca texto vindo da URL.
 */
export async function GET(request: Request) {
  const origem = origemDe(request);
  const url = new URL(request.url);
  const volta = (codigo: string) => {
    const r = NextResponse.redirect(`${origem}/admin?google=${codigo}`);
    r.cookies.delete({ name: COOKIE_ESTADO, path: "/api/google" });
    return r;
  };

  const admin = await adminLogado();
  if (!admin) return NextResponse.redirect(`${origem}/agenda`);

  const estado = request.headers.get("cookie")?.match(new RegExp(`${COOKIE_ESTADO}=([a-f0-9]+)`))?.[1];
  if (!mesmoSegredo(estado, url.searchParams.get("state"))) return volta("expirou");
  if (url.searchParams.get("error")) return volta(url.searchParams.get("error") === "access_denied" ? "cancelou" : "falhou");
  const codigo = url.searchParams.get("code");
  if (!codigo) return volta("falhou");

  try {
    const { refreshToken, email, acesso } = await trocarCodigo(codigo, `${origem}/api/google/retorno`);
    const db = supabaseAdmin();
    const { data: anterior } = await db.from("google_conta").select("email,calendario_id,refresh_token").maybeSingle();
    const mesmaConta = anterior?.email === email;
    // Outra conta: apaga a agenda da antiga (os convites somem da agenda de todos) e começa do zero.
    if (anterior && !mesmaConta) {
      await encerrarConta(anterior.refresh_token, anterior.calendario_id);
      await db.from("google_espelho").delete().not("evento_id", "is", null);
    }
    const calendario = mesmaConta && anterior?.calendario_id ? anterior.calendario_id : await criarAgenda(acesso);

    const { error } = await db.from("google_conta").upsert({
      id: true,
      email,
      refresh_token: refreshToken,
      calendario_id: calendario,
      site_url: sitePublico(origem),
      conectada_por: admin.id,
      conectada_em: new Date().toISOString(),
      erro: null,
      erro_em: null,
    });
    if (error) throw new Error(error.message);
    await db.rpc("google_enfileirar_tudo");
    after(async () => {
      try {
        const r = await sincronizarGoogle();
        if (r.restam) await pedirOutraRodada();
      } catch (e) {
        console.error("[google] primeira sincronia:", e instanceof Error ? e.message : e);
      }
    });
    return volta("ok");
  } catch (e) {
    console.error("[google] retorno:", e instanceof Error ? e.message : e);
    return volta(e instanceof ErroGoogle ? e.codigo : "falhou");
  }
}
