import path from "node:path";
import type { NextConfig } from "next";

const jsdomGlobalShim = "./lib/shims/jsdom-global.js";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      "jsdom-global": jsdomGlobalShim,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "jsdom-global": path.resolve(process.cwd(), jsdomGlobalShim),
    };
    return config;
  },
};

export default nextConfig;
