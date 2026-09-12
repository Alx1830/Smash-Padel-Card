"use client";

/**
 * El cajón de herramientas del admin en el celular.
 *
 * Se abre deslizando el dedo desde el borde izquierdo hacia la derecha, como
 * los cajones de cualquier app. Solo existe para un admin: nadie más tiene qué
 * hacer acá, y un gesto que no lleva a ninguna parte confunde.
 *
 * El gesto arranca únicamente si el dedo baja cerca del borde —los primeros
 * 28 píxeles— para no pelearse con nada de la página: un carrusel de fotos, la
 * lista de sets o el propio gesto de "atrás" del navegador se arrastran desde
 * el medio de la pantalla, no desde el filo.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Wrench } from "lucide-react";
import { ENLACES_ADMIN, ADMIN_COLOR } from "./enlaces";

const MONO = "var(--font-jetbrains)";
const INK2 = "#7a8298";

/** Desde dónde se puede empezar a arrastrar. */
const BORDE = 28;
/** Cuánto hay que arrastrar para que se considere una apertura. */
const MINIMO = 55;

export function MenuAdminMovil() {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

  /* El seguimiento del dedo va en refs: mover el estado en cada `touchmove`
     redibujaría la página entera sesenta veces por segundo. */
  const desdeX = useRef(0);
  const desdeY = useRef(0);
  const sirve  = useRef(false);

  const cerrar = useCallback(() => setAbierto(false), []);

  useEffect(() => {
    const empieza = (e: TouchEvent) => {
      const t = e.touches[0];
      sirve.current = t.clientX <= BORDE;
      desdeX.current = t.clientX;
      desdeY.current = t.clientY;
    };

    const mueve = (e: TouchEvent) => {
      if (!sirve.current) return;
      const t = e.touches[0];
      const haciaLaDerecha = t.clientX - desdeX.current;
      const desviacion = Math.abs(t.clientY - desdeY.current);
      /* Más horizontal que vertical: si no, cualquier scroll abriría el cajón. */
      if (haciaLaDerecha > MINIMO && desviacion < haciaLaDerecha) {
        sirve.current = false;
        setAbierto(true);
      }
    };

    const termina = () => { sirve.current = false; };

    document.addEventListener("touchstart", empieza, { passive: true });
    document.addEventListener("touchmove", mueve, { passive: true });
    document.addEventListener("touchend", termina, { passive: true });
    return () => {
      document.removeEventListener("touchstart", empieza);
      document.removeEventListener("touchmove", mueve);
      document.removeEventListener("touchend", termina);
    };
  }, []);

  /* Al llegar a la página elegida el cajón sobra. */
  useEffect(cerrar, [pathname, cerrar]);

  return (
    <>
      <style>{`
        /* El cajón solo tiene sentido con el dedo: en un computador está la
           barra lateral, que muestra lo mismo sin esconderlo. */
        .ma-fondo, .ma-cajon { display: none; }
        @media (max-width: 1023px), (pointer: coarse) {
          .ma-fondo { display: block; position: fixed; inset: 0; z-index: 998;
            background: rgba(5,7,13,0.7); }
          .ma-cajon { display: flex; flex-direction: column; position: fixed;
            top: 0; bottom: 0; left: 0; z-index: 999; width: min(78vw, 290px);
            background: #0a0f18; border-right: 1px solid rgba(255,255,255,0.09);
            padding: 20px 0; overflow-y: auto;
            animation: ma-entra 180ms ease-out; }
        }
        @keyframes ma-entra { from { transform: translateX(-100%); } to { transform: none; } }

        .ma-item { display: flex; align-items: center; gap: 12px; padding: 13px 20px;
          text-decoration: none; transition: background 0.15s; }
        .ma-item:active { background: rgba(79,240,255,0.1); }
        .ma-item span { font-family: ${MONO}; font-size: 12px; letter-spacing: 0.08em;
          color: rgba(245,247,251,0.8); }
        .ma-item.aqui span { color: ${ADMIN_COLOR}; }
        .ma-item.aqui { background: rgba(79,240,255,0.08); }
      `}</style>

      {abierto && (
        <>
          <div className="ma-fondo" onClick={cerrar} aria-hidden />
          <aside className="ma-cajon" role="dialog" aria-label="Herramientas de administración">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 16px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: MONO, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: ADMIN_COLOR }}>
                <Wrench size={14} /> Admin
              </span>
              <button
                onClick={cerrar}
                aria-label="Cerrar"
                style={{ background: "none", border: 0, padding: 4, cursor: "pointer", color: INK2, display: "flex" }}
              >
                <X size={18} />
              </button>
            </div>

            {ENLACES_ADMIN.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={"ma-item" + (pathname.startsWith(href) ? " aqui" : "")}
                onClick={cerrar}
              >
                <Icon size={16} color={ADMIN_COLOR} strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            ))}

            <p style={{ fontFamily: MONO, fontSize: 9.5, color: INK2, lineHeight: 1.8, margin: "auto 20px 0", paddingTop: 20 }}>
              Desliza desde el borde izquierdo para abrir esto en cualquier pantalla.
            </p>
          </aside>
        </>
      )}
    </>
  );
}
