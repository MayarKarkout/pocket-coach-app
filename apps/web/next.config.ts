import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["*.trycloudflare.com", "*.ts.net", "goodold-ideapad-s210-touch.tail3b74a6.ts.net"],
};

export default nextConfig;
