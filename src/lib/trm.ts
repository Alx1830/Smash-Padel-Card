/**
 * Dólar del día en pesos colombianos.
 *
 * Vivía dentro de `/api/trm`, que solo sirve al navegador. Las páginas públicas
 * de carta y de set lo necesitan en el servidor, mientras arman el HTML: pedirle
 * a la app su propia ruta desde adentro es un viaje de red al pedo, así que la
 * lógica se mudó acá y la ruta pasó a ser una cáscara.
 *
 * La fuente es la TRM oficial del Banco de la República (vía datos.gov.co), que
 * es la referencia que usa todo el mundo en Colombia. Si no responde se cae a
 * una tasa de mercado, para no dejar la comparación de precios sin dato.
 */

const TRM_OFICIAL = "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC";
const RESPALDO    = "https://open.er-api.com/v6/latest/USD";

/** Seis horas: la TRM cambia una vez al día. */
export const TRM_REVALIDATE = 21600;

export interface Trm {
  cop: number;
  fecha: string;
  fuente: string;
}

export async function trmDelDia(): Promise<Trm | null> {
  try {
    const res = await fetch(TRM_OFICIAL, { next: { revalidate: TRM_REVALIDATE } });
    if (res.ok) {
      const [fila] = await res.json();
      const valor = Number(fila?.valor);
      if (valor > 0) {
        return {
          cop: valor,
          fecha: String(fila.vigenciadesde ?? "").slice(0, 10),
          fuente: "TRM Banco de la República",
        };
      }
    }
  } catch { /* seguimos con el respaldo */ }

  try {
    const res = await fetch(RESPALDO, { next: { revalidate: TRM_REVALIDATE } });
    if (res.ok) {
      const json = await res.json();
      const valor = Number(json?.rates?.COP);
      if (valor > 0) {
        return {
          cop: valor,
          fecha: new Date().toISOString().slice(0, 10),
          fuente: "Tasa de mercado",
        };
      }
    }
  } catch { /* sin dato */ }

  return null;
}
