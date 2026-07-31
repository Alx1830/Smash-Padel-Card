/**
 * Portadas autorizadas para los perfiles de Tienda Pokémon.
 *
 * Son las únicas permitidas: la validación de verdad está en el CHECK de
 * players.cover_url (ver src/lib/supabase/store-profiles-schema.sql), porque
 * el formulario de perfil escribe directo a la tabla desde el navegador.
 * Si se agrega o quita una portada hay que actualizar el constraint también.
 *
 * Se generan con: node scripts/fetch-store-covers.mjs
 */
export interface StoreCover {
  slug:  string;
  name:  string;
  /** Ruta pública, y el valor exacto que se guarda en players.cover_url */
  path:  string;
}

export const STORE_COVERS: StoreCover[] = [
  { slug: "megaevo",  name: "Mega Evolución",   path: "/covers/megaevo.webp"  },
  { slug: "dorsos",   name: "Dorsos de cartas", path: "/covers/dorsos.webp"   },
  { slug: "pikachu",  name: "Pikachu",          path: "/covers/pikachu.webp"  },
  { slug: "energias", name: "Energías",         path: "/covers/energias.webp" },
];

export const STORE_COVER_PATHS = STORE_COVERS.map(c => c.path);

/** Una portada vacía es válida: la tienda se queda con el degradado por defecto */
export const isValidStoreCover = (url: string | null | undefined) =>
  !url || STORE_COVER_PATHS.includes(url);
