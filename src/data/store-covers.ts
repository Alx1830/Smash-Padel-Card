/**
 * Portadas autorizadas para los perfiles (todos, no solo tiendas).
 *
 * Son las únicas permitidas: la validación de verdad está en el CHECK de
 * players.cover_url (players_cover_url_check en la base), porque
 * el formulario de perfil escribe directo a la tabla desde el navegador.
 * Si se agrega o quita una portada hay que actualizar el constraint también.
 *
 * Los archivos viven en public/covers.
 */
export interface StoreCover {
  slug:  string;
  name:  string;
  /** Ruta pública, y el valor exacto que se guarda en players.cover_url */
  path:  string;
}

export const STORE_COVERS: StoreCover[] = [
  { slug: "megaevo",  name: "Mega Evolución",   path: "/covers/megaevo.webp"  },
  { slug: "30-celebration", name: "30 Celebration", path: "/covers/30-celebration.webp" },
  { slug: "pikachu",  name: "Pikachu",          path: "/covers/pikachu.webp"  },
  { slug: "pokemons", name: "Pokémons",         path: "/covers/pokemons.webp" },
];

export const STORE_COVER_PATHS = STORE_COVERS.map(c => c.path);

/**
 * Sin portada elegida (players.cover_url vacío) el perfil muestra el degradado
 * con la cuadrícula en movimiento, la portada de siempre del sitio.
 */
export const PORTADA_DEGRADADO = `radial-gradient(ellipse 80% 60% at 50% 20%, rgba(46,230,193,0.28), transparent 60%),
  radial-gradient(ellipse 60% 40% at 85% 75%, rgba(255,79,216,0.22), transparent 70%),
  radial-gradient(ellipse 60% 40% at 15% 65%, rgba(79,240,255,0.18), transparent 70%),
  linear-gradient(180deg, #0a1320 0%, #060912 100%)`;

/** Una portada vacía es válida: la tienda se queda con el degradado por defecto */
export const isValidStoreCover = (url: string | null | undefined) =>
  !url || STORE_COVER_PATHS.includes(url);
