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
  title: "Facebinder",
  description: "Tu binder digital de cartas Pokémon TCG. Crea comunidad y lleva el control de tu colección.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${jetbrainsMono.variable} ${archiveBlack.variable} h-full`} style={{ overflowX: "hidden" }} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased" style={{ overflowX: "hidden", maxWidth: "100vw" }} suppressHydrationWarning>{children}</body>
    </html>
  );
}
