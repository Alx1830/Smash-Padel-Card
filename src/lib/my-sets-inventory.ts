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

  const { data: current } = await supabase
    .from("card_inventory")
    .select("quantity")
    .eq("user_id", userId)
    .eq("card_id", card.card_id)
    .eq("set_id", card.set_id)
    .eq("language", DEFAULT_CARD_LANGUAGE)
    .eq("version", card.version)
    .maybeSingle();

  if ((current?.quantity ?? 0) >= quantity) return;

  await supabase.from("card_inventory").upsert(
    {
      user_id:  userId,
      card_id:  card.card_id,
      set_id:   card.set_id,
      version:  card.version,
      language: DEFAULT_CARD_LANGUAGE,
      quantity,
    },
    { onConflict: "user_id,card_id,set_id,version,language" },
  );
}
