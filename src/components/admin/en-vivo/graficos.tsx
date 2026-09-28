"use client";

/**
 * Gráficos del panel En vivo, dibujados a mano en SVG (sin librerías: el sitio
 * corre en Workers y cada kilo cuenta). Todos funcionan igual con el mouse que
 * con el dedo: pasar o tocar muestra el dato.
 */

import { useId, useState, type PointerEvent, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  MONO, DISP, INK0, INK1, INK2, SURF_SOLIDA, GRIS_OTROS, GRIS_SIN, SIN_DATO,
  num, useAncho,
} from "./comun";

/* ── Utilidades ──────────────────────────────────────────────── */

/** Tope y paso "redondos" para el eje Y (0, 5, 10… o 0, 20, 40…) */
function escala(max: number, marcas = 3): { tope: number; paso: number } {
  if (max <= 0) return { tope: 1, paso: 1 };
  const bruto = max / marcas;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const f = bruto / mag;
  const paso = Math.max(1, (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag);
  return { paso, tope: Math.ceil(max / paso) * paso };
}

const corto = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}k` : String(n));

/** Barra con la punta redondeada (4 px) y la base recta */
function barra(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/** Los ids de los degradados no pueden llevar los caracteres que genera useId */
const idLimpio = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

/* ── Globo (tooltip) ─────────────────────────────────────────── */

const ANCHO_GLOBO = 184;

function Globo({ x, y, ancho, children }: { x: number; y: number; ancho: number; children: ReactNode }) {
  const left = Math.min(Math.max(x - ANCHO_GLOBO / 2, 0), Math.max(0, ancho - ANCHO_GLOBO));
  return <div className="ev-globo" role="status" style={{ left, top: y, width: ANCHO_GLOBO }}>{children}</div>;
}

/** Un renglón del globo: el valor manda, el nombre acompaña, con su rayita de color */
export function FilaGlobo({ color, valor, nombre }: { color?: string; valor: string; nombre: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      {color && <span style={{ width: 12, height: 2, borderRadius: 2, background: color, flexShrink: 0 }} />}
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: INK0 }}>{valor}</span>
      <span style={{ fontFamily: MONO, fontSize: 10, color: INK1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</span>
    </div>
  );
}

const CabezaGlobo = ({ children }: { children: ReactNode }) => (
  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: INK2 }}>{children}</div>
);

/* ── Columnas (por minuto, por hora) ─────────────────────────── */

export interface Columna { clave: string; eje: string; titulo: string; valor: number; detalle?: string }

export function Columnas({ datos, color, unidad, alto = 170 }: {
  datos: Columna[]; color: string; unidad: string; alto?: number;
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [activo, setActivo] = useState<number | null>(null);
  const gid = idLimpio(useId());

  const PAD = { t: 12, r: 4, b: 26, l: 34 };
  const iw = Math.max(0, ancho - PAD.l - PAD.r);
  const ih = alto - PAD.t - PAD.b;
  const n = datos.length;
  const banda = n ? iw / n : 0;
  const grosor = Math.max(2, Math.min(24, banda - 2));
  const { tope, paso } = escala(Math.max(0, ...datos.map(d => d.valor)));
  const y = (v: number) => PAD.t + ih - (v / tope) * ih;

  /* Menos marcas en el eje cuando la caja es angosta, contando desde el final */
  const cada = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 76))));

  function mover(e: PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left - PAD.l) / (banda || 1));
    setActivo(i >= 0 && i < n ? i : null);
  }

  const act = activo !== null ? datos[activo] : null;

  return (
    <div ref={ref} style={{ position: "relative", height: alto }}>
      {ancho > 0 && (
        <svg width={ancho} height={alto} style={{ display: "block", touchAction: "pan-y" }}
          onPointerMove={mover} onPointerDown={mover}
          onPointerLeave={e => { if (e.pointerType === "mouse") setActivo(null); }}
          role="img" aria-label={`Gráfico de ${unidad}`}>
          <defs>
            <linearGradient id={`${gid}-c`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.35" />
            </linearGradient>
            <filter id={`${gid}-b`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {Array.from({ length: tope / paso + 1 }, (_, i) => {
            const v = i * paso;
            return (
              <g key={v}>
                <line x1={PAD.l} x2={ancho - PAD.r} y1={y(v)} y2={y(v)} stroke={i === 0 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)"} />
                <text x={PAD.l - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fontFamily={MONO} fill={INK2}>{corto(v)}</text>
              </g>
            );
          })}

          {datos.map((d, i) => {
            const x = PAD.l + i * banda + (banda - grosor) / 2;
            const h = (d.valor / tope) * ih;
            const on = activo === i;
            return (
              <g key={d.clave}>
                {on && <rect x={PAD.l + i * banda} y={PAD.t} width={banda} height={ih} fill="rgba(255,255,255,0.04)" rx={4} />}
                {on && h > 0 && <path d={barra(x, y(d.valor), grosor, h)} fill={color} opacity={0.6} filter={`url(#${gid}-b)`} />}
                <path d={barra(x, y(d.valor), grosor, h)} fill={`url(#${gid}-c)`} opacity={activo === null || on ? 1 : 0.55} />
              </g>
            );
          })}

          {datos.map((d, i) => ((n - 1 - i) % cada === 0 ? (
            <text key={d.clave} x={PAD.l + i * banda + banda / 2} y={alto - 8} textAnchor={i === n - 1 ? "end" : "middle"}
              fontSize="10" fontFamily={MONO} fill={INK2} dx={i === n - 1 ? banda / 2 : 0}>{d.eje}</text>
          ) : null))}
        </svg>
      )}
      {act && activo !== null && (
        <Globo x={PAD.l + activo * banda + banda / 2} y={y(act.valor) - 4} ancho={ancho}>
          <CabezaGlobo>{act.titulo}</CabezaGlobo>
          <FilaGlobo color={color} valor={num(act.valor)} nombre={unidad} />
          {act.detalle && <div style={{ fontFamily: MONO, fontSize: 10, color: INK2, marginTop: 4 }}>{act.detalle}</div>}
        </Globo>
      )}
    </div>
  );
}

