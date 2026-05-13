import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development"
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.17.1', '192.168.1.172'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gkkwazoodmwcpagxcsja.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withPWA(nextConfig);
