/**
 * Escapa los comodines de un `ilike` (`%`, `_` y la barra invertida) para buscar
 * el texto tal cual, sin distinguir mayúsculas.
 *
 * Los nombres de usuario admiten `_`: sin escapar, la URL /a_b abría el perfil
 * de "axb", y esa página quedaba guardada en la caché.
 */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}
