/**
 * Feed RSS de las noticias: facebinder.com/noticias/feed.xml
 *
 * Es la vía rápida para que una nota nueva se conozca afuera. Google Noticias,
 * los lectores de feeds y los servicios que reenvían a redes lo consultan solos
 * cada tanto; sin él la única puerta es que el rastreador pase por la portada.
 */
import { createClient } from "@supabase/supabase-js";
import { extractoAuto, etiquetaCategoria } from "@/lib/posts";
import { SITIO } from "@/lib/seo";

export const revalidate = 600;

/** & < > y comillas rompen el XML; en un título de nota aparecen seguido. */
function xml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("admin_posts")
    .select("slug, title, excerpt, content_html, content, cover_url, category, published_at, created_at")
    .eq("status", "published")
    .not("slug", "is", null)
    .order("published_at", { ascending: false })
    .limit(50);

  const notas = data ?? [];

  const items = notas.map((n) => {
    const fecha = new Date((n.published_at ?? n.created_at) as string).toUTCString();
    const resumen = n.excerpt?.trim() || extractoAuto(n.content_html ?? n.content ?? "", 300);
    const url = `${SITIO}/noticias/${n.slug}`;
    return `    <item>
      <title>${xml(n.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${fecha}</pubDate>
      <category>${xml(etiquetaCategoria(n.category))}</category>
      <description>${xml(resumen)}</description>${
        n.cover_url ? `\n      <enclosure url="${xml(n.cover_url)}" type="image/webp" />` : ""
      }
    </item>`;
  }).join("\n");

  const cuerpo = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Noticias de Pokémon TCG · FaceBinder</title>
    <link>${SITIO}/post</link>
    <atom:link href="${SITIO}/noticias/feed.xml" rel="self" type="application/rss+xml" />
    <description>Sets nuevos, rotaciones, torneos y precios de Pokémon TCG, en español.</description>
    <language>es-CO</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(cuerpo, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
