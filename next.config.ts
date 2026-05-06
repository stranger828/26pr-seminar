import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const proxyTarget = process.env.VERCEL_PROXY_TARGET?.replace(/\/+$/, "");

    if (!proxyTarget) {
      return [];
    }

    return [
      {
        source: "/:path*",
        destination: `${proxyTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
