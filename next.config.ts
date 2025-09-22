import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimized for Netlify deployment
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
