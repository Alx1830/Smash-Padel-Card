import type { SupabaseClient } from "@supabase/supabase-js";
import { SCRYDEX_SET_CODES } from "@/data/set-codes";
import { fetchAllRows } from "@/lib/fetch-all-rows";

/** Valor del inventario calculado en este momento, sin esperar al cron. */
export type ValorActual = { total_usd: number; copias: number; unicas: number };

/**
 * La ÚNICA cuenta del valor de un inventario en la app, la misma que hace
 * `snapshot_hourly_portfolios` en la base: precio de la versión, o con mayúscula
 * inicial, o el normal, por cantidad. La usan el dashboard y el perfil.
 *
 * Antes el dashboard tenía su propia copia: leía los precios de una vez (se
 * cortaba en 1000), aceptaba números como "12a" y escribía el resultado en el
 * historial. Así quedó grabado un valor falso de $809 (oct 2026).
 *
 * Si una lectura falla, lanza: es mejor no mostrar un valor que mostrar uno bajo.
 */
export async function valorActualDe(supabase: SupabaseClient, userId: string): Promise<ValorActual | null> {
  const filas = await fetchAllRows<{ card_id: string | number; set_id: string; version: string | null; quantity: number }>(
    () => supabase.from("card_inventory")
      .select("card_id, set_id, version, quantity").eq("user_id", userId).gt("quantity", 0));
  if (!filas.length) return null;

  const llaveDe = (f: { card_id: string | number; set_id: string }) => {
    const code = SCRYDEX_SET_CODES[f.set_id];
    const numero = String(f.card_id).split(":")[0];
    return code && /^\d+$/.test(numero) ? `${code}-${parseInt(numero, 10)}` : null;
  };
  const llaves = [...new Set(filas.map(llaveDe).filter((k): k is string => !!k))];

  // De a 200: con más ids la URL se vuelve demasiado larga y el pedido falla.
  const precios = new Map<string, Record<string, number>>();
  for (let i = 0; i < llaves.length; i += 200) {
    const { data, error } = await supabase
      .from("card_prices_merged").select("card_id, prices").in("card_id", llaves.slice(i, i + 200));
    if (error) throw new Error(`No se pudieron leer los precios: ${error.message}`);
    for (const r of data ?? []) precios.set(r.card_id, r.prices as Record<string, number>);
  }

  let total = 0, copias = 0;
  const unicas = new Set<string>();
  for (const f of filas) {
    copias += f.quantity;
    unicas.add(`${f.set_id}|${f.card_id}`);
    const llave = llaveDe(f);
    const p = llave ? precios.get(llave) : undefined;
    if (!p) continue;
    const v = f.version || "normal";
    const precio = Number(p[v] ?? p[v.charAt(0).toUpperCase() + v.slice(1)] ?? p.normal ?? 0);
    total += precio * f.quantity;
  }
  return { total_usd: Math.round(total * 100) / 100, copias, unicas: unicas.size };
}
