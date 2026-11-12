/**
 * Texto en minúsculas y sin tildes, para buscar cartas por nombre.
 *
 * TCGplayer escribe algunos nombres sin tilde ("Poke Pad" en Prize Pack) y
 * otros sets con tilde ("Poké Pad"): sin esto, buscar "poké pad" no encontraba
 * la de Prize Pack. El índice de nombres (card-name-index.ts) ya se genera así.
 */
/** Las tildes sueltas que deja NFD: U+0300 a U+036F */
const TILDES = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, "g");

export function sinTildes(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(TILDES, "");
}
