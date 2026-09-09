import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O valora-nucleo e consumido como TypeScript direto do git, sem etapa de
  // build propria. Sem isto o webpack recebe .ts cru e o build quebra em
  // "Module parse failed" — foi o que aconteceu na primeira tentativa.
  transpilePackages: ["valora-nucleo"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "egkrdbesdznadwixdkjn.supabase.co" },
    ],
  },
};

export default nextConfig;
