import { describe, expect, it } from "vitest";
import { identificarCliente, resumirBusca, type BuscaFeed } from "@/lib/feed";

describe("identificarCliente", () => {
  it.each([
    ["Google-Calendar-Importer", "google"],
    ["Mozilla/5.0 (compatible; Google-Calendar-Importer)", "google"],
    ["iOS/18.1 (22B83) dataaccessd/1.0", "apple"],
    ["macOS/15.1 (24B83) CalendarAgent/1000", "apple"],
    ["Mac OS X/10.15.7 (19H2) CalendarAgent/954.4", "apple"],
    ["Microsoft Office/16.0 (Windows NT 10.0; Microsoft Outlook 16.0.17126; Pro)", "outlook"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15", "navegador"],
    ["curl/8.7.1", "outro"],
    ["", "outro"],
    [null, "outro"],
  ])("%s → %s", (agente, esperado) => {
    expect(identificarCliente(agente)).toBe(esperado);
  });
});

describe("resumirBusca", () => {
  const agora = new Date("2026-11-13T15:00:00Z");
  const busca = (p: Partial<BuscaFeed>): BuscaFeed => ({
    cliente: "google",
    primeira_em: "2026-11-13T14:00:00Z",
    ultima_em: "2026-11-13T14:00:00Z",
    buscas: 1,
    ...p,
  });

  it("diz há quanto tempo foi a última busca", () => {
    expect(resumirBusca(busca({ ultima_em: "2026-11-13T14:58:00Z" }), agora).quando).toBe("há 2 min");
    expect(resumirBusca(busca({ ultima_em: "2026-11-13T14:59:50Z" }), agora).quando).toBe("agora há pouco");
    expect(resumirBusca(busca({ ultima_em: "2026-11-13T06:00:00Z" }), agora).quando).toBe("há 9 h");
    expect(resumirBusca(busca({ ultima_em: "2026-11-10T15:00:00Z" }), agora).quando).toBe("há 3 dias");
  });

  it("calcula o intervalo médio entre buscas quando há mais de uma", () => {
    expect(resumirBusca(busca({}), agora).media).toBeNull();
    const varias = busca({ primeira_em: "2026-11-11T14:00:00Z", ultima_em: "2026-11-13T14:00:00Z", buscas: 5 });
    expect(resumirBusca(varias, agora).media).toBe("a cada 12 h");
    const rapida = busca({ primeira_em: "2026-11-13T13:00:00Z", ultima_em: "2026-11-13T14:00:00Z", buscas: 5 });
    expect(resumirBusca(rapida, agora).media).toBe("a cada 15 min");
  });
});
