import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent Cloudflare from injecting scripts (Rocket Loader, email obfuscation, etc.)
          { key: "cf-edge-cache", value: "no-transform" },
        ],
      },
    ];
  },
};

export default nextConfig;
