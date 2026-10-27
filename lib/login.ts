/**
 * Login por código no e-mail (Supabase Auth OTP). Funções puras: validação,
 * normalização e tradução das mensagens do Supabase, que vêm em inglês.
 */
export const EMAIL_LOGIN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** O Supabase manda 6 dígitos por padrão; aceita até 10 caso o projeto mude o tamanho. */
export const CODIGO_LOGIN = /^\d{6,10}$/;

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Tira espaços e hífens que vêm ao colar ("482 913"). */
export function limparCodigo(codigo: string): string {
  return codigo.replace(/[\s-]/g, "");
}

export function traduzirErroLogin(mensagem: string): string {
  if (/expired|invalid/i.test(mensagem) && /token|otp|code/i.test(mensagem)) return "Código inválido ou expirado. Confira ou peça outro.";
  if (/only request this after|security purposes/i.test(mensagem)) return "Espere alguns segundos antes de pedir outro código.";
  if (/rate limit/i.test(mensagem)) return "Muitos códigos enviados agora. Tente de novo em alguns minutos.";
  if (/signups? not allowed|signup is disabled/i.test(mensagem)) return "O login por e-mail ainda não foi ativado. Use o Google ou fale com a diretoria.";
  if (/error sending|smtp|confirmation email/i.test(mensagem)) return "Não conseguimos enviar o e-mail agora. Tente de novo em instantes.";
  return mensagem;
}
