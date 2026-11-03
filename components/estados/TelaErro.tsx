"use client";

import { useEffect, useState } from "react";
import Botao, { BotaoLink } from "@/components/ui/Botao";
import TelaEstado from "./TelaEstado";

/**
 * Corpo comum de error.tsx. Sem conexão é o caso mais comum no celular, então
 * ganha texto próprio; o resto mostra o código para casar com o log da Vercel.
 */
export default function TelaErro({
  error,
  tentarDeNovo,
  comMarca = false,
}: {
  error: Error & { digest?: string };
  tentarDeNovo: () => void;
  comMarca?: boolean;
}) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    console.error(error);
    const atualizar = () => setOffline(!navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, [error]);

  return (
    <TelaEstado
      comMarca={comMarca}
      titulo={offline ? "Sem conexão" : "Não deu para carregar esta página"}
      texto={
        offline
          ? "Parece que você está sem internet. Quando a conexão voltar, tente de novo."
          : "Pode ter sido uma falha passageira. Tente de novo; se continuar, avise a diretoria."
      }
      detalhe={!offline && error.digest ? `Código do erro: ${error.digest}` : undefined}
    >
      <Botao variante="primario" onClick={tentarDeNovo}>
        Tentar de novo
      </Botao>
      <BotaoLink href="/agenda" variante="fantasma">
        Ir para a agenda
      </BotaoLink>
    </TelaEstado>
  );
}
