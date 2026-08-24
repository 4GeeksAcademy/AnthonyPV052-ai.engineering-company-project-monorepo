import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    return [
      {
        // El gestor ya incluye el prefijo /api en FastAPI. Esta regla debe ir
        // antes de la regla genérica, que se mantiene para los endpoints legados.
        source: "/api/incidents/:path*",
        destination: "http://backend:8020/api/incidents/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://backend:8020/:path*",
      },
    ];
  },
};

export default nextConfig;
