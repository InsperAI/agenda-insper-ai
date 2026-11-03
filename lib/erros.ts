/** Mensagem única para quando o pedido nem chegou ao servidor. */
export const SEM_CONEXAO = "Sem conexão com a internet. Confira o Wi-Fi ou os dados móveis e tente de novo.";

/** Chrome, Firefox, Safari (iPhone) e Node escrevem a falha de rede cada um do seu jeito. */
const FALHA_DE_REDE = /failed to fetch|networkerror|load failed|fetch failed|network request failed/i;

export function ehFalhaDeRede(mensagem: string): boolean {
  return FALHA_DE_REDE.test(mensagem);
}
