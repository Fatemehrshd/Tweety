import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent server-only code from being bundled for the client
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
  // Mark server-only packages that shouldn't be bundled for the client
  serverExternalPackages: ['typeorm', 'pg', 'ioredis', 'bcryptjs', 'pino', 'pino-pretty'],
};

export default nextConfig;
