/**
 * Cache em memória com limite de itens: ao passar do limite, sai o que foi
 * usado há mais tempo. Map guarda a ordem de inserção; ler reinsere no fim.
 */
export type Cache<T> = {
  ler(chave: string): T | undefined;
  guardar(chave: string, valor: T): void;
  limpar(): void;
};

export function criarCache<T>(limite: number): Cache<T> {
  const itens = new Map<string, T>();
  return {
    ler(chave) {
      if (!itens.has(chave)) return undefined;
      const valor = itens.get(chave) as T;
      itens.delete(chave);
      itens.set(chave, valor);
      return valor;
    },
    guardar(chave, valor) {
      itens.delete(chave);
      itens.set(chave, valor);
      if (itens.size > limite) itens.delete(itens.keys().next().value as string);
    },
    limpar() {
      itens.clear();
    },
  };
}
