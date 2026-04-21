import type { Metadata } from "next";
import { JetBrains_Mono, Archivo_Black } from "next/font/google";
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

export const metadata: Metadata = {
  title: "SMASH PADEL CARD",
  description: "La comunidad de jugadores de pádel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${jetbrainsMono.variable} ${archiveBlack.variable} h-full`} style={{ overflowX: "hidden" }}>
      <body className="min-h-full flex flex-col antialiased" style={{ overflowX: "hidden", maxWidth: "100vw" }} suppressHydrationWarning>{children}</body>
    </html>
  );
}
