import type { NextConfig } from "next";
import withPWA from "next-pwa";

const SUPABASE_HOST = "vjtxrqwqhwnkscktvgce.supabase.co";

const securityHeaders = [
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy",   value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `img-src 'self' data: blob: https://${SUPABASE_HOST} https://images.scrydex.com https://images.pokemontcg.io https://pub-01b8e296fe944e688fd2100376d4af4a.r2.dev https://www.tcgplayer.com https://cdn.binderforge.com`,
      `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://www.google-analytics.com https://pub-01b8e296fe944e688fd2100376d4af4a.r2.dev https://images.pokemontcg.io https://www.tcgplayer.com https://cdn.binderforge.com https://pagead2.googlesyndication.com`,
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "frame-src https://www.youtube.com https://www.tcgplayer.com",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
  },
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
      {
        protocol: "https",
        hostname: "images.pokemontcg.io",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
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
      urlPattern: /^https:\/\/(www\.)?facebinder\.(com|vercel\.app)\/_next\/.*/i,
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
    /* Imágenes de cartas Scrydex — StaleWhileRevalidate para resilencia offline */
    {
      urlPattern: /^https:\/\/images\.scrydex\.com\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "scrydex-cards",
        expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    /* Imágenes de cartas pokemontcg.io */
    {
      urlPattern: /^https:\/\/images\.pokemontcg\.io\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "pokemontcg-images",
        expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    /* Favicon TCGPlayer */
    {
      urlPattern: /^https:\/\/www\.tcgplayer\.com\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "tcgplayer-assets",
        expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
    /* Imágenes de cartas cdn.binderforge.com */
    {
      urlPattern: /^https:\/\/cdn\.binderforge\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "binderforge-images",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    /* Imágenes de cartas R2 (Cloudflare) */
    {
      urlPattern: /^https:\/\/pub-01b8e296fe944e688fd2100376d4af4a\.r2\.dev\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "r2-card-images",
        expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
