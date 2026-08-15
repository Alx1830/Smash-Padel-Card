import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

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
    { url: `${BASE}/login`,   lastModified: ahora, changeFrequency: "monthly", priority: 0.3 },
  ];

  /* Cada perfil público es una página que Google puede indexar: son las que
     traen visitas por el nombre del coleccionista. */
  let perfiles: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
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

  return [...fijas, ...perfiles];
}
