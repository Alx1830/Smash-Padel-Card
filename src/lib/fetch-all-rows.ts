/**
 * Lee TODAS las filas de una consulta, no las primeras 1000.
 *
 * PostgREST corta cualquier select en 1000 filas y no avisa: devuelve un array
 * corto sin error. Con 1007 cartas en el inventario las 7 ultimas desaparecian
 * de la grilla y del valor total, y como el corte se hace por orden fisico las
 * que faltaban eran justo las agregadas de ultimas.
 *
 * Se le pasa una funcion que arma la consulta con `.range(from, to)`; se la
 * llama por tandas hasta que una vuelva incompleta.
 *
 * La consulta TIENE que llevar `.order("id")` (o cualquier columna unica) antes
 * del `.range`. Sin orden, Postgres no garantiza que dos tandas sigan el mismo
 * recorrido: con 1106 filas, la segunda tanda repetia filas de la primera y se
 * saltaba otras, y al inventario le faltaban 18 cartas de Prize Pack (oct 2026).
 */
const PAGE = 1000;

export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await build(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}
