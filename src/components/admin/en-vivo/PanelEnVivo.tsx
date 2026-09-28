"use client";

/**
 * Marco del panel En vivo: cabecera, pestañas y todos los estilos. No pide
 * datos: la página se los pasa, así se puede dibujar igual con datos de prueba.
 */

import { Radio, BarChart3 } from "lucide-react";
import {
  MONO, DISP, COURT, BALL, CRIT, INK0, INK1, INK2, SURF, LINE, BG0, SURF_SOLIDA, SERIE,
  type Panel, type Reporte,
} from "./comun";
import { VistaEnVivo } from "./VistaEnVivo";
import { VistaReportes, type Rango } from "./VistaReportes";

export type Vista = "en-vivo" | "reportes";

export function PanelEnVivo({
  vista, onVista, panel, errorPanel, ahora,
  reporte, cargandoReporte, errorReporte, rango, hoy, onRango, onActualizar,
}: {
  vista: Vista; onVista: (v: Vista) => void;
  panel: Panel | null; errorPanel: string | null; ahora: number;
  reporte: Reporte | null; cargandoReporte: boolean; errorReporte: string | null;
  rango: Rango; hoy: string; onRango: (r: Rango) => void; onActualizar: () => void;
}) {
  return (
    <div className="ev-page">
      <style>{ESTILOS}</style>

      <div className="ev-wrap">
        {/* Cabecera */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
            Panel Admin
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            {vista === "reportes" ? "Reportes de visitas" : "En vivo"}
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, letterSpacing: "0.06em", lineHeight: 1.6, margin: "8px 0 0" }}>
            {vista === "reportes"
              ? "Qué pasó en el sitio en los días que elijas · hora de Colombia"
              : "Quién está en la página ahora mismo · se actualiza sola cada 5 segundos"}
          </p>
        </div>

        {/* Pestañas */}
        <div className="ev-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={vista === "en-vivo"} className={`ev-tab${vista === "en-vivo" ? " on" : ""}`} onClick={() => onVista("en-vivo")}>
            {vista === "en-vivo" ? <span className="ev-pulso" style={{ width: 7, height: 7 }} /> : <Radio size={14} strokeWidth={1.9} />}
            En vivo
            {panel && <span className="ev-tab-num">{panel.en_linea.length}</span>}
          </button>
          <button type="button" role="tab" aria-selected={vista === "reportes"} className={`ev-tab${vista === "reportes" ? " on" : ""}`} onClick={() => onVista("reportes")}>
            <BarChart3 size={14} strokeWidth={1.9} /> Reportes
          </button>
        </div>

        {vista === "en-vivo" ? (
          <>
            {errorPanel && <p style={{ fontFamily: MONO, fontSize: 11, color: CRIT, marginBottom: 16 }}>No se pudo cargar: {errorPanel}</p>}
            {!panel
              ? <p style={{ fontFamily: MONO, fontSize: 12, color: INK2, letterSpacing: "0.1em" }}>Cargando...</p>
              : <VistaEnVivo panel={panel} ahora={ahora} />}
          </>
        ) : (
          <VistaReportes reporte={reporte} cargando={cargandoReporte} error={errorReporte}
            rango={rango} hoy={hoy} onRango={onRango} onActualizar={onActualizar} />
        )}
      </div>
    </div>
  );
}

/* Las grillas se acomodan al ancho del panel (container queries), no al de la
   pantalla: en computador la barra lateral se come 260 px y con media queries
   el panel de 1024 px quedaba con el diseño de uno de 1024 px en 764. */
