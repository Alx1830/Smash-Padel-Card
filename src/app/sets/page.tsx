import Link from "next/link";
import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { SET_CARD_COUNT } from "@/data/pokemon-cards";
import { SERIES_PUBLICAS } from "@/lib/catalogo";
import { SITIO, migas, DatosJson } from "@/lib/seo";
import { PieLegal } from "@/components/PieLegal";
import { MobileTabBar } from "@/components/MobileTabBar";

/**
 * El índice de todas las expansiones de Pokémon TCG que conoce Facebinder.
 *
 * Es la puerta pública al catálogo: hasta ahora las cartas y los precios solo
 * existían dentro del panel, detrás del login, así que ni Google ni nadie que
 * no tuviera cuenta podía ver la parte del sitio que realmente sirve.
 *
 * Se rearma una vez al día: la lista de sets cambia cuando se agrega uno, no
 * cada hora.
 */

export const revalidate = 86400;

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";

const TOTAL_SETS = SERIES_PUBLICAS.reduce((n, s) => n + s.sets.length, 0);
const TOTAL_CARTAS = Object.values(SET_CARD_COUNT).reduce((n, c) => n + c, 0);

export const metadata: Metadata = {
  title: "Todos los sets de Pokémon TCG — lista completa con precios",
  description:
    `Las ${TOTAL_SETS} expansiones de Pokémon TCG, de Base Set a las más nuevas, ` +
    `con la lista de cartas de cada una y el precio de mercado actualizado. ` +
    `Más de ${TOTAL_CARTAS.toLocaleString("es-CO")} cartas, en español y gratis.`,
  alternates: { canonical: `${SITIO}/sets` },
  keywords: [
    "sets de Pokémon TCG", "expansiones Pokémon", "lista de cartas Pokémon",
    "precios cartas Pokémon", "catálogo Pokémon TCG en español",
  ],
};

export default function SetsPage() {
  return (
    <div className="st-page">
      <style>{`
        .st-page { min-height: 100vh; background: #05070d; padding: 40px 24px; }
        .st-wrap { max-width: 1400px; }

        /* minmax(0, 1fr) y nunca 1fr a secas: con 1fr la columna no baja del
           ancho de su contenido y la grilla desborda el celular. */
        .st-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 1500px) { .st-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
        @media (max-width: 1240px) { .st-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 1023px) { .st-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 767px) {
          .st-page { padding: 28px 16px; }
          .st-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        }

        .st-card {
          display: flex; flex-direction: column; gap: 10px;
          padding: 14px 12px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.02);
          text-decoration: none; transition: border-color 0.15s, background 0.15s;
        }
        .st-card:hover { border-color: rgba(46,230,193,0.35); background: rgba(46,230,193,0.04); }
        .st-logo { height: 58px; width: 100%; object-fit: contain; }
        /* El texto se empuja al fondo para que todas las tarjetas terminen
           alineadas aunque los logos midan distinto de alto. */
        .st-card > div { margin-top: auto; }
        .st-nombre {
          font-family: ${MONO}; font-size: 11px; color: ${INK0}; font-weight: 600;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .st-conteo { font-family: ${MONO}; font-size: 9px; color: ${INK2}; letter-spacing: 0.08em; }
      `}</style>

      <DatosJson datos={migas([
        { nombre: "Inicio", url: "/" },
        { nombre: "Sets", url: "/sets" },
      ])} />

      <div className="st-wrap">
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
            Catálogo
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            Todos los sets de Pokémon TCG
          </h1>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.06em", margin: "8px 0 0", maxWidth: "620px", lineHeight: 1.7 }}>
            {TOTAL_SETS} expansiones y {TOTAL_CARTAS.toLocaleString("es-CO")} cartas,
            cada una con su precio de mercado al día. Entrá a un set para ver la
            lista completa y cuánto vale cada carta.
          </p>
        </div>

        {SERIES_PUBLICAS.map(serie => (
          <section key={serie.id} style={{ marginBottom: "40px" }}>
            <h2 style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, margin: "0 0 14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Layers size={13} color={COURT} strokeWidth={2} />
              {serie.name}
            </h2>

            <div className="st-grid">
              {serie.sets.map(set => (
                <Link key={set.id} href={`/sets/${set.id}`} className="st-card">
                  <img
                    src={set.logo}
                    alt={`Logo del set ${set.name}`}
                    className="st-logo"
                    loading="lazy"
                    decoding="async"
                  />
                  <div>
                    <div className="st-nombre" title={set.name}>{set.name}</div>
                    <div className="st-conteo">
                      {SET_CARD_COUNT[set.id] ? `${SET_CARD_COUNT[set.id]} cartas` : "Ver cartas"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <PieLegal />
      <MobileTabBar />
    </div>
  );
}
