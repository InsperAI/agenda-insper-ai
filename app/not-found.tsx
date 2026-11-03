import type { Metadata } from "next";
import TelaEstado from "@/components/estados/TelaEstado";
import { BotaoLink } from "@/components/ui/Botao";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NaoEncontrada() {
  return (
    <TelaEstado
      comMarca
      titulo="Página não encontrada"
      texto="O endereço pode estar incompleto ou a página mudou de lugar. Se veio de um link no grupo, confira se ele foi copiado inteiro."
    >
      <BotaoLink href="/agenda" variante="primario">
        Ir para a agenda
      </BotaoLink>
      <BotaoLink href="/disponibilidade" variante="fantasma">
        Ver disponibilidade
      </BotaoLink>
    </TelaEstado>
  );
}
