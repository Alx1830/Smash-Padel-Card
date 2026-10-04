import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CARD_LANGUAGE } from "@/lib/languages";

/**
 * Las cartas que entran a un set personalizado son cartas que el jugador tiene,
 * asi que deben reflejarse en el inventario.
 *
 * Garantiza que el inventario tenga AL MENOS `quantity` copias de la carta.
 * No suma sobre lo existente: si el jugador ya registro 3 copias y su set usa 1,
 * el inventario se queda en 3. Asi editar el set repetidas veces nunca infla
 * el inventario ni pisa un conteo mayor que el jugador puso a mano.
 */
export async function ensureInInventory(
  supabase: SupabaseClient,
  userId: string,
  card: { card_id: number | string; set_id: string; version: string },
  quantity: number,
) {
  if (!userId || quantity <= 0) return;

  // Cuenta las copias de TODOS los idiomas: si ya tiene la carta en español, el
  // set no debe inventarle una copia en inglés.
  const { data: filas, error } = await supabase
    .from("card_inventory")
    .select("quantity, language")
    .eq("user_id", userId)
    .eq("card_id", card.card_id)
    .eq("set_id", card.set_id)
    .eq("version", card.version);
  // Sin poder leer no se escribe: antes un fallo aquí terminaba pisando un
  // conteo mayor con el del set.
  if (error) throw new Error(`No se pudo leer el inventario: ${error.message}`);

  const total = (filas ?? []).reduce((s, f) => s + (f.quantity ?? 0), 0);
  if (total >= quantity) return;

  const enDefecto = (filas ?? []).find(f => f.language === DEFAULT_CARD_LANGUAGE)?.quantity ?? 0;
  const { error: eGuardar } = await supabase.from("card_inventory").upsert(
    {
      user_id:  userId,
      card_id:  card.card_id,
      set_id:   card.set_id,
      version:  card.version,
      language: DEFAULT_CARD_LANGUAGE,
      quantity: enDefecto + (quantity - total),
    },
    { onConflict: "user_id,card_id,set_id,version,language" },
  );
  if (eGuardar) throw new Error(`No se pudo guardar en el inventario: ${eGuardar.message}`);
}
