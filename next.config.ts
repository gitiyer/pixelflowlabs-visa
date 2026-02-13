import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Standard security headers if needed, but removing COOP/COEP
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          }
        ],
      },
    ];
  },
};

export default nextConfig;
