/**
 * Enlace al botón de TCGplayer. Apunta a nuestra ruta, que resuelve el
 * product_id y redirige a la ficha exacta de la carta; si la carta no está
 * mapeada cae en la búsqueda por nombre con el texto de `query`.
 */
export function tcgCardLink(
  setId: string,
  cardNumber: number | string,
  query: string,
): string {
  return `/api/tcg/${encodeURIComponent(setId)}/${encodeURIComponent(String(cardNumber))}?q=${encodeURIComponent(query)}`;
}
