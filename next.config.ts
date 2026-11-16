import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cursor/identity.ts imports ./identity.dev.js (ESM style); map to .ts for webpack.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias || {}),
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
