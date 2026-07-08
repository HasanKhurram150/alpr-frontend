import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow up to 2GB for test video uploads
    proxyClientMaxBodySize: 2048 * 1024 * 1024,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // destination: "http://127.0.0.1:8000/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
