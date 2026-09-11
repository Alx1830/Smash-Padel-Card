/**
 * La misma carta, en el tamaño que hace falta.
 *
 * En R2 cada carta vive en dos direcciones que solo se diferencian en la última
 * palabra: `.../<carta>/large` es la original (~190 KB, 734 px de ancho) y
 * `.../<carta>/small` una copia de 450 px (~45 KB), que genera
 * `scripts/generate-r2-thumbs.mjs`.
 *
 * Las direcciones grandes están escritas a mano en los archivos de
 * `src/data/sets/`, cuarenta mil veces, y ahí se quedan: la vista de una carta
 * sola sí quiere la original. Esta función se usa en el otro caso —grillas,
 * carruseles, listas— donde la carta se ve del tamaño de una estampilla y
 * bajar 190 KB para pintar 120 px es tirar los datos del celular.
 *
 * Si la dirección no es de las nuestras vuelve intacta, así que es seguro
 * pasarle la foto de cualquier origen.
 */
export function fotoChica(url: string | null | undefined): string {
  if (!url) return "";
  return url.replace(/\/large(\?|$)/, "/small$1");
}
