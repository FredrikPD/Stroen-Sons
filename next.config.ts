import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "weblium.com",
      },
      {
        protocol: "https",
        hostname: "christmascentral.com",
      },
      {
        protocol: "https",
        hostname: "www.christmascentral.com",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "*.ufs.sh",
      },
    ],
  },
  serverExternalPackages: ["uploadthing"],
};

export default nextConfig;
