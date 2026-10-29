import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // "Votações" virou "Disponibilidade": links antigos mandados no grupo continuam funcionando.
  async redirects() {
    return [
      { source: "/votacoes", destination: "/disponibilidade", permanent: true },
      { source: "/votacoes/:caminho*", destination: "/disponibilidade/:caminho*", permanent: true },
      // "Assinar" virou "Conectar".
      { source: "/assinar", destination: "/conectar", permanent: true },
    ];
  },
};

export default nextConfig;
