/**
 * Catálogo de juegos: una tarjeta con portada por cada minijuego. Para sumar un
 * juego nuevo basta con agregarlo a JUEGOS y subir su portada con
 * scripts/juegos/subir-portada.mjs.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Play } from "lucide-react";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const PORTADAS = "https://pub-01b8e296fe944e688fd2100376d4af4a.r2.dev/juegos";

const JUEGOS = [
  { href: "/dashboard/higher-or-lower", nombre: "Higher Or Lower", frase: "¿Qué carta vale más?",    portada: `${PORTADAS}/higher-or-lower.webp` },
  { href: "/dashboard/type-master",     nombre: "Type Master",     frase: "¿De qué tipo es este Pokémon?", portada: `${PORTADAS}/type-master.webp` },
];

export const metadata: Metadata = {
  title: "Juegos | Facebinder",
  description: "Minijuegos de Pokémon para poner a prueba lo que sabes.",
};

export default function JuegosPage() {
  return (
    <div className="jc-page">
      <style>{`
        .jc-page { min-height: 100vh; background: #05070d; padding: 40px 24px; }
        .jc-wrap { max-width: 1400px; }
        .jc-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
        @media (max-width: 1240px) { .jc-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width:  767px) { .jc-page { padding: 28px 16px; } .jc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } }

        .jc-card { display: flex; flex-direction: column; text-decoration: none; border-radius: 12px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02); transition: border-color 0.15s, transform 0.15s; }
        .jc-card:hover { border-color: ${COURT}66; transform: translateY(-2px); }
        .jc-card img { display: block; width: 100%; aspect-ratio: 4 / 5; object-fit: cover; }
        .jc-info { display: flex; flex-direction: column; gap: 4px; padding: 12px 12px 14px; flex: 1; }
        .jc-nombre { font-family: ${DISP}; font-size: 16px; font-weight: 700; color: ${INK0}; }
        .jc-frase { font-family: ${MONO}; font-size: 11px; color: ${INK2}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .jc-jugar { margin-top: auto; padding-top: 10px; }
        .jc-jugar span { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px; border-radius: 999px;
          background: ${COURT}; color: #05070d; font-family: ${MONO}; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
        @media (max-width: 767px) {
          .jc-info { padding: 10px 10px 12px; }
          .jc-nombre { font-size: 13px; }
          .jc-frase { font-size: 9px; }
        }
      `}</style>

      <div className="jc-wrap">
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
            Interactivo
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            Juegos
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, letterSpacing: "0.06em", margin: "8px 0 0" }}>
            Pon a prueba lo que sabes de Pokémon
          </p>
        </div>

        <div className="jc-grid">
          {JUEGOS.map(j => (
            <Link key={j.href} href={j.href} className="jc-card">
              <img src={j.portada} alt={j.nombre} loading="lazy" decoding="async" />
              <div className="jc-info">
                <div className="jc-nombre">{j.nombre}</div>
                <div className="jc-frase">{j.frase}</div>
                <div className="jc-jugar"><span><Play size={13} strokeWidth={2.4} /> Jugar</span></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
