import { buscarSet, cartasDelSet } from "@/lib/catalogo";

/**
 * El mapa de las cartas de un set. Lo anuncia `/sitemap-cartas.xml`.
 *
 * Va sin extensión a propósito: un mapa no la necesita, y `[set].xml` como
 * nombre de carpeta con segmento dinámico adentro es pedirle problemas al
 * enrutador.
 */

const BASE = "https://facebinder.com";

export const revalidate = 86400;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ set: string }> }
) {
  const { set: setId } = await params;

  if (!buscarSet(setId)) {
    return new Response("No existe ese set", { status: 404 });
  }

  const cartas = await cartasDelSet(setId);
  const hoy = new Date().toISOString();

  const cuerpo = cartas
    .map(carta =>
      `  <url><loc>${BASE}/carta/${setId}/${carta.numero}</loc>` +
      `<lastmod>${hoy}</lastmod>` +
      `<changefreq>weekly</changefreq>` +
      `<priority>0.6</priority></url>`
    )
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${cuerpo}\n</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
