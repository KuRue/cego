import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@arf/db", "@arf/telegram"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
