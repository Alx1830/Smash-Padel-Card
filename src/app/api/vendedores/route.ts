import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Datos de contacto de los vendedores que aparecen en el market.
 *
 * El WhatsApp ya no se puede leer de `players` con la llave pública: antes
 * cualquiera bajaba la tabla entera de teléfonos sin sesión. Pero comprar sin
 * registro es a propósito (se abre el WhatsApp del vendedor), así que el market
 * lo pide aquí, y solo sale de quien tiene publicaciones activas. El proxy le
 * pone límite por minuto (RL_PUBLICO).
 */
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS = 60;

export async function GET(req: NextRequest) {
  const ids = [...new Set((req.nextUrl.searchParams.get("ids") ?? "").split(","))]
    .filter(id => UUID.test(id))
    .slice(0, MAX_IDS);
  if (ids.length === 0) return NextResponse.json({ vendedores: [] });

  const { data: activos, error: e1 } = await supabaseAdmin
    .from("market_listings").select("user_id").eq("status", "active").in("user_id", ids);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const conPublicacion = [...new Set((activos ?? []).map(a => a.user_id as string))];
  if (conPublicacion.length === 0) return NextResponse.json({ vendedores: [] });

  const { data, error } = await supabaseAdmin
    .from("players")
    .select("user_id, username, pais, ciudad, whatsapp_indicativo, whatsapp_numero")
    .in("user_id", conPublicacion)
    .neq("activo", false);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { vendedores: data ?? [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
