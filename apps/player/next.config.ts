import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // make Next compile your workspace packages
  transpilePackages: ["@d100/core", "@d100/games"],
};

export default nextConfig;
