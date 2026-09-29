"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { ZONA_COLOMBIA } from "@/lib/posts";

/**
 * Elegir el día y la hora de salida de una nota, al estilo del iPhone:
 * calendario con los días en círculos y ruedas para la hora.
 *
 * Reemplaza al `datetime-local` del navegador, que en Windows abre un
 * calendario chico y viejo y obliga a atinarle a una flechita. Acá todo está a
 * la vista y hay atajos de un clic para las salidas de siempre.
 *
 * El valor tiene el mismo formato que tenía el campo —"2026-09-30T09:00"— y es
 * hora de Colombia, así que el editor lo sigue guardando igual. Por dentro las
 * cuentas se hacen con `Date.UTC` sobre esos números tal cual: Colombia no
 * cambia de horario, y así no se mezcla la zona del equipo que mira.
 */

const COURT = "#2ee6c1";
const ERR   = "#ff5d5d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
               "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];
const NOMBRES_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const HORAS   = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const PERIODOS = ["a. m.", "p. m."];

/** Alto de cada renglón de las ruedas */
const RENGLON = 38;

interface Partes { y: number; m: number; d: number; h: number; min: number }

function leer(valor: string): Partes | null {
  const r = valor.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!r) return null;
  return { y: +r[1], m: +r[2] - 1, d: +r[3], h: +r[4], min: +r[5] };
}

function escribir(p: Partes): string {
  const t = new Date(Date.UTC(p.y, p.m, p.d, p.h, p.min));
  return t.toISOString().slice(0, 16);
}