/* ── Área por día ────────────────────────────────────────────── */

export interface Serie { nombre: string; color: string; valores: number[] }

export function Area({ ejes, titulos, series, alto = 200 }: {
  ejes: string[]; titulos: string[]; series: Serie[]; alto?: number;
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [activo, setActivo] = useState<number | null>(null);
  const gid = idLimpio(useId());

  const n = ejes.length;
  const PAD = { t: 14, r: 14, b: 26, l: 34 };
  const iw = Math.max(0, ancho - PAD.l - PAD.r);
  const ih = alto - PAD.t - PAD.b;
  const { tope, paso } = escala(Math.max(0, ...series.flatMap(s => s.valores)));
  const x = (i: number) => (n <= 1 ? PAD.l + iw / 2 : PAD.l + (i * iw) / (n - 1));
  const y = (v: number) => PAD.t + ih - (v / tope) * ih;
  const base = PAD.t + ih;
  const conPuntos = n <= 14;

  /* Marcas del eje X: tantas como quepan (una cada ~70 px), la última siempre */
  const caben = Math.max(2, Math.floor(iw / 70));
  const cada = Math.max(1, Math.ceil((n - 1) / (caben - 1)));
  const marcas = n <= 1 ? [0] : Array.from({ length: n }, (_, i) => i).filter(i => (n - 1 - i) % cada === 0);

  function mover(e: PointerEvent<SVGSVGElement>) {
    if (n === 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = n <= 1 ? 0 : Math.round(((px - PAD.l) / (iw || 1)) * (n - 1));
    setActivo(Math.max(0, Math.min(n - 1, i)));
  }

  const linea = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");

  return (
    <div>
      {series.length >= 2 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginBottom: 10 }}>
          {series.map(s => (
            <span key={s.nombre} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 10, color: INK1 }}>
              <span style={{ width: 14, height: 2, borderRadius: 2, background: s.color }} /> {s.nombre}
            </span>
          ))}
        </div>
      )}
      <div ref={ref} style={{ position: "relative", height: alto }}>
        {ancho > 0 && (
          <svg width={ancho} height={alto} style={{ display: "block", touchAction: "pan-y" }}
            onPointerMove={mover} onPointerDown={mover}
            onPointerLeave={e => { if (e.pointerType === "mouse") setActivo(null); }}
            role="img" aria-label={series.map(s => s.nombre).join(" y ") + " por día"}>
            <defs>
              {series.map((s, k) => (
                <linearGradient key={s.nombre} id={`${gid}-a${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={series.length > 1 ? 0.22 : 0.32} />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              ))}
              <filter id={`${gid}-g`} x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            {Array.from({ length: tope / paso + 1 }, (_, i) => {
              const v = i * paso;
              return (
                <g key={v}>
                  <line x1={PAD.l} x2={ancho - PAD.r} y1={y(v)} y2={y(v)} stroke={i === 0 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)"} />
                  <text x={PAD.l - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fontFamily={MONO} fill={INK2}>{corto(v)}</text>
                </g>
              );
            })}

            {n > 1 && series.map((s, k) => (
              <g key={s.nombre}>
                <path d={`${linea(s.valores)}L${x(n - 1)},${base}L${x(0)},${base}Z`} fill={`url(#${gid}-a${k})`} />
                {/* Brillo: la misma línea desenfocada debajo */}
                <path d={linea(s.valores)} fill="none" stroke={s.color} strokeWidth={4} opacity={0.35} filter={`url(#${gid}-g)`} />
                <path d={linea(s.valores)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            ))}

            {activo !== null && (
              <line x1={x(activo)} x2={x(activo)} y1={PAD.t} y2={base} stroke="rgba(255,255,255,0.25)" />
            )}

            {series.map(s => s.valores.map((v, i) => {
              const on = activo === i;
              if (!(on || conPuntos || i === n - 1 || n === 1)) return null;
              return <circle key={`${s.nombre}-${i}`} cx={x(i)} cy={y(v)} r={on ? 5.5 : 4} fill={s.color} stroke={SURF_SOLIDA} strokeWidth={2} />;
            }))}

            {marcas.map(i => (
              <text key={i} x={x(i)} y={alto - 8} fontSize="10" fontFamily={MONO} fill={INK2}
                textAnchor={n > 1 && i === n - 1 ? "end" : n > 1 && i === 0 ? "start" : "middle"}>{ejes[i]}</text>
            ))}
          </svg>
        )}
        {activo !== null && ancho > 0 && (
          <Globo x={x(activo)} y={Math.min(...series.map(s => y(s.valores[activo] ?? 0))) - 6} ancho={ancho}>
            <CabezaGlobo>{titulos[activo]}</CabezaGlobo>
            {series.map(s => <FilaGlobo key={s.nombre} color={s.color} valor={num(s.valores[activo] ?? 0)} nombre={s.nombre} />)}
          </Globo>
        )}
      </div>
    </div>
  );
}

/* ── Dona (partes de un todo) ────────────────────────────────── */

export interface Porcion { k: string; etiqueta: string; n: number; color: string }

/** A lo sumo 5 porciones con color; el resto se junta en "Otros" y "Sin dato" va al final */
export function porciones(pares: { k: string; n: number }[], color: (k: string, i: number) => string, etiqueta: (k: string) => string = k => k): Porcion[] {
  const conDato = pares.filter(p => p.k !== SIN_DATO && p.n > 0);
  const sin = pares.filter(p => p.k === SIN_DATO).reduce((s, p) => s + p.n, 0);
  const cabeza = conDato.length > 6 ? conDato.slice(0, 5) : conDato;
  const resto = conDato.length > 6 ? conDato.slice(5).reduce((s, p) => s + p.n, 0) : 0;
  const out: Porcion[] = cabeza.map((p, i) => ({ k: p.k, etiqueta: etiqueta(p.k), n: p.n, color: color(p.k, i) }));
  if (resto) out.push({ k: "__otros", etiqueta: "Otros", n: resto, color: GRIS_OTROS });
  if (sin) out.push({ k: SIN_DATO, etiqueta: SIN_DATO, n: sin, color: GRIS_SIN });
  return out;
}

export function Dona({ datos, unidad }: { datos: Porcion[]; unidad: string }) {
  const [activo, setActivo] = useState<string | null>(null);
  const total = datos.reduce((s, d) => s + d.n, 0);
  const R = 52, C = 2 * Math.PI * R;
  const hueco = datos.length > 1 ? 3 : 0;
  const act = datos.find(d => d.k === activo) ?? null;

  const largos = datos.map(d => (total ? (d.n / total) * C : 0));
  const arcos = datos.map((d, i) => ({
    ...d, largo: largos[i], desde: largos.slice(0, i).reduce((s, l) => s + l, 0),
  }));

  return (
    <div className="ev-dona" onPointerLeave={e => { if (e.pointerType === "mouse") setActivo(null); }}>
      <svg viewBox="0 0 140 140" className="ev-dona-svg" role="img"
        aria-label={datos.map(d => `${d.etiqueta}: ${d.n}`).join(", ")}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="16" />
        <g transform="rotate(-90 70 70)">
          {arcos.map(a => {
            const on = activo === a.k;
            const trazo = Math.max(0.01, a.largo - hueco);
            return (
              <circle key={a.k} cx="70" cy="70" r={R} fill="none" stroke={a.color}
                strokeWidth={on ? 21 : 16} strokeDasharray={`${trazo} ${C - trazo}`} strokeDashoffset={-a.desde}
                opacity={activo === null || on ? 1 : 0.4}
                style={{ transition: "stroke-width .15s, opacity .15s", cursor: "pointer" }}
                onPointerEnter={() => setActivo(a.k)} onPointerDown={() => setActivo(a.k)} />
            );
          })}
        </g>
        <text x="70" y={act ? 70 : 74} textAnchor="middle" fontFamily={DISP} fontWeight="700" fill={INK0}
          fontSize={num(act ? act.n : total).length > 4 ? 19 : num(act ? act.n : total).length > 3 ? 22 : 26}>
          {num(act ? act.n : total)}
        </text>
        <text x="70" y={act ? 88 : 92} textAnchor="middle" fontFamily={MONO} fontSize="9" fill={INK2} letterSpacing="0.08em">
          {act ? `${Math.round((act.n / (total || 1)) * 100)} %` : unidad.toUpperCase()}
        </text>
      </svg>

      <ul className="ev-leyenda">
        {datos.map(d => {
          const pct = Math.round((d.n / (total || 1)) * 100);
          return (
            <li key={d.k}>
              <button type="button" className={activo === d.k ? "on" : ""}
                onPointerEnter={e => { if (e.pointerType === "mouse") setActivo(d.k); }}
                onFocus={() => setActivo(d.k)} onBlur={() => setActivo(null)}
                onClick={() => setActivo(d.k)}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                <span className="ev-leyenda-nombre" style={{ color: d.k === SIN_DATO ? INK2 : INK1 }}>{d.etiqueta}</span>
                <span style={{ color: INK0, fontWeight: 600 }}>{num(d.n)}</span>
                <span style={{ color: INK2, width: 36, textAlign: "right" }}>{pct} %</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Lista con barras ────────────────────────────────────────── */

export interface FilaBarra { k: string; etiqueta: string; n: number; sub?: string; href?: string; chip?: string }

export function ListaBarras({ filas, color, visibles = 7, unidad }: {
  filas: FilaBarra[]; color: string; visibles?: number; unidad: string;
}) {
  const [todas, setTodas] = useState(false);
  const max = Math.max(1, ...filas.map(f => f.n));
  const total = filas.reduce((s, f) => s + f.n, 0) || 1;
  const lista = todas ? filas : filas.slice(0, visibles);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {lista.map(f => {
        const sin = f.k === SIN_DATO;
        const c = sin ? GRIS_SIN : color;
        return (
          <div key={f.k} title={`${f.etiqueta}: ${num(f.n)} ${unidad} (${Math.round((f.n / total) * 100)} %)`}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontFamily: MONO, fontSize: 11, marginBottom: 5 }}>
              {f.chip && <span className="ev-chip">{f.chip}</span>}
              <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: sin ? INK2 : INK1 }}>
                {f.href ? <Link href={f.href} className="ev-enlace">{f.etiqueta}</Link> : f.etiqueta}
                {f.sub && <span style={{ color: INK2, fontSize: 9, marginLeft: 6 }}>{f.sub}</span>}
              </span>
              <span style={{ color: INK0, fontWeight: 600, flexShrink: 0 }}>{num(f.n)}</span>
              <span style={{ color: INK2, fontSize: 9, width: 30, textAlign: "right", flexShrink: 0 }}>{Math.round((f.n / total) * 100)}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.045)" }}>
              <div style={{
                width: `${Math.max(2, (f.n / max) * 100)}%`, height: "100%", borderRadius: 4,
                background: sin ? c : `linear-gradient(90deg, color-mix(in srgb, ${c} 45%, transparent), ${c})`,
                boxShadow: sin ? "none" : `0 0 10px color-mix(in srgb, ${c} 45%, transparent)`,
              }} />
            </div>
          </div>
        );
      })}
      {filas.length > visibles && (
        <button type="button" className="ev-mas" onClick={() => setTodas(t => !t)}>
          <ChevronDown size={13} strokeWidth={2} style={{ transform: todas ? "rotate(180deg)" : undefined }} />
          {todas ? "Ver menos" : `Ver ${filas.length - visibles} más`}
        </button>
      )}
    </div>
  );
}

/* ── Mapa de calor ───────────────────────────────────────────── */

export interface Celda { clave: string; corta: string; larga: string; valor: number }

/** Un solo tono de menos a más: sin visitas casi no se ve, el pico brilla */
function tono(v: number, max: number): { fondo: string; tinta: string; brillo: string } {
  if (v <= 0 || max <= 0) return { fondo: "rgba(255,255,255,0.03)", tinta: INK2, brillo: "none" };
  const a = 0.14 + 0.86 * Math.pow(v / max, 0.75);
  return {
    fondo: `rgba(46,230,193,${a.toFixed(3)})`,
    tinta: a > 0.55 ? "#04110d" : INK0,
    brillo: a > 0.7 ? `0 0 14px rgba(46,230,193,${(a * 0.45).toFixed(2)})` : "none",
  };
}

export function MapaCalor({ celdas, clase, unidad }: { celdas: Celda[]; clase: string; unidad: string }) {
  const max = Math.max(0, ...celdas.map(c => c.valor));
  const total = celdas.reduce((s, c) => s + c.valor, 0) || 1;
  const pico = celdas.reduce<Celda | null>((m, c) => (!m || c.valor > m.valor ? c : m), null);
  const [sel, setSel] = useState<string | null>(null);
  const actual = celdas.find(c => c.clave === sel) ?? null;
  const mostrar = actual ?? (pico && pico.valor > 0 ? pico : null);

  return (
    <div onPointerLeave={e => { if (e.pointerType === "mouse") setSel(null); }}>
      <div className={`ev-calor ${clase}`}>
        {celdas.map(c => {
          const t = tono(c.valor, max);
          const on = sel === c.clave;
          return (
            <button key={c.clave} type="button" className={`ev-celda${on ? " on" : ""}`}
              style={{ background: t.fondo, color: t.tinta, boxShadow: t.brillo }}
              aria-label={`${c.larga}: ${c.valor} ${unidad}`}
              onPointerEnter={e => { if (e.pointerType === "mouse") setSel(c.clave); }}
              onFocus={() => setSel(c.clave)}
              onClick={() => setSel(c.clave)} onBlur={() => setSel(null)}>
              {c.corta}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px 16px", marginTop: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, color: INK1, minHeight: 16 }}>
          {mostrar ? (
            <>
              {!actual && <span style={{ color: INK2 }}>Pico · </span>}
              {mostrar.larga} · <b style={{ color: INK0 }}>{num(mostrar.valor)}</b> {unidad}
              <span style={{ color: INK2 }}> ({Math.round((mostrar.valor / total) * 100)} %)</span>
            </>
          ) : <span style={{ color: INK2 }}>Sin visitas en este rango</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 9, color: INK2 }}>
          Menos
          {[0.14, 0.35, 0.56, 0.78, 1].map(a => (
            <span key={a} style={{ width: 12, height: 12, borderRadius: 3, background: `rgba(46,230,193,${a})` }} />
          ))}
          Más
        </div>
      </div>
    </div>
  );
}

/* ── Chispa (mini tendencia dentro de una tarjeta) ───────────── */

export function Chispa({ valores, color }: { valores: number[]; color: string }) {
  const gid = idLimpio(useId());
  if (valores.length < 2) return null;
  const max = Math.max(1, ...valores);
  const pts = valores.map((v, i) => [(i / (valores.length - 1)) * 100, 28 - (v / max) * 24] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join("");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden
      style={{ display: "block", width: "100%", height: 34, marginTop: 12, overflow: "visible" }}>
      <defs>
        <linearGradient id={`${gid}-s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d}L100,30L0,30Z`} fill={`url(#${gid}-s)`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* Colores fijos por entidad: el mismo sistema o navegador lleva siempre el
   mismo color, aunque cambie de puesto al cambiar el rango. */
export function colorFijo(mapa: Record<string, number>, paleta: readonly string[]) {
  const usados = new Set(Object.values(mapa));
  const libres = paleta.map((_, i) => i).filter(i => !usados.has(i));
  const extra = new Map<string, number>();
  return (k: string, i: number): string => {
    const clave = k.toLowerCase();
    for (const [nombre, idx] of Object.entries(mapa)) if (clave.includes(nombre)) return paleta[idx];
    if (!extra.has(k)) extra.set(k, libres[extra.size % Math.max(1, libres.length)] ?? i % paleta.length);
    return paleta[extra.get(k) ?? 0];
  };
}

export const COLOR_SO = { android: 0, ios: 1, windows: 2, mac: 3, linux: 4, chrome: 5 } as const;
export const COLOR_NAVEGADOR = { chrome: 0, safari: 1, firefox: 2, edge: 3, samsung: 4, opera: 5 } as const;
export const COLOR_DISPOSITIVO = { celular: 0, computador: 1, tablet: 2 } as const;
export const COLOR_APP = { navegador: 1, app: 0 } as const;
