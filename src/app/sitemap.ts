import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente anónimo, sin cookies a propósito. Con el cliente de servidor el mapa
 * leía la sesión del visitante y Next lo marcaba como dinámico: se armaba de
 * cero en cada pedido, con dos consultas de miles de filas, y tardaba más de un
 * segundo. El mapa es el mismo para todo el mundo, así que se cachea una hora.
 */
function publico() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const BASE = "https://facebinder.com";

/**
 * Mapa del sitio. Antes robots.txt anunciaba /sitemap.xml y esa dirección no
 * existía: caía en la ruta de perfiles y Google recibía el perfil de un
 * coleccionista llamado "sitemap.xml". Ahora es un mapa de verdad, con las
 * páginas fijas, los perfiles públicos y los sets.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ahora = new Date();

  const fijas: MetadataRoute.Sitemap = [
    { url: BASE,              lastModified: ahora, changeFrequency: "daily",  priority: 1 },
    { url: `${BASE}/market`,  lastModified: ahora, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/post`,    lastModified: ahora, changeFrequency: "daily",  priority: 0.9 },
    { url: `${BASE}/login`,   lastModified: ahora, changeFrequency: "monthly", priority: 0.3 },
  ];

  /* Las noticias son lo que Google puede traer por búsquedas que no tienen que
     ver con la marca ("cuándo sale tal set", "rotación 2027"). Sin esto el mapa
     no las nombraba y la única puerta era el enlace desde /post. */
  let notas: MetadataRoute.Sitemap = [];
  try {
    const supabase = publico();
    const { data } = await supabase
      .from("admin_posts")
      .select("slug, published_at, created_at, updated_at")
      .eq("status", "published")
      .not("slug", "is", null)
      .order("published_at", { ascending: false })
      .limit(2000);

    notas = (data ?? []).map(n => ({
      url: `${BASE}/post/${n.slug}`,
      lastModified: new Date((n.updated_at ?? n.published_at ?? n.created_at) as string),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    /* Igual que con los perfiles: sin base de datos el mapa sale sin notas */
  }

  /* Cada perfil público es una página que Google puede indexar: son las que
     traen visitas por el nombre del coleccionista. */
  let perfiles: MetadataRoute.Sitemap = [];
  try {
    const supabase = publico();
    const { data } = await supabase
      .from("players")
      .select("username, updated_at")
      .eq("activo", true)
      .not("username", "is", null)
      .limit(5000);

    perfiles = (data ?? []).map(p => ({
      url: `${BASE}/${encodeURIComponent(p.username as string)}`,
      lastModified: p.updated_at ? new Date(p.updated_at as string) : ahora,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    /* Sin base de datos el mapa sale igual, solo con las páginas fijas */
  }

  return [...fijas, ...notas, ...perfiles];
}
