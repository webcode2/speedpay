import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@solar/types", "@solar/database"],
};

export default nextConfig;
