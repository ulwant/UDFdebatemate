import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.17.1', '192.168.1.172'],
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gkkwazoodmwcpagxcsja.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000,
  },
  // Use Turbopack (default in Next.js 16)
  turbopack: {},
  // Compress static assets
  compress: true,
  // Optimize production builds
  productionBrowserSourceMaps: false,
  // Experimental optimizations
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
      'qrcode.react',
    ],
  },
};

export default withPWA(nextConfig);
