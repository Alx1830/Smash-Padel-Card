import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vjtxrqwqhwnkscktvgce.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.scrydex.com",
      },
    ],
  },
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

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    /* App shell — JS/CSS del sitio: red primero, caché como fallback */
    {
      urlPattern: /^https:\/\/facebinder\.vercel\.app\/_next\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-static",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    /* Imágenes de cartas locales — caché primero (ya son immutable) */
    {
      urlPattern: /\/pokemon-cards\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "card-images",
        expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    /* Logos de sets */
    {
      urlPattern: /\/pokemon-sets\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "set-images",
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    /* Avatares de Supabase */
    {
      urlPattern: /^https:\/\/vjtxrqwqhwnkscktvgce\.supabase\.co\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "supabase-assets",
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
    /* Google Fonts */
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
  ],
})(nextConfig);
