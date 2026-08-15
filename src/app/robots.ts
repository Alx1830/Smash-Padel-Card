import type { MetadataRoute } from "next";

/**
 * Reemplaza al robots.txt estático, que anunciaba un sitemap inexistente. Lo
 * que hay que esconder de Google es el panel: son páginas privadas que además
 * gastan presupuesto de rastreo sin traer una sola visita.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/onboarding", "/api/", "/auth/"],
      },
      /* Las redes necesitan leer la página para armar la tarjeta del enlace */
      { userAgent: ["facebookexternalhit", "Twitterbot", "WhatsApp", "LinkedInBot"], allow: "/" },
    ],
    sitemap: "https://facebinder.com/sitemap.xml",
    host: "https://facebinder.com",
  };
}
