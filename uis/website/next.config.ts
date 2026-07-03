import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: "/workspaces/AnthonyPV052-ai.engineering-company-project-monorepo",
  },
};

export default nextConfig;
