/** Idiomas disponibles para una carta puesta en venta. */
export const CARD_LANGUAGES = [
  { code: "es", label: "Español",  flag: "🇪🇸" },
  { code: "en", label: "Inglés",   flag: "🇺🇸" },
  { code: "ja", label: "Japonés",  flag: "🇯🇵" },
  { code: "zh", label: "Chino",    flag: "🇨🇳" },
] as const;

export type CardLanguageCode = (typeof CARD_LANGUAGES)[number]["code"];

export function languageFlag(code?: string | null): string {
  return CARD_LANGUAGES.find(l => l.code === code)?.flag ?? "";
}

export function languageLabel(code?: string | null): string {
  return CARD_LANGUAGES.find(l => l.code === code)?.label ?? "";
}
