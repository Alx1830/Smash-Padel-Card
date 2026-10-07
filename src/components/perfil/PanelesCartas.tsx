"use client";

/**
 * Paneles del Resumen que muestran cartas. Los datos (qué cartas) llegan del
 * servidor ya recortados; aquí solo se cargan los sets para tener las fotos,
 * porque SET_CARDS solo existe en el navegador.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { getVersionLabel, getVersionColor } from "@/data/pokemon-cards-meta";
import { formatPrice, CURRENCY_SYMBOL } from "@/lib/currency";
import { fotoChica } from "@/lib/foto-carta";
import { cargarResenas, cargarReferencias, ResenaFila, ReferenciaFila, type Resena, type Referencia, type Compradores } from "@/components/Resenas";
import { GOLD, HEART, COURT, INK0, INK2, MONO, INNER_BORDER } from "./tokens";

const SET_NOMBRE = new Map(POKEMON_SERIES.flatMap(s => s.sets).map(s => [s.id, s.name]));

export interface RefCarta { set_id: string; card_id: number | string; version?: string }

type Carta = NonNullable<ReturnType<typeof resolver>>;

function resolver(r: RefCarta) {
  const cartas = SET_CARDS[r.set_id];
  if (!cartas) return null;
  if (r.version) {
    const exacta = cartas.find(c => c.card_number === Number(r.card_id) && c.version === r.version);
    if (exacta) return exacta;
  }
  return cartas.find(c => c.id === r.card_id || String(c.id) === String(r.card_id))
    ?? cartas.find(c => c.card_number === Number(r.card_id))
    ?? null;
}

/** Carga los sets de las referencias y devuelve las cartas resueltas (null mientras carga). */
function useCartas<T extends RefCarta>(refs: T[]) {
  const [listo, setListo] = useState(false);
  const clave = refs.map(r => r.set_id).join(",");
  useEffect(() => {
    let vivo = true;
    loadManySets([...new Set(clave.split(",").filter(Boolean))]).then(() => { if (vivo) setListo(true); });
    return () => { vivo = false; };
  }, [clave]);
  if (!listo) return null;
  return refs.map(r => ({ ref: r, carta: resolver(r) })).filter((x): x is { ref: T; carta: Carta } => !!x.carta);
}

/**
 * Si el elemento está a la vista. El carrusel y las filas que avanzan solas
 * se detienen fuera de pantalla: en el celular, con todo apilado en una
 * columna, seguían moviéndose (y repintando) aunque nadie los mirara.
 */
function useALaVista<T extends HTMLElement>() {
  // Ref por función: mientras cargan las fotos se pinta un hueco y después la
  // fila real; hay que observar el elemento que esté montado en cada momento.
  const [el, setEl] = useState<T | null>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, [el]);
  return [setEl, visible] as const;
}

