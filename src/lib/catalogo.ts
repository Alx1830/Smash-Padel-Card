/**
 * Los datos que necesitan las páginas públicas de set y de carta, leídos en el
 * servidor mientras se arma el HTML.
 *
 * Son páginas abiertas: nadie inició sesión, así que el cliente va sin cookies
 * —con el de servidor Next las marcaría dinámicas y se rearmarían en cada
 * visita, que es justo lo que no queremos en las páginas que tiene que rastrear
 * Google—. Todo lo que se lee acá es público: precios de mercado y
 * publicaciones ya aprobadas.
 *
 * Aun así las páginas terminan sirviéndose por pedido, porque el layout raíz
 * lee la sesión para pintar la barra de arriba y eso vuelve dinámico a todo el
 * sitio. Por eso cada consulta va envuelta en `unstable_cache`: la página se
 * arma de nuevo en cada visita, pero los datos salen de la caché y no se
 * golpea la base. Si algún día la sesión sale del layout, esto sigue siendo
 * correcto, solo deja de hacer falta.
 */

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { POKEMON_SERIES, type PokemonSet, type PokemonSeries } from "@/data/pokemon-sets";
import { SCRYDEX_SET_CODES } from "@/data/set-codes";
import { loadSetCards, SETS_CON_CARTAS, type PokemonCard } from "@/data/pokemon-cards";

function publico() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export interface SetConSerie extends PokemonSet {
  serie: PokemonSeries;
}

/**
 * Los sets que se pueden mostrar, cada uno sabiendo a qué serie pertenece.
 *
 * Se dejan afuera los que todavía no tienen archivo de cartas: su página
 * devolvería 404, y una dirección que no existe no puede estar en el índice ni
 * en el mapa del sitio.
 */
export const SETS_PUBLICOS: SetConSerie[] = POKEMON_SERIES.flatMap(serie =>
  serie.sets.filter(set => SETS_CON_CARTAS.has(set.id)).map(set => ({ ...set, serie }))
);

/** Los mismos sets, agrupados por serie, como los dibuja el índice. */
export const SERIES_PUBLICAS = POKEMON_SERIES
  .map(serie => ({ ...serie, sets: serie.sets.filter(set => SETS_CON_CARTAS.has(set.id)) }))
  .filter(serie => serie.sets.length > 0);

const POR_ID = new Map(SETS_PUBLICOS.map(s => [s.id, s]));

export function buscarSet(id: string): SetConSerie | null {
  return POR_ID.get(id) ?? null;
}

/**
 * Las cartas de un set agrupadas por número: en los archivos de `src/data/sets`
 * la misma carta aparece una vez por variante (normal, reverse holo, holo…), y
 * una página por variante serían cuatro direcciones con la misma foto y el
 * mismo texto — exactamente lo que Google llama contenido duplicado. Una carta
 * es una página, con todas sus variantes adentro.
 */
export interface CartaAgrupada {
  numero: number;
  nombre: string;
  imagen: string;
  variantes: string[];
}

/** El nombre viene con relleno de espacios en los archivos viejos del catálogo. */
function limpiar(nombre: string): string {
  return nombre.trim();
}

export async function cartasDelSet(setId: string): Promise<CartaAgrupada[]> {
  const filas: PokemonCard[] = await loadSetCards(setId);
  const porNumero = new Map<number, CartaAgrupada>();

  for (const fila of filas) {
    const ya = porNumero.get(fila.card_number);
    if (ya) {
      if (!ya.variantes.includes(fila.version)) ya.variantes.push(fila.version);
      continue;
    }
    porNumero.set(fila.card_number, {
      numero: fila.card_number,
      nombre: limpiar(fila.name),
      imagen: fila.image,
      variantes: [fila.version],
    });
  }

  return [...porNumero.values()].sort((a, b) => a.numero - b.numero);
}

export async function buscarCarta(setId: string, numero: number): Promise<CartaAgrupada | null> {
  const cartas = await cartasDelSet(setId);
  return cartas.find(c => c.numero === numero) ?? null;
}

/* ── Precios ──────────────────────────────────────────────────────────────── */

/** Precio de mercado en dólares, por variante. */
export type PreciosPorVariante = Record<string, number>;

export interface PreciosDelSet {
  /** Número de carta → { variante: precio en USD } */
  porCarta: Record<number, PreciosPorVariante>;
  /** Cuándo los actualizó el cron por última vez */
  actualizado: string | null;
}

/**
 * Los precios de todas las cartas de un set, de un solo viaje. La tabla guarda
 * el `card_id` como `<código de set>-<número>`, así que se pide el rango entero
 * con un `like` y se parte el número al volver.
 */
