import { NextResponse } from "next/server";
import { trmDelDia } from "@/lib/trm";

/**
 * Dólar del día para el navegador. La lógica está en `@/lib/trm` porque las
 * páginas públicas de carta y de set también la usan, pero desde el servidor.
 */

/* Seis horas, el mismo valor que `TRM_REVALIDATE`. Escrito a mano y no
   importado porque Next lee este export sin ejecutar el módulo: con una
   constante importada la compilación falla con "Invalid segment
   configuration export". */
export const revalidate = 21600;

export async function GET() {
  const trm = await trmDelDia();
  if (!trm) {
    return NextResponse.json({ error: "No se pudo obtener el dólar de hoy" }, { status: 503 });
  }
  return NextResponse.json(trm);
}
