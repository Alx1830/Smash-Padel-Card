"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

export type ScrydexPrices = Record<string, number>; // { normal: 0.25, reverseHolofoil: 0.50 }

interface UseScrydexPriceOptions {
  setSlug: string;   // "chaos-rising"
  setCode: string;   // "me4"
  cardName: string;  // "Weedle"
  cardNumber: number;
  enabled?: boolean;
}

interface UseScrydexPriceResult {
  prices: ScrydexPrices | null;
  loading: boolean;
  error: string | null;
}

/* La tabla de códigos se mudó a `@/data/set-codes`: desde un componente de
   servidor no se puede leer un valor exportado por un módulo `"use client"`,
   y las páginas públicas de carta y de set la necesitan ahí. Se vuelve a
   exportar para no tocar a quienes ya la importaban de este archivo. */
export { SCRYDEX_SET_CODES } from "@/data/set-codes";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ── Pedidos en paquete ─────────────────────────────────────────────────────
   Cada carta de una grilla usa este hook por su cuenta, y antes cada una era
   una consulta: abrir un set de 300 cartas eran 300 viajes a la base, y cada
   viaje queda anotado en los registros de Supabase, que tienen cupo mensual.
   Ahora los pedidos que llegan casi juntos se esperan un instante y salen en
   una sola consulta, y lo ya traído se recuerda unos minutos. */

/** Cuánto se espera a que lleguen más pedidos antes de salir. */
const ESPERA_MS = 25;
/** Cartas por consulta: más largas, la dirección de la consulta no entra. */
const LOTE = 150;
/** Cuánto vale un precio ya traído antes de volver a pedirlo. */
const VIGENCIA_MS = 5 * 60_000;

type Respuesta = ScrydexPrices | null;

const guardados = new Map<string, { precios: Respuesta; hora: number }>();
const enCamino  = new Map<string, Promise<Respuesta>>();
let pendientes  = new Map<string, Array<(p: Respuesta) => void>>();
let programado: ReturnType<typeof setTimeout> | null = null;

async function vaciarCola() {
  programado = null;
  const tanda = pendientes;
  pendientes = new Map();

  const ids = [...tanda.keys()];
  const lotes: string[][] = [];
  for (let i = 0; i < ids.length; i += LOTE) lotes.push(ids.slice(i, i + LOTE));

  await Promise.all(lotes.map(async (lote) => {
    const { data, error } = await supabase
      .from("card_prices_merged")
      .select("card_id, prices")
      .in("card_id", lote);
    const porId = new Map((data ?? []).map((f) => [f.card_id as string, f.prices as ScrydexPrices]));

    for (const id of lote) {
      const precios = porId.get(id) ?? null;
      /* Un error de red no se recuerda: el próximo pedido lo vuelve a intentar. */
      if (!error) guardados.set(id, { precios, hora: Date.now() });
      enCamino.delete(id);
      tanda.get(id)?.forEach((responder) => responder(precios));
    }
  }));
}

function pedirPrecio(cardId: string): Promise<Respuesta> {
  const guardado = guardados.get(cardId);
  if (guardado && Date.now() - guardado.hora < VIGENCIA_MS) return Promise.resolve(guardado.precios);

  const yaPedido = enCamino.get(cardId);
  if (yaPedido) return yaPedido;

  const promesa = new Promise<Respuesta>((responder) => {
    const esperando = pendientes.get(cardId) ?? [];
    esperando.push(responder);
    pendientes.set(cardId, esperando);
    programado ??= setTimeout(vaciarCola, ESPERA_MS);
  });
  enCamino.set(cardId, promesa);
  return promesa;
}

export function useScrydexPrice({
  setCode,
  cardNumber,
  enabled = true,
}: UseScrydexPriceOptions): UseScrydexPriceResult {
  const activo = enabled && !!setCode;
  const cardId = `${setCode}-${cardNumber}`;

  /* El resultado lleva la carta a la que pertenece: si la carta cambia, el
     resultado viejo deja de valer solo, sin tener que borrarlo en un efecto. */
  const [resultado, setResultado] = useState<{ id: string; precios: Respuesta } | null>(null);

  useEffect(() => {
    if (!activo) return;
    let cancelado = false;
    pedirPrecio(cardId).then((precios) => {
      if (!cancelado) setResultado({ id: cardId, precios });
    });
    return () => { cancelado = true; };
  }, [activo, cardId]);

  const vigente = activo && resultado?.id === cardId ? resultado : null;
  return {
    prices:  vigente?.precios ?? null,
    loading: activo && !vigente,
    error:   vigente && !vigente.precios ? "Sin precio" : null,
  };
}