const txt: React.CSSProperties = { margin: 0, fontFamily: MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

/* ══ Carrusel de cartas destacadas ══
   Todas las cartas quedan montadas y cada una se desliza a su nueva posición:
   así el paso de una a otra es continuo (estilo Apple) y no un cambio de golpe.
   La curva es un "ease-out" largo y suave; la central crece y se ilumina, las
   de los lados se alejan, giran un poco y se atenúan. Se puede arrastrar. */
const CURVA = "cubic-bezier(0.22, 1, 0.36, 1)";

export function CarruselDestacadas({ refs }: { refs: RefCarta[] }) {
  const cartas = useCartas(refs);
  const [idx, setIdx] = useState(0);
  const [pausa, setPausa] = useState(false);
  const arrastre = useRef<{ x: number; id: number } | null>(null);
  const [caja, aLaVista] = useALaVista<HTMLDivElement>();
  const n = cartas?.length ?? 0;

  const ir = useCallback((d: number) => setIdx(i => (i + d + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || pausa || !aLaVista) return;
    const t = setInterval(() => setIdx(i => (i + 1) % n), 4200);
    return () => clearInterval(t);
  }, [n, pausa, aLaVista]);

  if (!cartas) return <div ref={caja} style={{ height: 320 }} />;
  if (n === 0) return null;

  /** Distancia de cada carta a la del centro, por el camino más corto del círculo */
  const desfase = (i: number) => {
    let d = (i - idx + n) % n;
    if (d > n / 2) d -= n;
    return d;
  };

  function soltar(e: React.PointerEvent) {
    const a = arrastre.current;
    arrastre.current = null;
    if (!a || a.id !== e.pointerId) return;
    const dx = e.clientX - a.x;
    if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1);
  }

  return (
    <div className="pf-car" ref={caja} onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)}>
      <style>{`
        .pf-car { position: relative; container-type: inline-size; }
        .pf-car-escena {
          --w: clamp(118px, 34cqw, 168px);
          position: relative; height: calc(var(--w) * 1.4 + 86px); perspective: 1100px;
          touch-action: pan-y; user-select: none; cursor: grab;
        }
        .pf-car-escena:active { cursor: grabbing; }
        .pf-car-item {
          position: absolute; top: 6px; left: 50%; width: var(--w); margin-left: calc(var(--w) / -2);
          text-align: center;
          transition: transform 900ms ${CURVA}, opacity 700ms ${CURVA};
          will-change: transform, opacity;
        }
        .pf-car-item img {
          display: block; width: 100%; aspect-ratio: 5 / 7; object-fit: cover; border-radius: 9px; pointer-events: none;
          border: 2px solid transparent;
          transition: border-color 700ms ${CURVA}, box-shadow 900ms ${CURVA};
        }
        .pf-car-item.centro img { border-color: ${GOLD}; box-shadow: 0 0 28px rgba(255,180,60,.55), 0 18px 40px -16px rgba(0,0,0,.8); }
        .pf-car-texto { transition: opacity 600ms ${CURVA}; }
        .pf-car-flecha {
          position: absolute; top: calc(var(--w) * 0.7 - 10px); z-index: 20; width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          background: rgba(5,7,13,.8); border: 1px solid rgba(255,255,255,.12); color: ${INK0};
          transition: background .2s, border-color .2s;
        }
        .pf-car-flecha:hover { background: rgba(5,7,13,.95); border-color: rgba(46,230,193,.4); }
        .pf-car-punto { height: 5px; border-radius: 3px; transition: width 600ms ${CURVA}, background 600ms ${CURVA}; }
        @media (pointer: coarse) {
          .pf-car-flecha { display: none; }
          /* Los puntos miden 5 px: con el dedo, una capa invisible los hace tocables */
          .pf-car-puntos { gap: 10px !important; }
          .pf-car-punto { position: relative; }
          .pf-car-punto::before { content: ""; position: absolute; inset: -14px -5px; }
        }
        /* En una columna angosta, las cartas del fondo se salían del panel
           por los costados: se recortan en el borde, sin tocar el brillo de arriba y abajo. */
        @media (max-width: 1023px), (pointer: coarse) { .pf-car { overflow-x: clip; } }
        @media (prefers-reduced-motion: reduce) {
          .pf-car-item, .pf-car-item img, .pf-car-texto, .pf-car-punto { transition: none; }
        }
      `}</style>
      {n > 1 && (
        <>
          <button type="button" className="pf-car-flecha" style={{ left: 4 }} onClick={() => ir(-1)} aria-label="Anterior"><ChevronLeft size={16} /></button>
          <button type="button" className="pf-car-flecha" style={{ right: 4 }} onClick={() => ir(1)} aria-label="Siguiente"><ChevronRight size={16} /></button>
        </>
      )}
      <div className="pf-car-escena"
        onPointerDown={e => { arrastre.current = { x: e.clientX, id: e.pointerId }; }}
        onPointerUp={soltar} onPointerCancel={() => { arrastre.current = null; }}>
        {cartas.map(({ carta, ref }, i) => {
          const d = desfase(i);
          const lejos = Math.abs(d);
          const centro = d === 0;
          const escala = centro ? 1 : lejos === 1 ? 0.8 : 0.64;
          const giro = centro ? 0 : d < 0 ? 16 : -16;
          // Cada paso hacia afuera se corre menos: las cartas se van apilando atrás
          const x = Math.sign(d) * (lejos === 0 ? 0 : lejos === 1 ? 0.78 : 1.34 + (lejos - 2) * 0.3);
          const opacidad = centro ? 1 : lejos === 1 ? 0.78 : lejos === 2 ? 0.32 : 0;
          return (
            <div key={`${ref.set_id}-${ref.card_id}-${i}`}
              className={`pf-car-item${centro ? " centro" : ""}`}
              aria-hidden={!centro}
              onClick={() => !centro && lejos <= 2 && ir(d)}
              style={{
                transform: `translateX(calc(var(--w) * ${x})) translateZ(${centro ? 0 : -60 * lejos}px) rotateY(${giro}deg) scale(${escala})`,
                opacity: opacidad,
                zIndex: 10 - lejos,
                cursor: centro ? "default" : "pointer",
                pointerEvents: lejos > 2 ? "none" : "auto",
              }}>
              <img src={fotoChica(carta.image)} alt={carta.name} decoding="async" loading={lejos <= 1 ? "eager" : "lazy"} draggable={false} />
              <div className="pf-car-texto" style={{ opacity: centro ? 1 : lejos === 1 ? 0.75 : 0 }}>
                <p style={{ ...txt, marginTop: 8, fontSize: 11, fontWeight: 600, color: INK0 }}>{carta.name}</p>
                <p style={{ ...txt, fontSize: 9, color: INK2 }}>{SET_NOMBRE.get(ref.set_id) ?? ""}</p>
                <span style={{ display: "inline-block", marginTop: 6, height: 18, lineHeight: "16px", padding: "0 8px", borderRadius: 999, border: `1.5px solid ${getVersionColor(carta.version)}`, color: getVersionColor(carta.version), fontFamily: MONO, fontSize: 9, fontWeight: 700 }}>
                  {getVersionLabel(carta.version)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {n > 1 && (
        <div className="pf-car-puntos" style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 6 }}>
          {cartas.map((_, i) => (
            <button key={i} type="button" onClick={() => setIdx(i)} aria-label={`Carta ${i + 1}`} className="pf-car-punto"
              style={{ width: i === idx ? 16 : 5, padding: 0, border: "none", cursor: "pointer", background: i === idx ? COURT : "rgba(255,255,255,.25)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ══ Fila corta de cartas: wishlist o en venta ══
   Se ven 4 a la vez. Con más de 3 cartas la fila avanza sola hacia la
   izquierda, una carta cada pocos segundos y con la misma curva suave del
   carrusel de destacadas; con 3 o menos se queda quieta. Al pasar el mouse
   se detiene. Para que el giro sea continuo, las primeras cartas se repiten
   al final y, al llegar a ellas, la fila vuelve al inicio sin animación. */
export interface RefVenta extends RefCarta { price_cop: number; currency: string }

const VISIBLES = 4;

export function MiniGrillaCartas({ refs, modo, href }: { refs: (RefCarta | RefVenta)[]; modo: "wishlist" | "venta"; href: string }) {
  const cartas = useCartas(refs);
  const n = cartas?.length ?? 0;
  const mueve = n > 3;
  const [paso, setPaso] = useState(0);
  const [animar, setAnimar] = useState(true);
  const [pausa, setPausa] = useState(false);
  const [caja, aLaVista] = useALaVista<HTMLDivElement>();

  useEffect(() => {
    if (!mueve || pausa || !aLaVista) return;
    const t = setInterval(() => { setAnimar(true); setPaso(p => p + 1); }, 2800);
    return () => clearInterval(t);
  }, [mueve, pausa, aLaVista]);

  // Al terminar la vuelta, salto invisible al principio
  useEffect(() => {
    if (!mueve || paso < n) return;
    const t = setTimeout(() => { setAnimar(false); setPaso(0); }, 750);
    return () => clearTimeout(t);
  }, [paso, n, mueve]);

  if (!cartas) return <div ref={caja} style={{ height: 150 }} />;

  const fila = mueve ? [...cartas, ...cartas.slice(0, VISIBLES)] : cartas;

  return (
    <div className="pf-mini" ref={caja} onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)}>
      <style>{`
        .pf-mini { overflow: hidden; --vis: ${VISIBLES}; }
        /* En el celular se ven tres: con cuatro en 320 px cada carta quedaba
           de 70 px y el nombre no se leía. */
        @media (max-width: 480px) { .pf-mini { --vis: 3; } }
        .pf-mini-pista { display: flex; gap: 10px; }
        .pf-mini-item { flex: 0 0 calc((100% - (var(--vis) - 1) * 10px) / var(--vis)); min-width: 0; text-decoration: none; }
        .pf-mini-pista.anima { transition: transform 750ms ${CURVA}; }
        @media (prefers-reduced-motion: reduce) { .pf-mini-pista.anima { transition: none; } }
      `}</style>
      <div className={`pf-mini-pista${animar ? " anima" : ""}`}
        style={{ transform: mueve ? `translateX(calc(-${paso} * (100% + 10px) / var(--vis)))` : undefined }}>
        {fila.map(({ ref, carta }, i) => (
          <Link key={`${ref.set_id}-${ref.card_id}-${ref.version ?? ""}-${i}`} href={href} scroll={false} className="pf-mini-item"
            aria-hidden={i >= n} tabIndex={i >= n ? -1 : undefined}>
            <div style={{ position: "relative" }}>
              <img src={fotoChica(carta.image)} alt={carta.name} loading="lazy" decoding="async"
                style={{ display: "block", width: "100%", aspectRatio: "5 / 7", objectFit: "cover", borderRadius: 8, border: INNER_BORDER }} />
              {modo === "wishlist" && (
                <span style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: "50%", background: "rgba(5,7,13,.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Heart size={12} color={HEART} fill={HEART} />
                </span>
              )}
            </div>
            <p style={{ ...txt, marginTop: 6, fontSize: 10.5, fontWeight: 600, color: INK0 }}>{carta.name}</p>
            {modo === "venta" && "price_cop" in ref ? (
              <p style={{ ...txt, fontSize: 9.5, fontWeight: 700, color: COURT }}>{CURRENCY_SYMBOL[ref.currency] ?? "$"}{formatPrice(ref.price_cop, ref.currency)}</p>
            ) : (
              <p style={{ ...txt, fontSize: 9.5, color: INK2 }}>{SET_NOMBRE.get(ref.set_id) ?? ref.set_id}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ══ Últimas reseñas ══ */
/* Ventas confirmadas y referencias de la comunidad juntas, las tres más
   nuevas; cada una lleva su etiqueta para que no se confundan. */
type Opinion =
  | { tipo: "venta"; fecha: string; r: Resena }
  | { tipo: "referencia"; fecha: string; r: Referencia };

export function ResenasMini({ vendedorId, vacio }: { vendedorId: string; vacio: React.ReactNode }) {
  const [datos, setDatos] = useState<{ opiniones: Opinion[]; personas: Compradores } | null>(null);
  useEffect(() => {
    Promise.all([
      cargarResenas(vendedorId, 3).catch(() => ({ resenas: [] as Resena[], compradores: {} as Compradores })),
      cargarReferencias(vendedorId, 3).catch(() => ({ referencias: [] as Referencia[], autores: {} as Compradores })),
    ]).then(([v, ref]) => {
      const opiniones: Opinion[] = [
        ...v.resenas.map(r => ({ tipo: "venta" as const, fecha: r.respondida_at, r })),
        ...ref.referencias.map(r => ({ tipo: "referencia" as const, fecha: r.creada, r })),
      ].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 3);
      setDatos({ opiniones, personas: { ...v.compradores, ...ref.autores } });
    });
  }, [vendedorId]);

  if (!datos) return <div style={{ height: 80 }} />;
  if (datos.opiniones.length === 0) return <>{vacio}</>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {datos.opiniones.map(o => o.tipo === "venta"
        ? <ResenaFila key={o.r.id} r={o.r} comprador={datos.personas[o.r.comprador_id]} />
        : <ReferenciaFila key={o.r.id} r={o.r} autor={datos.personas[o.r.autor_id]} />)}
    </div>
  );
}
