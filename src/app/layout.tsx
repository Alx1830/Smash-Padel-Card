import type { Metadata } from "next";
import { JetBrains_Mono, Archivo_Black } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${jetbrainsMono.variable} ${archiveBlack.variable} h-full`} style={{ overflowX: "hidden" }} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased" style={{ overflowX: "hidden", maxWidth: "100vw" }} suppressHydrationWarning>
        {children}
        <Analytics />
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7135029542920964"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
