import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) so the Docker image
  // stays small and does not need the full node_modules at runtime.
  output: "standalone",

  // Local network origins allowed to hit the dev server (harmless in prod).
  allowedDevOrigins: ["192.168.115.227"],
};

export default nextConfig;
