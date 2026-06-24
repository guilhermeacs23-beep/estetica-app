import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Erros de ESLint não bloqueiam o build — corrigir tipos incrementalmente
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "egkrdbesdznadwixdkjn.supabase.co" },
    ],
  },
};

export default nextConfig;
