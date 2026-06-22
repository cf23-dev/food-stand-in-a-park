import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Don't fail the production build on ESLint errors (e.g. unescaped
    // apostrophes in page copy). Lint still runs in `npm run lint` for dev.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      // Supabase Storage public bucket for delivery photos.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
