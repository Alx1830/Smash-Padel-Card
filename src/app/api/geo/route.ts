import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Desde dónde se conecta el visitante, para el panel "En vivo".
 *
 * Lo sabe Cloudflare por la IP y lo manda con cada petición, así que no hay que
 * pedirle permiso de ubicación a nadie ni guardar la IP. El navegador lo pide
 * una vez por sesión y lo reusa en cada aviso.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let cf: Record<string, unknown> | undefined;
  try {
    cf = (await getCloudflareContext({ async: true })).cf as Record<string, unknown> | undefined;
  } catch { /* next dev: no hay Cloudflare */ }

  const texto = (v: unknown) => (typeof v === "string" && v ? v : null);
  const pais = texto(cf?.country) ?? texto(req.headers.get("cf-ipcountry"));

  return NextResponse.json(
    {
      pais:   pais && pais !== "XX" ? pais : null,
      region: texto(cf?.region),
      ciudad: texto(cf?.city),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
