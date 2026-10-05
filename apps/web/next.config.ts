import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@solar/types", "@solar/database"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
