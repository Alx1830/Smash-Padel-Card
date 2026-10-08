import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import mapping from "../../../../../../public/tcg-mapping.json";

/**
 * Manda al usuario a la ficha exacta de la carta en TCGplayer.
 *
 * El product_id sale del mismo mapeo que alimenta al scraper de precios
 * (public/tcg-mapping.json), y las correcciones manuales del panel de admin
 * (tcg_mapping_fixes) mandan sobre él. Si la carta no está mapeada se cae a la
 * búsqueda por nombre, que es lo que hacía la web antes.
 *
 * Va por el servidor y no por el cliente porque el mapeo pesa 600 KB: mandarlo
 * al navegador para resolver un clic no compensa.
 */

/* Cada carta del mapeo es [número, nombre, product_id, estado, variantes] */
type Row = { id: string; cards: (string | number)[][] };

/* setId → { número de carta: product_id }, armado una sola vez por instancia */
let indice: Record<string, Record<number, number>> | null = null;

function productIdDelMapeo(setId: string, cardNumber: number): number | null {
  if (!indice) {
    indice = {};
    for (const fila of (mapping as unknown as { filas: Row[] }).filas) {
      const porNumero: Record<number, number> = {};
      for (const [num, , pid] of fila.cards) {
        if (pid) porNumero[Number(num)] = Number(pid);
      }
      indice[fila.id] = porNumero;
    }
  }
  return indice[setId]?.[cardNumber] ?? null;
}

/* Versiones con ficha propia en TCGplayer (Master Ball, Poke Ball...):
   setId → número → versión en minúsculas → product_id. Un 0 es una versión
   que TCGplayer no tiene (sellos, Cosmos Holo de sets viejos): mandarla a la
   ficha de la carta común mostraría el precio de otra carta. null = la versión
   vive dentro de la ficha de la carta (Normal, Reverse Holo...). */
function productIdDeVersion(setId: string, cardNumber: number, version: string): number | null {
  const v = (mapping as unknown as { variantes?: Record<string, Record<string, Record<string, number>>> })
    .variantes?.[setId]?.[String(cardNumber)]?.[version.toLowerCase().replace(/\s+/g, "")];
  return v ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ setId: string; cardNumber: string }> },
) {
  const { setId, cardNumber } = await params;
  const num = Number(cardNumber);
  const q   = req.nextUrl.searchParams.get("q") ?? "";
  const ver = req.nextUrl.searchParams.get("v") ?? "";

  let productId: number | null = null;
  /* La versión no existe en TCGplayer: se busca por nombre, con la versión */
  const sinFicha = Number.isFinite(num) && !!ver && productIdDeVersion(setId, num, ver) === 0;

  if (Number.isFinite(num) && !sinFicha) {
    /* La corrección del admin gana: el mapeo automático pudo equivocarse */
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("tcg_mapping_fixes")
        .select("product_id")
        .eq("set_id", setId)
        .eq("card_number", num)
        .maybeSingle();
      if (data?.product_id) productId = Number(data.product_id);
    } catch { /* sin fix: seguimos con el mapeo */ }

    /* La Master Ball no está en la ficha de la carta base: tiene la suya */
    if (ver) productId ??= productIdDeVersion(setId, num, ver);
    productId ??= productIdDelMapeo(setId, num);
  }

  const destino = productId
    ? `https://www.tcgplayer.com/product/${productId}`
    : `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(q)}`;

  return NextResponse.redirect(destino, 307);
}
