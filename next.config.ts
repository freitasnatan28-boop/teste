import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Não expõe "X-Powered-By: Next.js"
  poweredByHeader: false,
  images: { unoptimized: true },
  experimental: {
    // Envio de avatares/fotos no Estúdio Canal Dark (até 20 MB por imagem)
    proxyClientMaxBodySize: "25mb",
  },
};

export default nextConfig;
