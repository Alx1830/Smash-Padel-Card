import { createClient } from "@/lib/supabase/server";
import { loadManySets, SET_CARDS } from "@/data/pokemon-cards";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { getVersionLabel } from "@/data/pokemon-cards-meta";
import { formatPrice, CURRENCY_SYMBOL } from "@/lib/currency";

/**
 * Datos reales para la página de inicio. Se leen en el servidor y se cachean
 * unos minutos: la portada no necesita el dato al segundo, y sí necesita salir
 * rápido. Si Supabase falla, cada función devuelve algo vacío en vez de tumbar
 * la página — una portada sin números es mejor que una portada rota.
 */

const ALL_SETS = POKEMON_SERIES.flatMap(s => s.sets);
export const revalidate = 300;

export interface CartaEnVenta {
  id: string;
  nombre: string;
  variante: string;
  set: string;
  precio: string;
  imagen: string;
  ciudad: string | null;
  vendedor: string | null;
}

/** Cartas publicadas en el market, con su foto y su precio del día */
export async function cartasEnVenta(limite = 18): Promise<CartaEnVenta[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("market_listings")
      .select("id, card_id, set_id, version, price_cop, currency, player:players!market_listings_user_id_fkey(username, ciudad)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limite * 3);

    if (!data?.length) return [];

    const setIds = [...new Set(data.map(r => r.set_id as string))];
    try { await loadManySets(setIds); } catch { /* sin metadata no hay foto */ }

    const salida: CartaEnVenta[] = [];
    for (const row of data) {
      const r = row as unknown as {
        id: string; card_id: number | string; set_id: string; version: string | null;
        price_cop: number; currency: string | null;
        player: { username: string; ciudad: string | null } | null;
      };
      /* En market_listings el card_id es el número de la carta, no la clave
         larga del inventario: la variante viaja aparte, en `version`. */
      const delSet = SET_CARDS[r.set_id] ?? [];
      const numero = Number(r.card_id);
      const carta =
        delSet.find(c => c.card_number === numero && c.version === r.version) ??
        delSet.find(c => c.card_number === numero);
      if (!carta?.image) continue;

      const moneda = r.currency ?? "COP";
      salida.push({
        id: r.id,
        /* Varios nombres vienen rellenos de espacios desde el scraper */
        nombre: carta.name.trim(),
        variante: getVersionLabel(carta.version),
        set: ALL_SETS.find(s => s.id === r.set_id)?.name ?? r.set_id,
        precio: `${CURRENCY_SYMBOL[moneda] ?? "$"}${formatPrice(r.price_cop, moneda)}`,
        imagen: carta.image,
        ciudad: r.player?.ciudad ?? null,
        vendedor: r.player?.username ?? null,
      });
      if (salida.length >= limite) break;
    }
    return salida;
  } catch {
    return [];
  }
}

export interface ColeccionistaVisible {
  username: string;
  foto: string | null;
  ciudad: string | null;
  cartas: number;
}

/**
 * Coleccionistas con inventario de verdad, para mostrar en la portada. Vale
 * más un puñado de perfiles reales que diez testimonios inventados: cada uno
 * enlaza a su página y el visitante puede ir a comprobar que existe.
 */
export async function coleccionistasVisibles(limite = 8): Promise<ColeccionistaVisible[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("landing_coleccionistas", { limite });
    if (!Array.isArray(data)) return [];
    return (data as Record<string, unknown>[]).map(p => ({
      username: String(p.username),
      foto: (p.photo_url as string) ?? null,
      ciudad: (p.ciudad as string) ?? null,
      cartas: Number(p.cartas) || 0,
    }));
  } catch {
    return [];
  }
}

export interface NumerosDeLaCasa {
  coleccionistas: number;
  cartasRegistradas: number;
  cartasEnVenta: number;
  intercambios: number;
  sets: number;
  ciudades: number;
}

const SIN_NUMEROS: NumerosDeLaCasa = {
  coleccionistas: 0, cartasRegistradas: 0, cartasEnVenta: 0,
  intercambios: 0, sets: 0, ciudades: 0,
};

/**
 * Los números que se muestran en la portada, todos reales. Salen de una sola
 * función en la base (`landing_stats`) en lugar de seis consultas: además de
 * ser un viaje en vez de seis, esquiva las políticas de RLS que esconderían
 * filas de otros usuarios a un visitante sin cuenta.
 */
export async function numerosDeLaCasa(): Promise<NumerosDeLaCasa> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("landing_stats");
    if (!data) return SIN_NUMEROS;
    const d = data as Record<string, number>;
    return {
      coleccionistas:    d.coleccionistas     ?? 0,
      cartasRegistradas: d.cartas_registradas ?? 0,
      cartasEnVenta:     d.cartas_en_venta    ?? 0,
      intercambios:      d.intercambios       ?? 0,
      sets:              d.sets               ?? 0,
      ciudades:          d.ciudades           ?? 0,
    };
  } catch {
    return SIN_NUMEROS;
  }
}
