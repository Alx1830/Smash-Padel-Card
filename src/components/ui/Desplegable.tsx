"use client";

/**
 * Desplegable de la casa. Reemplaza al <select> nativo, que en Windows y en
 * algunos navegadores abre una lista blanca con el resaltado azul del sistema
 * y deja el texto ilegible. Este es el diseño del filtro "Set" del
 * inventario: fondo oscuro, opción activa en teal, logo opcional por opción y
 * la barra de desplazamiento con el estilo de la página.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";

/** Alto máximo de la lista abierta */
const ALTO_MAX = 260;

export interface OpcionDesplegable { value: string; label: string; logo?: string }

export function Desplegable({ value, onChange, opciones, ariaLabel, acento = COURT }: {
  value: string;
  onChange: (v: string) => void;
  opciones: OpcionDesplegable[];
  ariaLabel?: string;
  /** Color de la opción activa y del borde abierto (la wishlist usa amarillo) */
  acento?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  /** Hacia dónde abre la lista y cuánto puede medir sin salirse de la pantalla */
  const [lugar, setLugar] = useState<{ arriba: boolean; alto: number }>({ arriba: false, alto: ALTO_MAX });
  const ref = useRef<HTMLDivElement>(null);
  const actual = opciones.find(o => o.value === value) ?? opciones[0];

  useEffect(() => {
    if (!abierto) return;
    // pointerdown cubre mouse y dedo: con mousedown, en el celular el toque de
    // afuera llegaba tarde y a veces se colaba un clic en lo que había debajo.
    const fuera = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fuera); document.removeEventListener("keydown", esc); };
  }, [abierto]);

  /**
   * Antes de abrir mide el espacio libre: en el celular la lista se salía por
   * debajo de la pantalla o quedaba tapada por la barra de abajo. Abre hacia
   * donde haya más lugar y nunca mide más que ese lugar.
   */
  function alternar() {
    if (!abierto && ref.current) {
      const r = ref.current.getBoundingClientRect();
      const altoVisor = window.visualViewport?.height ?? window.innerHeight;
      // La barra fija de abajo (72px) solo existe en celular y tablet
      const barra = window.matchMedia("(max-width: 1023px), (pointer: coarse)").matches ? 72 : 0;
      const abajo = altoVisor - r.bottom - barra - 12;
      const encima = r.top - 72 - 12; // 72px = barra fija de arriba
      const arriba = abajo < Math.min(ALTO_MAX, 180) && encima > abajo;
      setLugar({ arriba, alto: Math.max(140, Math.min(ALTO_MAX, arriba ? encima : abajo)) });
    }
    setAbierto(a => !a);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Con el dedo, cada opción y el botón miden al menos 44px de alto */}
      <style>{`
        @media (max-width: 767px), (pointer: coarse) {
          .fb-desp-boton { min-height: 42px; }
          .fb-desp-opcion { min-height: 44px; }
        }
      `}</style>
      <button type="button" className="fb-desp-boton" onClick={alternar} aria-haspopup="listbox" aria-expanded={abierto} aria-label={ariaLabel}
        style={{
          width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          padding: "8px 10px", borderRadius: 7, cursor: "pointer", textAlign: "left",
          background: "rgba(255,255,255,0.04)", border: `1px solid ${abierto ? `${acento}66` : "rgba(255,255,255,0.1)"}`,
          fontFamily: MONO, fontSize: 12, color: INK0, transition: "border-color .15s",
        }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {actual?.logo && <img src={actual.logo} alt="" style={{ width: 28, height: 20, objectFit: "contain", flexShrink: 0 }} />}
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{actual?.label}</span>
        </span>
        <ChevronDown size={13} color={INK2} style={{ flexShrink: 0, transition: "transform .2s", transform: abierto ? "rotate(180deg)" : "none" }} />
      </button>

      {abierto && (
        <div role="listbox" className="fb-scroll" style={{
          position: "absolute", left: 0, right: 0, zIndex: 100,
          ...(lugar.arriba ? { bottom: "calc(100% + 4px)" } : { top: "calc(100% + 4px)" }),
          background: "#0d1520", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)", maxHeight: lugar.alto, overflowY: "auto", overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}>
          {opciones.map((o, i) => {
            const activa = o.value === value;
            return (
              <button key={o.value || "__todas"} type="button" role="option" className="fb-desp-opcion" aria-selected={activa}
                onClick={() => { onChange(o.value); setAbierto(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%", padding: o.logo ? "7px 12px" : "9px 12px",
                  border: "none", borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none", cursor: "pointer", textAlign: "left",
                  background: activa ? `${acento}1a` : "none",
                }}
                onMouseEnter={e => { if (!activa) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!activa) e.currentTarget.style.background = "none"; }}>
                {o.logo && <img src={o.logo} alt="" loading="lazy" style={{ width: 32, height: 22, objectFit: "contain", flexShrink: 0 }} />}
                <span style={{ fontFamily: MONO, fontSize: 11, color: activa ? acento : INK0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {o.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
