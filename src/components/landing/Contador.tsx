"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * Número que cuenta hacia arriba la primera vez que entra en pantalla. Si el
 * visitante pidió menos animación en su sistema, aparece el número final de
 * una: nadie debería marearse por una cifra.
 */
export function Contador({ hasta, sufijo = "" }: { hasta: number; sufijo?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [valor, setValor] = useState(0);
  const yaCorrio = useRef(false);
  const sinMovimiento = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const el = ref.current;
    if (!el || yaCorrio.current) return;

    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || yaCorrio.current) return;
      yaCorrio.current = true;

      if (sinMovimiento) { setValor(hasta); return; }

      const DURACION = 1400;
      const inicio = performance.now();
      const paso = (ahora: number) => {
        const t = Math.min(1, (ahora - inicio) / DURACION);
        /* Arranca rápido y frena al final, como un marcador mecánico */
        const suave = 1 - Math.pow(1 - t, 3);
        setValor(Math.round(hasta * suave));
        if (t < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    }, { threshold: 0.4 });

    obs.observe(el);
    return () => obs.disconnect();
  }, [hasta, sinMovimiento]);

  return <span ref={ref}>{valor.toLocaleString("es-CO")}{sufijo}</span>;
}
