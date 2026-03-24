import path from "path";
import type { NextConfig } from "next";

const jspdfBrowser = path.resolve(
  process.cwd(),
  "node_modules/jspdf/dist/jspdf.es.min.js"
);

const nextConfig: NextConfig = {
  /** Hindari bundle Prisma/WASM ke chunk Turbopack (skema usang / kolom salah). */
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
  ],
  turbopack: {
    resolveAlias: {
      // Relative path required for Turbopack on Windows (no absolute imports).
      jspdf: "./node_modules/jspdf/dist/jspdf.es.min.js",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      jspdf: jspdfBrowser,
    };
    return config;
  },
};

export default nextConfig;
