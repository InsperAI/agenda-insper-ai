import { describe, expect, it } from "vitest";
import { CODIGO_LOGIN, EMAIL_LOGIN, limparCodigo, normalizarEmail, traduzirErroLogin } from "@/lib/login";

describe("login por código", () => {
  it("normaliza o e-mail como a lista de membros (minúsculas, sem espaços)", () => {
    expect(normalizarEmail("  Beatriz@iCloud.com ")).toBe("beatriz@icloud.com");
  });

  it("aceita e-mails de qualquer provedor", () => {
    expect(EMAIL_LOGIN.test("mariasdm@al.insper.edu.br")).toBe(true);
    expect(EMAIL_LOGIN.test("beatrizcmn@icloud.com")).toBe(true);
    expect(EMAIL_LOGIN.test("sem-arroba.com")).toBe(false);
  });

  it("limpa o código colado com espaço ou hífen", () => {
    expect(limparCodigo("482 913")).toBe("482913");
    expect(limparCodigo("482-913")).toBe("482913");
    expect(CODIGO_LOGIN.test("482913")).toBe(true);
    expect(CODIGO_LOGIN.test("48291")).toBe(false);
  });

  it("traduz as mensagens mais comuns do Supabase", () => {
    expect(traduzirErroLogin("Token has expired or is invalid")).toBe("Código inválido ou expirado. Confira ou peça outro.");
    expect(traduzirErroLogin("For security purposes, you can only request this after 42 seconds.")).toBe("Espere alguns segundos antes de pedir outro código.");
    expect(traduzirErroLogin("Email rate limit exceeded")).toBe("Muitos códigos enviados agora. Tente de novo em alguns minutos.");
    expect(traduzirErroLogin("Error sending magic link email")).toBe("Não conseguimos enviar o e-mail agora. Tente de novo em instantes.");
    expect(traduzirErroLogin("algo novo")).toBe("algo novo");
  });
});
