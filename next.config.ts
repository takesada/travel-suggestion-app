import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dynamic-media-cdn.tripadvisor.com',
        port: '',
        pathname: '/media/**',
      },
    ],
  },
};

export default nextConfig;
