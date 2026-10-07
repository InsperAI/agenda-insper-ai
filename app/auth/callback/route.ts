import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { destinoSeguro } from "@/lib/url";

/** Volta do Google (via Supabase): troca o `code` pela sessão e redireciona. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = destinoSeguro(searchParams.get("next"));

  // Atrás do proxy da Vercel, a origem real vem em x-forwarded-host.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base = process.env.NODE_ENV === "development" ? origin : forwardedHost ? `https://${forwardedHost}` : origin;

  if (code) {
    const supabase = await supabaseServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
  }

  return NextResponse.redirect(`${base}/entrar?erro=auth`);
}