async function leerPreciosDelSet(setId: string): Promise<PreciosDelSet> {
  const codigo = SCRYDEX_SET_CODES[setId];
  if (!codigo) return { porCarta: {}, actualizado: null };

  try {
    const { data } = await publico()
      .from("card_prices_merged")
      .select("card_id, prices, updated_at")
      .like("card_id", `${codigo}-%`)
      .limit(2000);

    const porCarta: Record<number, PreciosPorVariante> = {};
    let actualizado: string | null = null;

    for (const fila of data ?? []) {
      const resto = String(fila.card_id).slice(codigo.length + 1);
      /* El `like` también trae los códigos que empiezan igual: "sv1-%" no, pero
         "me2-%" sí traería "me2pt5-…" si el guion no estuviera. Con el guion
         puesto, lo único que puede colarse es un sufijo que no sea un número. */
      if (!/^\d+$/.test(resto)) continue;
      porCarta[Number(resto)] = (fila.prices ?? {}) as PreciosPorVariante;
      if (fila.updated_at && (!actualizado || fila.updated_at > actualizado)) {
        actualizado = fila.updated_at as string;
      }
    }

    return { porCarta, actualizado };
  } catch {
    return { porCarta: {}, actualizado: null };
  }
}

/* Tres horas, que es cada cuánto el cron de TCGplayer refresca los precios:
   guardarlos más tiempo sería mostrar un precio viejo, y menos sería pedirle
   a la base algo que no cambió. */
export const preciosDelSet = unstable_cache(leerPreciosDelSet, ["catalogo-precios-set"], { revalidate: 10800 });

/** El precio de una sola carta, para su ficha. */
async function leerPreciosDeCarta(
  setId: string,
  numero: number
): Promise<{ precios: PreciosPorVariante; actualizado: string | null }> {
  const codigo = SCRYDEX_SET_CODES[setId];
  if (!codigo) return { precios: {}, actualizado: null };

  try {
    const { data } = await publico()
      .from("card_prices_merged")
      .select("prices, updated_at")
      .eq("card_id", `${codigo}-${numero}`)
      .maybeSingle();

    return {
      precios: (data?.prices ?? {}) as PreciosPorVariante,
      actualizado: (data?.updated_at as string) ?? null,
    };
  } catch {
    return { precios: {}, actualizado: null };
  }
}

export const preciosDeCarta = unstable_cache(leerPreciosDeCarta, ["catalogo-precios-carta"], { revalidate: 10800 });

/** El precio más alto de una carta, que es el que se muestra en la grilla. */
export function precioDestacado(precios: PreciosPorVariante | undefined): number | null {
  if (!precios) return null;
  const valores = Object.values(precios).filter(v => typeof v === "number" && v > 0);
  if (!valores.length) return null;
  return Math.max(...valores);
}

/* ── En venta en Facebinder ───────────────────────────────────────────────── */

export interface EnVenta {
  cantidad: number;
  /** El más barato, en la moneda en la que lo publicaron */
  desde: { precio: number; moneda: string } | null;
}

/**
 * Cuántas copias de una carta hay publicadas en el market. Solo cuenta las
 * aprobadas: las pendientes no son públicas ni las devuelve RLS.
 */
async function leerEnVenta(setId: string, numero: number): Promise<EnVenta> {
  try {
    const { data } = await publico()
      .from("market_listings")
      .select("price_cop, currency")
      .eq("set_id", setId)
      .eq("card_id", numero)
      .eq("status", "active")
      .eq("active", true)
      .limit(200);

    const filas = data ?? [];
    if (!filas.length) return { cantidad: 0, desde: null };

    /* Se compara solo entre publicaciones de la misma moneda: mezclar pesos con
       dólares daría "desde 3" cuando ese 3 son tres dólares. */
    const enPesos = filas.filter(f => (f.currency ?? "COP") === "COP");
    const candidatas = enPesos.length ? enPesos : filas;
    const barata = candidatas.reduce((a, b) => (a.price_cop <= b.price_cop ? a : b));

    return {
      cantidad: filas.length,
      desde: { precio: barata.price_cop, moneda: barata.currency ?? "COP" },
    };
  } catch {
    return { cantidad: 0, desde: null };
  }
}

/* Media hora: una publicación nueva tarda eso en aparecer en la ficha, y a
   cambio la ficha no consulta el market en cada visita. */
export const enVenta = unstable_cache(leerEnVenta, ["catalogo-en-venta"], { revalidate: 1800 });

/** Cuántas cartas del set hay publicadas en el market, para la página del set. */
async function leerEnVentaDelSet(setId: string): Promise<Record<number, number>> {
  try {
    const { data } = await publico()
      .from("market_listings")
      .select("card_id")
      .eq("set_id", setId)
      .eq("status", "active")
      .eq("active", true)
      .limit(2000);

    const conteo: Record<number, number> = {};
    for (const fila of data ?? []) {
      conteo[fila.card_id as number] = (conteo[fila.card_id as number] ?? 0) + 1;
    }
    return conteo;
  } catch {
    return {};
  }
}

export const enVentaDelSet = unstable_cache(leerEnVentaDelSet, ["catalogo-en-venta-set"], { revalidate: 1800 });
