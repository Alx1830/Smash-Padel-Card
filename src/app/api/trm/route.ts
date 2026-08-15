import { NextResponse } from "next/server";

/**
 * Dólar del día en pesos colombianos.
 *
 * La fuente es la TRM oficial del Banco de la República (vía datos.gov.co), que
 * es la referencia que usa todo el mundo en Colombia. Si no responde se cae a
 * una tasa de mercado, para no dejar la comparación de precios sin dato.
 *
 * Se cachea 6 horas: la TRM cambia una vez al día.
 */

const TRM_OFICIAL = "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC";
const RESPALDO    = "https://open.er-api.com/v6/latest/USD";

export const revalidate = 21600;

export async function GET() {
  try {
    const res = await fetch(TRM_OFICIAL, { next: { revalidate } });
    if (res.ok) {
      const [fila] = await res.json();
      const valor = Number(fila?.valor);
      if (valor > 0) {
        return NextResponse.json({
          cop: valor,
          fecha: String(fila.vigenciadesde ?? "").slice(0, 10),
          fuente: "TRM Banco de la República",
        });
      }
    }
  } catch { /* seguimos con el respaldo */ }

  try {
    const res = await fetch(RESPALDO, { next: { revalidate } });
    if (res.ok) {
      const json = await res.json();
      const valor = Number(json?.rates?.COP);
      if (valor > 0) {
        return NextResponse.json({
          cop: valor,
          fecha: new Date().toISOString().slice(0, 10),
          fuente: "Tasa de mercado",
        });
      }
    }
  } catch { /* sin dato */ }

  return NextResponse.json({ error: "No se pudo obtener el dólar de hoy" }, { status: 503 });
}
