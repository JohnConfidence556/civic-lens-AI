import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* This tells Vercel to ignore type errors during deployment */
  typescript: {
    ignoreBuildErrors: true,
  },
  /* This tells Vercel to ignore style errors */
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;