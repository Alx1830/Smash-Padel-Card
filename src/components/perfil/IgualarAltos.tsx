"use client";

import { useEffect } from "react";

/**
 * Logros, Wishlist, Decks públicos y Cartas en venta (los paneles "igual")
 * miden todos lo mismo: el alto del más alto de los cuatro, que se publica en
 * la variable --pf-alto del Resumen y ellos usan de alto mínimo. Así las dos
 * filas que forman (Logros | Wishlist y Decks | Cartas en venta) empiezan y
 * terminan en la misma línea, tengan cartas o estén vacíos.
 *
 * Para medir se quita un momento la variable: si no, el mínimo impuesto se
 * mediría a sí mismo y los paneles nunca podrían encogerse. Se vuelve a medir
 * cada vez que alguno cambia de tamaño: al cargar las fotos o al achicar la
 * ventana.
 */
export function IgualarAltos({ contenedor }: { contenedor: string }) {
  useEffect(() => {
    const raiz = document.querySelector<HTMLElement>(contenedor);
    const paneles = raiz ? Array.from(raiz.querySelectorAll<HTMLElement>(".pf-igual")) : [];
    if (!raiz || !paneles.length) return;
    const medir = () => {
      raiz.style.removeProperty("--pf-alto");
      const alto = Math.max(...paneles.map(p => p.getBoundingClientRect().height));
      raiz.style.setProperty("--pf-alto", `${Math.ceil(alto)}px`);
    };
    const ro = new ResizeObserver(medir);
    paneles.forEach(p => ro.observe(p));
    return () => ro.disconnect();
  }, [contenedor]);
  return null;
}
