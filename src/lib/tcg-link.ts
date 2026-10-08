/**
 * Enlace al botón de TCGplayer. Apunta a nuestra ruta, que resuelve el
 * product_id y redirige a la ficha exacta de la carta; si la carta no está
 * mapeada cae en la búsqueda por nombre con el texto de `query`.
 *
 * `version` (masterBallReverseHolofoil, pokeBallReverseHolofoil...) lleva a la
 * ficha propia de esa versión cuando TCGplayer la vende como producto aparte.
 */
export function tcgCardLink(
  setId: string,
  cardNumber: number | string,
  query: string,
  version?: string | null,
): string {
  const v = version ? `&v=${encodeURIComponent(version)}` : "";
  return `/api/tcg/${encodeURIComponent(setId)}/${encodeURIComponent(String(cardNumber))}?q=${encodeURIComponent(query)}${v}`;
}
