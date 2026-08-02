/** Idiomas disponibles para una carta, tanto en el inventario como en venta. */
export const CARD_LANGUAGES = [
  { code: "es", label: "Español",  flag: "🇪🇸" },
  { code: "en", label: "Inglés",   flag: "🇺🇸" },
  { code: "ja", label: "Japonés",  flag: "🇯🇵" },
  { code: "zh", label: "Chino",    flag: "🇨🇳" },
] as const;

export type CardLanguageCode = (typeof CARD_LANGUAGES)[number]["code"];

/**
 * El catálogo sale de TCGplayer, que es inglés. Quien agregó cartas antes de
 * que existiera esta columna estaba mirando cartas inglesas, así que el inglés
 * es el default tanto para las filas viejas como para las nuevas.
 */
export const DEFAULT_CARD_LANGUAGE = "en";

/**
 * Idiomas que se pueden registrar en el inventario.
 *
 * Es un subconjunto de CARD_LANGUAGES a proposito: el chino se queda fuera
 * porque en la practica nadie colecciona en chino, y cada idioma de mas es una
 * fila de contadores mas en cada carta del panel de agregar. Sigue estando en
 * CARD_LANGUAGES para que las publicaciones de venta que ya existan en chino
 * conserven su bandera y su nombre.
 */
export const INVENTORY_LANGUAGES = CARD_LANGUAGES.filter(
  l => l.code === "en" || l.code === "es" || l.code === "ja",
).sort((a, b) => ["en", "es", "ja"].indexOf(a.code) - ["en", "es", "ja"].indexOf(b.code));

/** Código corto para el badge del inventario: EN, ES, JA, ZH. */
export function languageShort(code?: string | null): string {
  return (code ?? DEFAULT_CARD_LANGUAGE).toUpperCase();
}

export function languageFlag(code?: string | null): string {
  return CARD_LANGUAGES.find(l => l.code === code)?.flag ?? "";
}

export function languageLabel(code?: string | null): string {
  return CARD_LANGUAGES.find(l => l.code === code)?.label ?? "";
}
