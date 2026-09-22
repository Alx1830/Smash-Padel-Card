import { SETS_PUBLICOS } from "@/lib/catalogo";

/**
 * El índice de los mapas de cartas.
 *
 * Las fichas de carta son decenas de miles y no caben en `/sitemap.xml`: el
 * formato admite 50.000 direcciones por archivo, pero antes de eso el problema
 * es armarlo —habría que cargar los 193 archivos de `src/data/sets` en un solo
 * pedido y el servidor se queda sin tiempo—. Así que esto es un índice que
 * apunta a un mapa por set, y cada uno se arma solo cuando Google lo pide.
 */

const BASE = "https://facebinder.com";

export const revalidate = 86400;

export async function GET() {
  const hoy = new Date().toISOString();

  const cuerpo = SETS_PUBLICOS
    .map(set =>
      `  <sitemap><loc>${BASE}/sitemap-cartas/${set.id}</loc><lastmod>${hoy}</lastmod></sitemap>`
    )
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${cuerpo}\n</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
