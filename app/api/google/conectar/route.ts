import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { ErroGoogle, urlAutorizacao } from "@/lib/google/api";
import { adminLogado, COOKIE_ESTADO, origemDe } from "@/lib/google/rotas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Admin clica em "Conectar conta Google" (Membros) → tela de consentimento do Google. */
export async function GET(request: Request) {
  const origem = origemDe(request);
  if (!(await adminLogado())) return NextResponse.redirect(`${origem}/agenda`);

  try {
    const estado = randomBytes(24).toString("hex");
    const r = NextResponse.redirect(urlAutorizacao(`${origem}/api/google/retorno`, estado));
    r.cookies.set(COOKIE_ESTADO, estado, { httpOnly: true, secure: origem.startsWith("https://"), sameSite: "lax", path: "/api/google", maxAge: 600 });
    return r;
  } catch (e) {
    return NextResponse.redirect(`${origem}/admin?google=${e instanceof ErroGoogle ? e.codigo : "falhou"}`);
  }
}
