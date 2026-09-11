"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Al tocar una foto de la nota, se abre grande sobre la pantalla.
 *
 * Es lo que la gente espera de un carrusel de cartas: en la fila se ven del
 * tamaño de una estampilla y el texto de una carta no se lee. Acá se abre a
 * pantalla completa y se pasa de una a la otra sin cerrar, con las flechas del
 * teclado o los botones.
 *
 * Escucha el clic en todo el cuerpo de la nota en vez de poner un manejador en
 * cada foto: el cuerpo es HTML que se pinta de una sola vez, sin componentes
 * por foto donde colgar nada, y son trescientas.
 */
export function VisorFotos() {
  const [fotos, setFotos] = useState<string[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    const cuerpo = document.querySelector(".post-cuerpo");
    if (!cuerpo) return;

    function alTocar(e: Event) {
      const img = (e.target as HTMLElement)?.closest?.("img");
      if (!img) return;

      /* Una foto dentro de un enlace lleva a otra página: ahí manda el enlace */
      if (img.closest("a")) return;

      const contenedor = img.closest(".post-slider");
      const vecinas = contenedor
        ? Array.from(contenedor.querySelectorAll("img"))
        : [img as HTMLImageElement];

      const urls = vecinas.map((x) => (x as HTMLImageElement).currentSrc || (x as HTMLImageElement).src);
      const donde = vecinas.indexOf(img as HTMLImageElement);

      setFotos(urls);
      setI(donde < 0 ? 0 : donde);
    }

    cuerpo.addEventListener("click", alTocar);
    return () => cuerpo.removeEventListener("click", alTocar);
  }, []);

  const cerrar = useCallback(() => setFotos([]), []);
  const mover = useCallback(
    (paso: number) => setI((n) => (n + paso + fotos.length) % fotos.length),
    [fotos.length]
  );

  useEffect(() => {
    if (fotos.length === 0) return;

    function teclas(e: KeyboardEvent) {
      if (e.key === "Escape") cerrar();
      if (e.key === "ArrowRight") mover(1);
      if (e.key === "ArrowLeft") mover(-1);
    }

    window.addEventListener("keydown", teclas);
    /* Con el visor abierto, la página de atrás no debe moverse */
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", teclas);
      document.body.style.overflow = antes;
    };
  }, [fotos.length, cerrar, mover]);

  if (fotos.length === 0) return null;

  const varias = fotos.length > 1;

  return (
    <div
      onClick={cerrar}
      role="dialog"
      aria-modal="true"
      aria-label="Foto ampliada"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(5,7,13,0.94)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, cursor: "zoom-out",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fotos[i]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
          borderRadius: 12, cursor: "default",
          boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
        }}
      />

      <button type="button" onClick={cerrar} aria-label="Cerrar" style={boton("top")}>
        <X size={18} />
      </button>

      {varias && (
        <>
          <button type="button" aria-label="Anterior" style={boton("izq")}
                  onClick={(e) => { e.stopPropagation(); mover(-1); }}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" aria-label="Siguiente" style={boton("der")}
                  onClick={(e) => { e.stopPropagation(); mover(1); }}>
            <ChevronRight size={20} />
          </button>

          <span style={{
            position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)",
            fontFamily: "var(--font-jetbrains)", fontSize: 11, letterSpacing: "0.12em",
            color: "#c9cfdd", background: "rgba(5,7,13,0.8)",
            padding: "6px 14px", borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.12)",
          }}>
            {i + 1} / {fotos.length}
          </span>
        </>
      )}
    </div>
  );
}

function boton(donde: "top" | "izq" | "der"): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "fixed", display: "grid", placeItems: "center",
    width: 42, height: 42, borderRadius: "50%",
    background: "rgba(5,7,13,0.85)", border: "1px solid rgba(255,255,255,0.16)",
    color: "#f5f7fb", cursor: "pointer",
  };
  if (donde === "top") return { ...base, top: 16, right: 16 };
  if (donde === "izq") return { ...base, left: 14, top: "50%", transform: "translateY(-50%)" };
  return { ...base, right: 14, top: "50%", transform: "translateY(-50%)" };
}
