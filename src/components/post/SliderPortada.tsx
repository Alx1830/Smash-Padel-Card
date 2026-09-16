"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fechaLarga, etiquetaCategoria } from "@/lib/posts";
import { MediaNota } from "./MediaNota";

export interface NotaSlider {
  id: string;
  slug: string | null;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  category: string | null;
  published_at: string | null;
  created_at: string;
}

/** Cada cuánto cambia sola. */
const CADA = 3000;

/**
 * Las cinco noticias del momento, una atrás de otra.
 *
 * Las cinco están escritas en la página desde el primer momento y lo que cambia
 * es cuál se ve: así el buscador lee los cinco titulares y no solo el que quedó
 * arriba cuando pasó. Por lo mismo la que se va no se desmonta, se apaga.
 *
 * Se detiene sola cuando el puntero está encima, cuando algo adentro tiene el
 * foco del teclado y cuando la pestaña no se está mirando — una portada que
 * sigue girando mientras alguien lee el resumen es una portada que se le mueve
 * de abajo del dedo.
 */
export function SliderPortada({ notas }: { notas: NotaSlider[] }) {
  const [actual, setActual] = useState(0);
  const [quieto, setQuieto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  const total = notas.length;
  const ir = useCallback((i: number) => setActual(((i % total) + total) % total), [total]);

  useEffect(() => {
    if (total < 2 || quieto) return;
    /* Quien pidió menos movimiento en su sistema no quiere una portada que
       gire sola: se le deja la primera y las flechas. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const reloj = window.setInterval(() => {
      if (document.visibilityState === "visible") setActual((i) => (i + 1) % total);
    }, CADA);
    return () => window.clearInterval(reloj);
  }, [total, quieto]);

  if (total === 0) return null;

  return (
    <div
      ref={caja}
      className="np-slider"
      onMouseEnter={() => setQuieto(true)}
      onMouseLeave={() => setQuieto(false)}
      onFocusCapture={() => setQuieto(true)}
      onBlurCapture={(e) => {
        if (!caja.current?.contains(e.relatedTarget as Node | null)) setQuieto(false);
      }}
      aria-roledescription="carrusel"
      aria-label="Noticias destacadas"
    >
      {notas.map((nota, i) => (
        <Link
          key={nota.id}
          href={`/noticias/${nota.slug}`}
          className="np-slide"
          /* La que no se ve queda fuera del recorrido del teclado: si no,
             tabular desde la portada pasaba por cinco enlaces invisibles. */
          tabIndex={i === actual ? undefined : -1}
          aria-hidden={i === actual ? undefined : true}
          data-visible={i === actual ? "" : undefined}
        >
          <MediaNota src={nota.cover_url} clase="np-slide-img" prioritaria={i === 0} />
          <span className="np-slide-velo" />
          <div className="np-slide-txt">
            <div className="np-slide-meta">
              <span className="np-slide-cat">{etiquetaCategoria(nota.category)}</span>
              <span className="np-slide-fecha">{fechaLarga(nota.published_at ?? nota.created_at)}</span>
            </div>
            <h2 className="np-slide-tit">{nota.title}</h2>
            {nota.excerpt && <p className="np-slide-baj">{nota.excerpt}</p>}
          </div>
        </Link>
      ))}

      {total > 1 && (
        <>
          <button type="button" className="np-slider-flecha izq" onClick={() => ir(actual - 1)} aria-label="Noticia anterior">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="np-slider-flecha der" onClick={() => ir(actual + 1)} aria-label="Noticia siguiente">
            <ChevronRight size={18} />
          </button>

          <div className="np-slider-puntos">
            {notas.map((nota, i) => (
              <button
                key={nota.id}
                type="button"
                className="np-slider-punto"
                data-visible={i === actual ? "" : undefined}
                onClick={() => ir(i)}
                aria-label={`Ir a la noticia ${i + 1} de ${total}`}
                aria-current={i === actual}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
