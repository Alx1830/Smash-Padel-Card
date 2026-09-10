"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Grilla que va mostrando las cartas de a tandas mientras se baja.
 *
 * El panel de un set del perfil dibujaba las 475 cartas de una, con las
 * imágenes en `eager`: el navegador pedía cientos de fotos antes de que nadie
 * las mirara y la página se arrastraba. Acá se muestran diez y se suman más
 * cuando el centinela entra en pantalla.
 *
 * El contenedor tiene su propio scroll, así que el observador mira *dentro* de
 * él (`root`), no en la ventana; con `root: null` el centinela nunca entraría
 * en vista y no se cargaría nada más.
 */
export function GrillaProgresiva<T>({
  items,
  claveDe,
  children,
  tanda = 10,
  altoMaximo = 580,
  className,
  estiloGrilla,
}: {
  items: T[];
  claveDe: (item: T, i: number) => string;
  children: (item: T, i: number) => React.ReactNode;
  /** Cuántas se suman por vez. */
  tanda?: number;
  altoMaximo?: number;
  className?: string;
  estiloGrilla?: React.CSSProperties;
}) {
  const [visibles, setVisibles] = useState(tanda);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const centinelaRef = useRef<HTMLDivElement>(null);

  /* Una lista nueva (cambió el set o el filtro) arranca de nuevo. */
  const total = items.length;
  const visiblesReales = Math.min(visibles, total);
  const hayMas = visiblesReales < total;

  const mostrarMas = useCallback(() => setVisibles((v) => v + tanda), [tanda]);

  useEffect(() => {
    const centinela = centinelaRef.current;
    const contenedor = contenedorRef.current;
    if (!centinela || !hayMas) return;

    const observador = new IntersectionObserver(
      ([entrada]) => { if (entrada.isIntersecting) mostrarMas(); },
      {
        /* El scroll pasa adentro del panel, no en la ventana. */
        root: contenedor && contenedor.scrollHeight > contenedor.clientHeight ? contenedor : null,
        rootMargin: "300px",
      }
    );
    observador.observe(centinela);
    return () => observador.disconnect();
  }, [hayMas, mostrarMas, visiblesReales]);

  return (
    <div
      ref={contenedorRef}
      style={{
        maxHeight: altoMaximo,
        overflowY: total > 6 ? "auto" : "visible",
        paddingRight: total > 6 ? 6 : 0,
        scrollbarWidth: "thin",
        scrollbarColor: "#2ee6c144 transparent",
      }}
    >
      <div className={className} style={estiloGrilla}>
        {items.slice(0, visiblesReales).map((item, i) => (
          <div key={claveDe(item, i)} style={{ display: "contents" }}>
            {children(item, i)}
          </div>
        ))}
      </div>

      {hayMas && (
        <>
          <div ref={centinelaRef} style={{ height: 1 }} />
          <div
            style={{
              textAlign: "center", padding: "14px 0 4px",
              fontFamily: "var(--font-jetbrains)", fontSize: 10,
              letterSpacing: "0.14em", textTransform: "uppercase", color: "#7a8298",
            }}
          >
            Cargando… {visiblesReales} de {total}
          </div>
        </>
      )}
    </div>
  );
}
