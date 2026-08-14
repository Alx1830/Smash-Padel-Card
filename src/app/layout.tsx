import type { Metadata } from "next";
import { JetBrains_Mono, Archivo_Black } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { getAuthedPlayer } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { MarketTickerWrapper } from "@/components/MarketTickerWrapper";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const archiveBlack = Archivo_Black({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: "400",
});

const BASE_URL = "https://facebinder.com";

/**
 * Pantallas de arranque de iOS. Sin ellas la PWA muestra el fondo vacío hasta
 * que carga la app; iOS pinta estas imágenes al instante, antes de tocar la red.
 * Las genera scripts/generate-splash.mjs — si se agregan tamaños, sale de ahí.
 */
const APPLE_SPLASH = [
  { url: "/splash/apple-splash-1320x2868.png", media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/apple-splash-1206x2622.png", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/apple-splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/apple-splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/apple-splash-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/apple-splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/apple-splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/apple-splash-1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/apple-splash-828x1792.png",  media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
  { url: "/splash/apple-splash-750x1334.png",  media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
  { url: "/splash/apple-splash-640x1136.png",  media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
];

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  other: {
    "google-adsense-account": "ca-pub-7135029542920964",
    /* Next solo emite la meta estándar; iOS pide además la suya para
       tomar en cuenta las pantallas de arranque */
    "apple-mobile-web-app-capable": "yes",
  },
  title: {
    default: "FaceBinder — Tu binder digital de Pokémon TCG",
    template: "%s · FaceBinder",
  },
  description:
    "FaceBinder es la plataforma para coleccionistas de Pokémon TCG. Organiza tu binder digital, registra tus cartas Normal, Reverse Holo y Holofoil, sigue tu progreso por set y conecta con otros coleccionistas.",
  keywords: [
    "Pokémon TCG", "binder digital", "colección Pokémon", "cartas Pokémon",
    "Pokémon trading card game", "inventario TCG", "reverse holo", "holofoil",
    "coleccionismo Pokémon", "organizar cartas", "master set", "FaceBinder",
  ],
  authors: [{ name: "FaceBinder", url: BASE_URL }],
  creator: "Adxmedialab",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: BASE_URL,
    siteName: "FaceBinder",
    title: "FaceBinder — Tu binder digital de Pokémon TCG",
    description:
      "Organiza tu colección de cartas Pokémon TCG, registra Normales, Reverse Holo y Holofoil, y comparte tu binder con la comunidad.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FaceBinder — Binder digital de Pokémon TCG",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FaceBinder — Tu binder digital de Pokémon TCG",
    description:
      "Organiza tu colección de cartas Pokémon TCG, registra Normales, Reverse Holo y Holofoil, y comparte tu binder con la comunidad.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    title: "FaceBinder",
    statusBarStyle: "black",
    startupImage: APPLE_SPLASH,
  },
  manifest: "/manifest.json",
  themeColor: "#2ee6c1",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /* Prefetch user data once at server level — passed to Navbar to avoid client refetch */
  let navProps: { initialLoggedIn: boolean; initialPhotoUrl: string | null; initialUsername: string | null } = {
    initialLoggedIn: false, initialPhotoUrl: null, initialUsername: null,
  };
  try {
    const { user, profile } = await getAuthedPlayer();
    if (user) {
      navProps = {
        initialLoggedIn: true,
        initialPhotoUrl: profile?.photo_url ?? null,
        initialUsername: profile?.username ?? null,
      };
    }
  } catch { /* no-op: Navbar falls back to client fetch */ }

  return (
    <html lang="es" className={`${jetbrainsMono.variable} ${archiveBlack.variable} h-full`} style={{ overflowX: "hidden" }} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased" style={{ overflowX: "hidden", maxWidth: "100vw" }} suppressHydrationWarning>
        <MarketTickerWrapper />
        <Navbar {...navProps} />
        {children}
        <Analytics />
        <SpeedInsights />
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(function() {});
          }
        `}</Script>
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7135029542920964"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
