import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Não expõe "X-Powered-By: Next.js"
  poweredByHeader: false,
  images: { unoptimized: true },
};

export default nextConfig;
