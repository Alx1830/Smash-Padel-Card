"use client";

import { useCallback, useState } from "react";

/**
 * Lleva un error de una carga asíncrona (un efecto, un `.then`) hasta el
 * error.tsx más cercano, que muestra "No pudimos cargar esta página" con un
 * botón de reintentar.
 *
 * Sin esto, cuando fetchAllRows lanzaba en medio de un efecto la promesa se
 * rechazaba sin nadie que la atrapara y la pantalla se quedaba en "Cargando"
 * para siempre.
 *
 *   const fallar = useErrorDeCarga();
 *   useEffect(() => { cargar().catch(fallar); }, []);
 */
export function useErrorDeCarga() {
  const [error, setError] = useState<Error | null>(null);
  if (error) throw error;
  return useCallback((e: unknown) => {
    setError(e instanceof Error ? e : new Error(String(e)));
  }, []);
}
