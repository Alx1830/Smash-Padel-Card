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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ setId: string; cardNumber: string }> },
) {
  const { setId, cardNumber } = await params;
  const num = Number(cardNumber);
  const q   = req.nextUrl.searchParams.get("q") ?? "";

  let productId: number | null = null;

  if (Number.isFinite(num)) {
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

    productId ??= productIdDelMapeo(setId, num);
  }

  const destino = productId
    ? `https://www.tcgplayer.com/product/${productId}`
    : `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(q)}`;

  return NextResponse.redirect(destino, 307);
}
