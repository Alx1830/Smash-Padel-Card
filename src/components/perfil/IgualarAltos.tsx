"use client";

import { useEffect } from "react";

/**
 * Mide el panel de referencia (la Wishlist) y publica su alto en la variable
 * --pf-alto del Resumen; los paneles marcados como "igual" (Logros,
 * Inventario y Cartas en venta) la usan de alto mínimo. Se vuelve a medir
 * cada vez que la Wishlist cambia de tamaño: al cargar las fotos o al
 * achicar la ventana.
 *
 * La referencia no lleva ese mínimo: si lo llevara, nunca podría encogerse.
 */
export function IgualarAltos({ contenedor }: { contenedor: string }) {
  useEffect(() => {
    const raiz = document.querySelector<HTMLElement>(contenedor);
    const ref = raiz?.querySelector<HTMLElement>("[data-alto-ref]");
    if (!raiz || !ref) return;
    const ro = new ResizeObserver(() => {
      raiz.style.setProperty("--pf-alto", `${Math.round(ref.getBoundingClientRect().height)}px`);
    });
    ro.observe(ref);
    return () => ro.disconnect();
  }, [contenedor]);
  return null;
}
