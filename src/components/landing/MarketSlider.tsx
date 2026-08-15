"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { useMediaQuery } from "@/lib/use-media-query";
import type { CartaEnVenta } from "@/lib/landing-data";

const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";

/**
 * Carrusel de cartas que están de verdad en venta ahora mismo. Se arrastra con
 * el dedo o el mouse y avanza solo mientras nadie lo toca — si el visitante lo
 * agarra, se queda quieto hasta que lo suelta.
 */
export function MarketSlider({ cartas }: { cartas: CartaEnVenta[] }) {
  const pista = useRef<HTMLDivElement>(null);
  const [quieto, setQuieto] = useState(false);
  const arrastre = useRef<{ x: number; scroll: number } | null>(null);
  const enPantalla = useRef(false);
  const sinMovimiento = useMediaQuery("(prefers-reduced-motion: reduce)");

  /* El carrusel solo se mueve cuando se está viendo: dejarlo corriendo en una
     pestaña de fondo o fuera de la vista es gastar batería por nada. */
  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { enPantalla.current = e.isIntersecting; }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (quieto || sinMovimiento || !cartas.length) return;
    const el = pista.current;
    if (!el) return;

    let vivo = true;
    let anterior = performance.now();
    const paso = (ahora: number) => {
      if (!vivo) return;
      const dt = ahora - anterior;
      anterior = ahora;
      /* Va atado al reloj, no al número de cuadros: en una pantalla de 120Hz
         corría al doble de velocidad que en una de 60. */
      if (enPantalla.current && document.visibilityState === "visible") {
        const fin = el.scrollWidth - el.clientWidth - 4;
        el.scrollLeft = el.scrollLeft >= fin ? 0 : el.scrollLeft + (dt * 0.055);
      }
      requestAnimationFrame(paso);
    };
    const id = requestAnimationFrame(paso);
    return () => { vivo = false; cancelAnimationFrame(id); };
  }, [quieto, sinMovimiento, cartas.length]);

  if (!cartas.length) return null;

  function agarrar(x: number) {
    if (!pista.current) return;
    arrastre.current = { x, scroll: pista.current.scrollLeft };
    setQuieto(true);
  }
  function mover(x: number) {
    if (!arrastre.current || !pista.current) return;
    pista.current.scrollLeft = arrastre.current.scroll - (x - arrastre.current.x);
  }
  function soltar() {
    arrastre.current = null;
    setQuieto(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <style>{`
        .ms-pista {
          display: flex; gap: 16px; overflow-x: auto; padding: 6px 4px 20px;
          scrollbar-width: none; -ms-overflow-style: none;
          scroll-behavior: auto; cursor: grab;
        }
        .ms-pista::-webkit-scrollbar { display: none; }
        .ms-pista:active { cursor: grabbing; }
        .ms-carta {
          flex: 0 0 auto; width: 168px; user-select: none;
          transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ms-carta:hover { transform: translateY(-8px); }
        .ms-carta:hover .ms-foto { box-shadow: 0 18px 44px rgba(0,0,0,0.7), 0 0 0 1px ${COURT}55; }
        .ms-foto {
          width: 100%; aspect-ratio: 5 / 7; object-fit: cover; border-radius: 10px;
          background: rgba(255,255,255,0.04); pointer-events: none;
          transition: box-shadow 0.25s ease;
        }
        /* Difuminado en los bordes: la fila se pierde en el fondo en vez de
           cortarse con una línea recta */
        .ms-marco::before, .ms-marco::after {
          content: ""; position: absolute; top: 0; bottom: 0; width: 90px;
          pointer-events: none; z-index: 2;
        }
        .ms-marco::before { left: 0;  background: linear-gradient(90deg, #05070d, transparent); }
        .ms-marco::after  { right: 0; background: linear-gradient(270deg, #05070d, transparent); }
        @media (max-width: 767px) {
          .ms-carta { width: 132px; }
          .ms-marco::before, .ms-marco::after { width: 40px; }
        }
      `}</style>

      <div className="ms-marco" style={{ position: "relative" }}>
        <div
          ref={pista}
          className="ms-pista"
          onMouseDown={e => agarrar(e.pageX)}
          onMouseMove={e => arrastre.current && mover(e.pageX)}
          onMouseUp={soltar}
          onMouseLeave={soltar}
          onTouchStart={e => agarrar(e.touches[0].pageX)}
          onTouchMove={e => mover(e.touches[0].pageX)}
          onTouchEnd={soltar}
        >
          {cartas.map(c => (
            <Link key={c.id} href="/market" className="ms-carta" style={{ textDecoration: "none" }} draggable={false}>
              <img className="ms-foto" src={c.imagen} alt={`${c.nombre} — ${c.variante}`} loading="lazy" decoding="async" draggable={false} />
              <p style={{
                fontFamily: MONO, fontSize: 11, color: INK0, margin: "9px 0 0",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{c.nombre}</p>
              <p style={{
                fontFamily: MONO, fontSize: 8.5, color: INK2, margin: "2px 0 0",
                letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{c.variante} · {c.set}</p>
              <p style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: LIME, margin: "5px 0 0" }}>
                {c.precio}
              </p>
              {c.ciudad && (
                <p style={{
                  fontFamily: MONO, fontSize: 8.5, color: INK2, margin: "3px 0 0",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <MapPin size={9} /> {c.ciudad}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