/** La hora de ahora en Colombia, en el mismo formato del valor. */
function ahora(): string {
  const s = new Date().toLocaleString("en-CA", {
    timeZone: ZONA_COLOMBIA, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  /* Algunos motores dan "24:05" en vez de "00:05" a medianoche */
  return s.replace(", ", "T").replace(/,/g, "").replace("T24:", "T00:");
}

/** Suma minutos a un valor, respetando cambios de día y de mes. */
function sumar(valor: string, minutos: number): string {
  const p = leer(valor)!;
  return escribir({ ...p, min: p.min + minutos });
}

/** El día del valor, a las `h`:`min`. */
function aLas(valor: string, h: number, min = 0): string {
  const p = leer(valor)!;
  return escribir({ ...p, h, min });
}

function textoHora(h: number, min: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(min).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}

/** "el martes 30 de septiembre a las 9:00 a. m." */
function frase(valor: string, hoy: string): string {
  const p = leer(valor)!;
  const dia = new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay();
  const manana = sumar(aLas(hoy, 0), 24 * 60).slice(0, 10);
  const cual =
    valor.slice(0, 10) === hoy.slice(0, 10) ? "hoy"
    : valor.slice(0, 10) === manana ? "mañana"
    : `el ${NOMBRES_DIA[dia]} ${p.d} de ${MESES[p.m]}`;
  return `${cual} a las ${textoHora(p.h, p.min)}`;
}

export function SelectorFecha({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const [hoy] = useState(ahora);
  const elegido = leer(valor);

  /* El mes que se está mirando. Arranca en el del valor, o en el actual. */
  const inicio = elegido ?? leer(hoy)!;
  const [mes, setMes] = useState({ y: inicio.y, m: inicio.m });

  /* Si no hay nada elegido, la hora por defecto es las 9 de la mañana */
  const hora = elegido ?? { ...leer(hoy)!, h: 9, min: 0 };

  function elegirDia(y: number, m: number, d: number) {
    onChange(escribir({ y, m, d, h: hora.h, min: hora.min }));
  }

  /** Cambiar la hora sin día elegido arranca por hoy. */
  function elegirHora(h: number, min: number) {
    const base = elegido ?? leer(hoy)!;
    onChange(escribir({ ...base, h, min }));
  }

  function mover(delta: number) {
    const t = new Date(Date.UTC(mes.y, mes.m + delta, 1));
    setMes({ y: t.getUTCFullYear(), m: t.getUTCMonth() });
  }

  function atajo(v: string) {
    const p = leer(v)!;
    setMes({ y: p.y, m: p.m });
    onChange(v);
  }

  /* ── Atajos ─────────────────────────────────────────────────────────── */

  const ahoraP = leer(hoy)!;
  const enUnaHora = (() => {
    const v = sumar(hoy, 60);
    const p = leer(v)!;
    return sumar(v, (5 - (p.min % 5)) % 5);
  })();
  const manana = sumar(aLas(hoy, 0), 24 * 60);
  const atajos: { etiqueta: string; valor: string }[] = [
    { etiqueta: "En 1 hora", valor: enUnaHora },
    ...(ahoraP.h < 18 ? [{ etiqueta: "Hoy 6:00 p. m.", valor: aLas(hoy, 18) }] : []),
    { etiqueta: "Mañana 9:00 a. m.", valor: aLas(manana, 9) },
    { etiqueta: "Mañana 6:00 p. m.", valor: aLas(manana, 18) },
  ];

  /* ── Calendario ─────────────────────────────────────────────────────── */

  const diasDelMes = new Date(Date.UTC(mes.y, mes.m + 1, 0)).getUTCDate();
  /* Lunes primero: getUTCDay da 0 al domingo */
  const hueco = (new Date(Date.UTC(mes.y, mes.m, 1)).getUTCDay() + 6) % 7;
  const celdas: (number | null)[] = [
    ...Array.from({ length: hueco }, () => null),
    ...Array.from({ length: diasDelMes }, (_, i) => i + 1),
  ];
  const hoyDia = hoy.slice(0, 10);
  const esMesActual = mes.y === ahoraP.y && mes.m === ahoraP.m;
  const pasada = Boolean(valor) && valor <= hoy;

  const h12 = hora.h % 12 === 0 ? 12 : hora.h % 12;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Atajos de un clic */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {atajos.map((a) => {
          const activo = a.valor === valor;
          return (
            <button key={a.etiqueta} type="button" onClick={() => atajo(a.valor)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999,
                             border: `1px solid ${activo ? COURT : "rgba(255,255,255,0.12)"}`,
                             background: activo ? "rgba(46,230,193,0.12)" : "rgba(255,255,255,0.03)",
                             color: activo ? COURT : INK1, fontFamily: MONO, fontSize: 11, cursor: "pointer" }}>
              {a.etiqueta === "En 1 hora" && <Zap size={12} />}
              {a.etiqueta}
            </button>
          );
        })}
      </div>

      <div className="sf-caja">
        {/* Calendario */}
        <div className="sf-cal">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontFamily: DISP, fontSize: 16, fontWeight: 700, color: INK0, textTransform: "capitalize" }}>
              {MESES[mes.m]} {mes.y}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button type="button" onClick={() => mover(-1)} disabled={esMesActual} aria-label="Mes anterior"
                      className="sf-flecha" style={{ opacity: esMesActual ? 0.25 : 1, cursor: esMesActual ? "default" : "pointer" }}>
                <ChevronLeft size={18} />
              </button>
              <button type="button" onClick={() => mover(1)} aria-label="Mes siguiente" className="sf-flecha">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="sf-grilla">
            {DIAS_SEMANA.map((d, i) => (
              <span key={i} style={{ fontFamily: MONO, fontSize: 10, color: INK2, textAlign: "center", paddingBottom: 6 }}>{d}</span>
            ))}
            {celdas.map((d, i) => {
              if (d === null) return <span key={`h${i}`} />;
              const clave = `${mes.y}-${String(mes.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const esHoy = clave === hoyDia;
              const esElegido = elegido && valor.slice(0, 10) === clave;
              const yaPaso = clave < hoyDia;
              return (
                <button key={clave} type="button" disabled={yaPaso} onClick={() => elegirDia(mes.y, mes.m, d)}
                        className="sf-dia"
                        style={{
                          background: esElegido ? COURT : "transparent",
                          color: esElegido ? "#05070d" : yaPaso ? "rgba(122,130,152,0.35)" : esHoy ? COURT : INK0,
                          fontWeight: esElegido || esHoy ? 700 : 500,
                          cursor: yaPaso ? "default" : "pointer",
                        }}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ruedas de la hora */}
        <div className="sf-ruedas">
          <div className="sf-banda" />
          <Rueda items={HORAS} indice={h12 - 1} ancho={48}
                 onElegir={(i) => elegirHora(((i + 1) % 12) + (hora.h >= 12 ? 12 : 0), hora.min)} />
          <span style={{ fontFamily: DISP, fontSize: 20, color: INK0, alignSelf: "center", zIndex: 1 }}>:</span>
          <Rueda items={MINUTOS} indice={Math.floor(hora.min / 5)} ancho={48}
                 onElegir={(i) => elegirHora(hora.h, i * 5)} />
          <Rueda items={PERIODOS} indice={hora.h >= 12 ? 1 : 0} ancho={64}
                 onElegir={(i) => elegirHora((hora.h % 12) + (i === 1 ? 12 : 0), hora.min)} />
        </div>
      </div>

      {/* En palabras */}
      <span style={{ fontFamily: MONO, fontSize: 12, color: !valor ? INK2 : pasada ? ERR : COURT }}>
        {!valor
          ? "Elegí un día o tocá uno de los atajos."
          : pasada
            ? `Esa hora ya pasó (${frase(valor, hoy)}). Elegí una futura.`
            : `Sale ${frase(valor, hoy)}, hora de Colombia.`}
      </span>

      <style>{`
        .sf-caja { display: flex; gap: 12px; flex-wrap: wrap; }
        .sf-cal, .sf-ruedas {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 14px 16px;
        }
        .sf-cal { flex: 1 1 280px; max-width: 360px; }
        .sf-grilla { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; }
        .sf-dia {
          aspect-ratio: 1; width: 100%; max-width: 40px; justify-self: center; border: none; border-radius: 999px;
          font-family: ${DISP}; font-size: 15px; display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .sf-dia:not(:disabled):hover { background: rgba(255,255,255,0.08); }
        .sf-flecha {
          display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;
          border: none; border-radius: 999px; background: transparent; color: ${COURT};
        }
        .sf-flecha:not(:disabled):hover { background: rgba(46,230,193,0.1); }
        .sf-ruedas {
          position: relative; display: flex; align-items: stretch; justify-content: center; gap: 2px;
          flex: 0 1 240px; height: ${RENGLON * 5}px; box-sizing: content-box; align-self: flex-start;
        }
        .sf-banda {
          position: absolute; left: 10px; right: 10px; top: calc(14px + ${RENGLON * 2}px); height: ${RENGLON}px;
          background: rgba(255,255,255,0.08); border-radius: 9px; pointer-events: none;
        }
        .sf-rueda {
          height: ${RENGLON * 5}px; overflow-y: auto; scroll-snap-type: y mandatory; scrollbar-width: none;
          -webkit-mask-image: linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent);
                  mask-image: linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent);
          position: relative; z-index: 1;
        }
        .sf-rueda::-webkit-scrollbar { display: none; }
        .sf-rueda button {
          display: block; width: 100%; height: ${RENGLON}px; scroll-snap-align: center; border: none;
          background: transparent; font-family: ${DISP}; font-size: 19px; cursor: pointer; padding: 0;
        }
        @media (max-width: 767px) {
          .sf-cal, .sf-ruedas { flex-basis: 100%; max-width: none; }
        }
      `}</style>
    </div>
  );
}

/**
 * Una rueda que se desliza y se detiene en un renglón, como las del iPhone.
 * También se puede tocar un renglón para ir directo a él.
 */
function Rueda({ items, indice, ancho, onElegir }: {
  items: string[]; indice: number; ancho: number; onElegir: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const espera = useRef<number | undefined>(undefined);
  const primera = useRef(true);

  /* Llevar la rueda al renglón elegido cuando cambia desde afuera */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const destino = indice * RENGLON;
    const deGolpe = primera.current;
    primera.current = false;
    if (Math.abs(el.scrollTop - destino) < 2) return;
    el.scrollTo({ top: destino, behavior: deGolpe ? "auto" : "smooth" });
  }, [indice]);

  useEffect(() => () => window.clearTimeout(espera.current), []);

  /* Cuando la rueda deja de moverse, el renglón del centro es el elegido */
  function alDeslizar() {
    window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / RENGLON)));
      if (i !== indice) onElegir(i);
    }, 140);
  }

  return (
    <div ref={ref} className="sf-rueda" onScroll={alDeslizar} style={{ width: ancho }}>
      <div style={{ height: RENGLON * 2 }} />
      {items.map((t, i) => {
        const distancia = Math.abs(i - indice);
        return (
          <button key={t} type="button" onClick={() => onElegir(i)}
                  style={{ color: distancia === 0 ? INK0 : INK2, opacity: distancia === 0 ? 1 : distancia === 1 ? 0.7 : 0.4,
                           fontWeight: distancia === 0 ? 600 : 400 }}>
            {t}
          </button>
        );
      })}
      <div style={{ height: RENGLON * 2 }} />
    </div>
  );
}
