import type { Metadata } from "next";
import { JetBrains_Mono, Archivo_Black } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { createClient } from "@/lib/supabase/server";
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

const BASE_URL = "https://facebinder.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  other: {
    "google-adsense-account": "ca-pub-7135029542920964",
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("players").select("photo_url, username").eq("user_id", user.id).single();
      navProps = {
        initialLoggedIn: true,
        initialPhotoUrl: data?.photo_url ?? null,
        initialUsername: data?.username ?? null,
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
