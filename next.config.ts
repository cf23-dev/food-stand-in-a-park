import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase Storage public bucket for delivery photos.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
