import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 是原生模块，必须外部化，避免被 Next.js 打包。
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
