import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /* Serve WebP/AVIF automatically for all Next.js <Image> components */
    formats: ["image/avif", "image/webp"],
    /* Cache optimised images for 7 days on CDN */
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vjtxrqwqhwnkscktvgce.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  /* Aggressive static asset caching */
  async headers() {
    return [
      {
        source: "/pokemon-cards/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/pokemon-sets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
