import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["*.trycloudflare.com"],
  async rewrites() {
    return [
      {
        source: "/proxy/:path*",
        destination: `${process.env.API_URL ?? "http://localhost:8000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
