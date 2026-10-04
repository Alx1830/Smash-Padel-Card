/**
 * Las energías que se pueden elegir como favorita. Van sin emoji: la interfaz
 * no lleva emojis (siempre iconos de lucide). Antes el emoji se guardaba en la
 * base junto al nombre ("🔥 Fuego").
 */
export const ENERGIAS = [
  "Planta", "Fuego", "Agua", "Eléctrica/Rayo", "Psíquica",
  "Lucha", "Oscuridad", "Metal", "Dragón", "Hada",
] as const;

export const ENERGIA_OPTS = ENERGIAS.map(e => ({ value: e, label: e }));

/** "🔥 Fuego" → "Fuego". Limpia los valores guardados antes del cambio. */
export function limpiarEnergia(valor: string | null | undefined): string {
  return (valor ?? "").replace(/^[^\p{L}]+/u, "").trim();
}
