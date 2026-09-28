"use client";

import { useEffect, type RefObject } from "react";

/**
 * Mantiene un elemento `position: fixed` pegado a lo que de verdad se ve en
 * pantalla, aunque iOS se equivoque.
 *
 * El problema: en iOS (sobre todo en la app instalada) lo `fixed` se ubica
 * contra el "visor de diseño" del navegador, y a veces ese visor se despega del
 * que se ve —típico después de abrir y cerrar el teclado, o al bajar rápido
 * mientras la página crece con el scroll infinito—. Entonces la barra de abajo
 * aparece flotando en la mitad de la página. Ya se intentó arreglar dos veces
 * solo con CSS (`overflow-x: clip`, sin transform en los ancestros) y volvió.
 *
 * Esto mide con `visualViewport` cuánto se corrió el visor visible y empuja el
 * elemento esa distancia. En un navegador sano la diferencia es 0 y no hace
 * nada. Solo corrige hacia abajo: la diferencia negativa es el rebote elástico
 * de iOS al llegar arriba, y seguirlo haría temblar la barra.
 *
 * NO QUITAR de MobileTabBar: es lo que la mantiene abajo en el iPhone.
 */
export function usePegadoAlVisor(
  ref: RefObject<HTMLElement | null>,
  { ancla = "abajo", base = "", activo = true }:
  { ancla?: "abajo" | "centro"; base?: string; activo?: boolean } = {},
) {
  useEffect(() => {
    const el = ref.current;
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!activo || !el || !vv) return;

    let frame = 0;
    const corregir = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const alto = document.documentElement.clientHeight;
        const corrimiento = ancla === "abajo"
          ? vv.offsetTop + vv.height - alto
          : vv.offsetTop + (vv.height - alto) / 2;
        const dy = corrimiento > 1 ? Math.round(corrimiento) : 0;
        el.style.transform = dy ? `${base} translateY(${dy}px)`.trim() : base;
      });
    };

    corregir();
    vv.addEventListener("resize", corregir);
    vv.addEventListener("scroll", corregir);
    window.addEventListener("scroll", corregir, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", corregir);
      vv.removeEventListener("scroll", corregir);
      window.removeEventListener("scroll", corregir);
      el.style.transform = base;
    };
  }, [ref, ancla, base, activo]);
}
