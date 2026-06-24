import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "egkrdbesdznadwixdkjn.supabase.co" },
    ],
  },
};

export default nextConfig;
