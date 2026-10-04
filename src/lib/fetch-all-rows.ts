/**
 * Lee TODAS las filas de una consulta, sin tope: 1.000, 5.000 o 50.000.
 *
 * PostgREST corta cualquier select en 1000 filas y no avisa: devuelve un array
 * corto sin error. Por eso se lee por tandas de 1000 hasta que una vuelva
 * incompleta. Con 5.000 cartas son 5 pedidos.
 *
 * Se le pasa la consulta SIN `.order()` ni `.range()`: los pone este helper,
 * para que no se puedan olvidar. Las dos veces que se olvidaron costaron caro:
 *   · sin tandas, al inventario de 1007 filas le faltaban las 7 ultimas;
 *   · con tandas pero sin orden, Postgres no recorria igual cada tanda: con
 *     1106 filas repetia 83 y se saltaba otras 83 (Prize Pack mostraba 26 de
 *     44 cartas y el portafolio guardo un valor inflado, oct 2026).
 *
 * Si una tanda falla se reintenta; si sigue fallando se lanza el error. Antes
 * se cortaba en silencio y la pagina mostraba un inventario a medias como si
 * estuviera completo.
 *
 *   const filas = await fetchAllRows(() => supabase
 *     .from("card_inventory").select("card_id, quantity").eq("user_id", uid));
 */
const PAGE = 1000;
const REINTENTOS = 3;

type Tanda<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Lo único que el helper necesita de una consulta de Supabase. */
interface Consulta<T> {
  order(columna: string, opciones?: { ascending?: boolean }): {
    range(desde: number, hasta: number): Tanda<T>;
  };
}

export async function fetchAllRows<T>(
  consulta: () => Consulta<T>,
  /** Columna única por la que se ordena. Todas las tablas que se leen así tienen `id`. */
  columnaUnica = "id",
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const data = await leerTanda(consulta, columnaUnica, from);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

async function leerTanda<T>(consulta: () => Consulta<T>, columna: string, from: number): Promise<T[]> {
  for (let intento = 1; ; intento++) {
    const { data, error } = await consulta().order(columna, { ascending: true }).range(from, from + PAGE - 1);
    if (!error) return data ?? [];
    if (intento >= REINTENTOS) {
      throw new Error(`No se pudieron leer todas las filas (tanda desde ${from}): ${error.message}`);
    }
    await new Promise(r => setTimeout(r, 400 * intento));
  }
}
