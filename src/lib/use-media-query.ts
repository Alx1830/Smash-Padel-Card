import { useSyncExternalStore } from "react";

/**
 * Lee una media query sin sincronizar estado a mano. Va por
 * useSyncExternalStore porque el navegador es la fuente de la verdad: guardar
 * el valor en useState dentro de un efecto provoca un pintado de más y ESLint
 * lo marca como error en este proyecto.
 *
 * En el servidor devuelve false: nadie sabe todavía cómo es la pantalla.
 */
export function useMediaQuery(consulta: string): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia(consulta);
      mq.addEventListener("change", avisar);
      return () => mq.removeEventListener("change", avisar);
    },
    () => window.matchMedia(consulta).matches,
    () => false,
  );
}