const ESTILOS = `
  .ev-page { background: ${BG0}; min-height: 100vh; padding: 40px 24px 64px; overflow-x: clip; }
  .ev-wrap { max-width: 1400px; container: ev / inline-size; }
  @media (max-width: 767px) { .ev-page { padding: 28px 16px 48px; } }

  /* ── Tarjeta ── */
  .ev-card {
    position: relative; min-width: 0; container-type: inline-size;
    background:
      radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--acento) 9%, transparent), transparent 55%),
      ${SURF};
    border: 1px solid ${LINE}; border-radius: 14px; padding: 18px;
  }
  .ev-card::before {
    content: ""; position: absolute; top: -1px; left: 16px; right: 16px; height: 2px; border-radius: 2px;
    background: linear-gradient(90deg, var(--acento), color-mix(in srgb, var(--acento) 0%, transparent));
    opacity: .85;
  }
  .ev-icono {
    width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--acento) 14%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--acento) 28%, transparent);
  }
  .ev-cifra { display: flex; flex-direction: column; }
  .ev-chip { font-size: 9px; letter-spacing: .08em; color: ${INK1}; padding: 1px 5px; border-radius: 4px; background: rgba(255,255,255,0.06); flex-shrink: 0; }
  .ev-badge { font-family: ${MONO}; font-size: 8px; letter-spacing: .12em; padding: 2px 6px; border-radius: 999px; border: 1px solid; flex-shrink: 0; }
  .ev-enlace { color: inherit; text-decoration: none; }
  .ev-enlace:hover { color: ${COURT} !important; text-decoration: underline; text-underline-offset: 3px; }
  .ev-corta { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* ── Pulso ── */
  .ev-pulso { width: 10px; height: 10px; border-radius: 50%; background: ${COURT}; position: relative; flex-shrink: 0; display: inline-block; box-shadow: 0 0 10px ${COURT}; }
  .ev-pulso::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: ${COURT}; animation: ev-pulso 1.8s ease-out infinite; }
  @keyframes ev-pulso { from { transform: scale(1); opacity: .7; } to { transform: scale(3.2); opacity: 0; } }
  .ev-gira { animation: ev-gira 1s linear infinite; }
  @keyframes ev-gira { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .ev-pulso::after, .ev-gira { animation: none; } }

  /* ── Pestañas y filtros ── */
  .ev-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 22px; }
  .ev-tab, .ev-pill, .ev-boton {
    display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 16px;
    border-radius: 999px; border: 1px solid ${LINE}; background: ${SURF}; color: ${INK1};
    font-family: ${MONO}; font-size: 11px; letter-spacing: .08em; cursor: pointer;
    transition: background .15s, color .15s, border-color .15s;
  }
  .ev-tab:hover, .ev-pill:hover, .ev-boton:hover:not(:disabled) { background: rgba(255,255,255,0.05); color: ${INK0}; }
  .ev-tab.on, .ev-pill.on {
    color: ${INK0}; border-color: rgba(46,230,193,0.45);
    background: linear-gradient(135deg, rgba(46,230,193,0.18), rgba(91,124,240,0.12));
    box-shadow: 0 0 18px rgba(46,230,193,0.12);
  }
  .ev-tab { text-transform: uppercase; letter-spacing: .14em; }
  .ev-tab-num { font-size: 10px; padding: 1px 7px; border-radius: 999px; background: rgba(46,230,193,0.16); color: ${COURT}; letter-spacing: 0; }
  .ev-pill { padding: 0 14px; }
  .ev-pill.on svg { color: ${COURT}; }
  .ev-boton { color: #04110d; background: ${COURT}; border-color: ${COURT}; font-weight: 700; }
  .ev-boton:hover:not(:disabled) { background: ${BALL}; border-color: ${BALL}; color: #04110d; }
  .ev-boton:disabled { opacity: .45; cursor: default; }
  .ev-boton-icono {
    width: 40px; height: 40px; border-radius: 999px; border: 1px solid ${LINE}; background: ${SURF}; color: ${INK1};
    display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
  }
  .ev-boton-icono:hover { color: ${COURT}; background: rgba(255,255,255,0.05); }
  .ev-filtros { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 16px; }
  .ev-atajos { display: flex; flex-wrap: wrap; gap: 8px; }
  .ev-fechas { display: flex; align-items: flex-end; gap: 8px; margin-left: auto; }
  .ev-fecha { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .ev-acciones { display: flex; gap: 8px; }
  .ev-fecha span { font-family: ${MONO}; font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: ${INK2}; padding-left: 4px; }
  .ev-fecha input {
    height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid ${LINE}; background: ${SURF};
    color: ${INK0}; font-family: ${MONO}; font-size: 12px; color-scheme: dark; min-width: 0; width: 100%;
  }
  .ev-fecha input:focus { outline: none; border-color: rgba(46,230,193,0.55); box-shadow: 0 0 0 3px rgba(46,230,193,0.12); }
  .ev-fecha input::-webkit-calendar-picker-indicator { filter: invert(0.8) sepia(1) hue-rotate(120deg) saturate(3); cursor: pointer; }
  .ev-reporte { transition: opacity .2s; }

  /* ── Grillas ── */
  .ev-kpis { display: grid; grid-template-columns: minmax(0, 1.5fr) repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 14px; }
  .ev-dos  { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 14px; }
  .ev-mitades, .ev-calores { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .ev-calores { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); margin-top: 14px; }
  .ev-k3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .ev-k5 { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
  .ev-g4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
  .ev-g3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .ev-gente { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }

  @container ev (max-width: 1099px) {
    .ev-kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .ev-kpis > .ev-hero { grid-column: 1 / -1; }
    .ev-dos, .ev-mitades, .ev-calores { grid-template-columns: minmax(0, 1fr); }
    .ev-solo-ancho { display: none; }
    .ev-k5 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .ev-g4, .ev-g3, .ev-gente { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    /* Con dos columnas, la última tarjeta suelta ocupa todo el renglón */
    .ev-g3 > :last-child:nth-child(odd) { grid-column: 1 / -1; }
  }
  @container ev (max-width: 760px) {
    .ev-fechas { margin-left: 0; width: 100%; }
    .ev-fecha { flex: 1; }
  }
  @container ev (max-width: 560px) {
    .ev-kpis, .ev-k3, .ev-k5, .ev-dos, .ev-g4, .ev-g3, .ev-gente { gap: 10px; }
    .ev-g4, .ev-g3, .ev-gente { grid-template-columns: minmax(0, 1fr); }
    .ev-card { padding: 16px 14px; }
    .ev-atajos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); width: 100%; }
    .ev-pill { justify-content: center; padding: 0 8px; }
    .ev-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .ev-k3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .ev-k3 > :first-child { grid-column: 1 / -1; }
    .ev-k5 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .ev-k5 > :last-child { grid-column: 1 / -1; }
    /* Las fechas en su propio renglón a lo ancho; los botones debajo */
    .ev-fechas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 8px; }
    .ev-acciones { grid-column: 1 / -1; }
    .ev-acciones .ev-boton { flex: 1; justify-content: center; }
    .ev-fecha input { padding: 0 10px; }
  }

  /* ── Hero "en línea" ── */
  .ev-hero { display: flex; flex-direction: column; justify-content: center;
    background:
      radial-gradient(80% 120% at 100% 100%, rgba(91,124,240,0.14), transparent 60%),
      radial-gradient(90% 120% at 0% 0%, rgba(46,230,193,0.16), transparent 55%),
      ${SURF};
  }
  .ev-hero-num { font-family: ${DISP}; font-weight: 700; font-size: clamp(52px, 9vw, 72px); line-height: .9; color: ${INK0};
    text-shadow: 0 0 28px rgba(46,230,193,0.35); }
  .ev-proporcion { display: flex; gap: 2px; height: 6px; border-radius: 4px; overflow: hidden; margin-top: 14px; }
  .ev-proporcion span { min-width: 0; }

  /* ── Globo ── */
  .ev-globo {
    position: absolute; z-index: 5; pointer-events: none; transform: translateY(calc(-100% - 10px));
    background: ${SURF_SOLIDA}; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 8px 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.55);
  }

  /* ── Dona ── */
  .ev-dona { display: grid; grid-template-columns: 128px minmax(0, 1fr); align-items: center; gap: 16px; }
  .ev-dona-svg { width: 128px; height: 128px; display: block; overflow: visible; }
  .ev-leyenda { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .ev-leyenda button {
    width: 100%; display: flex; align-items: center; gap: 8px; min-height: 30px; padding: 0 8px; border-radius: 8px;
    border: 0; background: transparent; cursor: pointer; font-family: ${MONO}; font-size: 11px; text-align: left;
  }
  .ev-leyenda button:hover, .ev-leyenda button.on { background: rgba(255,255,255,0.05); }
  .ev-leyenda-nombre { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @container (max-width: 360px) {
    .ev-dona { grid-template-columns: 108px minmax(0, 1fr); gap: 10px; }
    .ev-dona-svg { width: 108px; height: 108px; }
    .ev-leyenda button { gap: 6px; padding: 0 4px; }
  }
  @container (max-width: 250px) {
    .ev-dona { grid-template-columns: minmax(0, 1fr); justify-items: center; }
    .ev-leyenda { width: 100%; }
  }
  @media (pointer: coarse) { .ev-leyenda button { min-height: 40px; } }

  .ev-mas {
    align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px;
    border-radius: 999px; border: 1px solid ${LINE}; background: transparent; color: ${INK1};
    font-family: ${MONO}; font-size: 10px; letter-spacing: .06em; cursor: pointer;
  }
  .ev-mas:hover { color: ${COURT}; border-color: rgba(46,230,193,0.4); }
  @media (pointer: coarse) { .ev-mas { min-height: 40px; } }

  /* ── Mapa de calor ── */
  .ev-calor { display: grid; gap: 4px; }
  .ev-horas { grid-template-columns: repeat(24, minmax(0, 1fr)); }
  .ev-semana { grid-template-columns: repeat(7, minmax(0, 1fr)); }
  .ev-celda {
    min-height: 44px; border-radius: 7px; border: 0; cursor: pointer; padding: 0;
    font-family: ${MONO}; font-size: 10px; font-weight: 600;
    transition: transform .12s, outline-color .12s; outline: 2px solid transparent; outline-offset: 1px;
  }
  .ev-celda:hover, .ev-celda.on { outline-color: ${INK0}; }
  .ev-semana .ev-celda { min-height: 52px; font-size: 11px; }
  @container (max-width: 640px) { .ev-horas { grid-template-columns: repeat(12, minmax(0, 1fr)); } }
  @container (max-width: 330px) { .ev-horas { grid-template-columns: repeat(8, minmax(0, 1fr)); } }
  @container (max-width: 300px) { .ev-semana .ev-celda { font-size: 9px; } }

  /* ── Tablas (páginas y usuarios) ── */
  .ev-tabla { display: flex; flex-direction: column; }
  .ev-fila {
    display: grid; grid-template-columns: 30px minmax(0, 1fr) 96px 90px 150px; align-items: center; gap: 12px;
    padding: 11px 6px; border-top: 1px solid rgba(255,255,255,0.05);
  }
  .ev-fila:not(.ev-cabeza):hover { background: rgba(255,255,255,0.025); }
  .ev-cabeza { border-top: 0; padding-top: 0; font-family: ${MONO}; font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: ${INK2}; }
  .ev-cabeza .ev-mets span { text-align: right; }
  .ev-mets { display: contents; }
  .ev-mets > span { font-family: ${MONO}; font-size: 12px; color: ${INK1}; text-align: right; white-space: nowrap; }
  .ev-mets b { color: ${INK0}; font-weight: 600; }
  .ev-mets i { display: none; font-style: normal; color: ${INK2}; font-size: 10px; }
  .ev-mets em { font-style: normal; color: ${INK2}; font-size: 10px; margin-left: 6px; }
  .ev-rank { font-family: ${MONO}; font-size: 11px; color: ${INK2}; text-align: center; }
  .ev-prop { height: 4px; border-radius: 3px; background: rgba(255,255,255,0.045); margin-top: 7px; max-width: 420px; }
  .ev-prop span { display: block; height: 100%; border-radius: 3px;
    background: linear-gradient(90deg, color-mix(in srgb, ${SERIE[2]} 40%, transparent), ${SERIE[2]}); box-shadow: 0 0 8px color-mix(in srgb, ${SERIE[2]} 45%, transparent); }
  .ev-prop.violeta span { background: linear-gradient(90deg, color-mix(in srgb, ${SERIE[3]} 40%, transparent), ${SERIE[3]}); box-shadow: 0 0 8px color-mix(in srgb, ${SERIE[3]} 45%, transparent); }
  @container (max-width: 600px) {
    .ev-fila { grid-template-columns: 24px minmax(0, 1fr); gap: 4px 10px; align-items: start; }
    .ev-cabeza { display: none; }
    .ev-rank { padding-top: 2px; }
    .ev-mets { display: flex; flex-wrap: wrap; gap: 4px 14px; grid-column: 2; margin-top: 4px; }
    .ev-mets > span { text-align: left; font-size: 11px; }
    .ev-mets i { display: inline; }
  }

  /* ── Visitantes ── */
  .ev-visitante { display: flex; flex-direction: column; gap: 12px; }
  .ev-avatar {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--acento) 26%, transparent), color-mix(in srgb, var(--acento) 6%, transparent));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--acento) 40%, transparent), 0 0 16px color-mix(in srgb, var(--acento) 22%, transparent);
  }
  .ev-estado { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; border: 1px solid;
    font-family: ${MONO}; font-size: 8.5px; letter-spacing: .12em; text-transform: uppercase; flex-shrink: 0; }
  .ev-ahora { padding: 10px 12px; border-radius: 10px; min-width: 0;
    background: linear-gradient(90deg, color-mix(in srgb, var(--acento) 10%, transparent), rgba(255,255,255,0.02));
    border-left: 2px solid var(--acento); }
  .ev-datos { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px 12px; }
  .ev-dato { display: flex; align-items: center; gap: 7px; font-family: ${MONO}; font-size: 10.5px; color: ${INK1}; min-width: 0; }
  .ev-dato span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ev-dato svg { flex-shrink: 0; }
  @container (max-width: 280px) { .ev-datos { grid-template-columns: minmax(0, 1fr); } }
`;
