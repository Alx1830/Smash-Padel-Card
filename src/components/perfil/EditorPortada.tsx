"use client";

/**
 * Selector de portada del perfil (solo las autorizadas) y su encuadre
 * arrastrando, estilo Facebook. Viene de la rama de tiendas; ahora es para
 * todos los perfiles.
 */
import { useRef, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { STORE_COVERS, PORTADA_DEGRADADO, isValidStoreCover } from "@/data/store-covers";
import { COURT, BG0, INK0, INK2, MONO, ZOOM_PORTADA_MOVIL } from "./tokens";


export function EditorPortada({ value, onChange, position, onPositionChange, positionMovil, onPositionMovilChange }: {
  value: string;
  onChange: (v: string) => void;
  position: number;
  onPositionChange: (p: number) => void;
  /** Encuadre en el celular: x (0 izquierda, 100 derecha) e y (0 arriba, 100 abajo) */
  positionMovil: { x: number; y: number };
  onPositionMovilChange: (p: { x: number; y: number }) => void;
}) {
  const options = [
    { path: "", name: "Cuadrícula", hint: "Por defecto" },
    ...STORE_COVERS.map(c => ({ path: c.path, name: c.name, hint: "" })),
  ];

  return (
    <div>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(min(150px, 100%), 1fr))" }}>
        {options.map(opt => {
          const active = value === opt.path;
          return (
            <button key={opt.path || "cuadricula"} type="button" onClick={() => onChange(opt.path)} aria-pressed={active}
              style={{
                position: "relative", padding: 0, cursor: "pointer", borderRadius: 10, overflow: "hidden", textAlign: "left",
                border: `1px solid ${active ? COURT : "rgba(255,255,255,0.12)"}`,
                boxShadow: active ? `0 0 0 1px ${COURT}, 0 8px 24px -12px ${COURT}66` : "none",
                background: "rgba(255,255,255,0.03)", transition: "border-color 0.15s, box-shadow 0.15s",
              }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 7", background: opt.path ? undefined : PORTADA_DEGRADADO }}>
                {opt.path ? (
                  <Image src={opt.path} alt={opt.name} fill sizes="220px" style={{ objectFit: "cover" }} />
                ) : (
                  <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
                )}
                {active && (
                  <span style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", background: COURT, color: BG0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={13} strokeWidth={3} />
                  </span>
                )}
              </div>
              <div style={{ padding: "8px 10px 9px" }}>
                <p style={{ fontFamily: MONO, fontSize: 10.5, margin: 0, color: active ? COURT : INK0, letterSpacing: "0.04em" }}>{opt.name}</p>
                {opt.hint && <p style={{ fontFamily: MONO, fontSize: 8.5, color: INK2, margin: "3px 0 0" }}>{opt.hint}</p>}
              </div>
            </button>
          );
        })}
      </div>

      {!isValidStoreCover(value) && (
        <p style={{ fontFamily: MONO, fontSize: 10, color: "#ff6b6b", margin: "10px 0 0" }}>
          Esa portada no está entre las autorizadas. Elige una de la lista.
        </p>
      )}

      {/* La cuadrícula no tiene encuadre: solo las imágenes se pueden correr */}
      {value && (
        <>
          <Encuadre src={value} position={position} onChange={onPositionChange} eje="y" titulo="En computador y tablet" />
          <EncuadreMovil src={value} pos={positionMovil} onChange={onPositionMovilChange} />
        </>
      )}
    </div>
  );
}

/**
 * Recuadro para arrastrar la portada. "y" corre la imagen arriba/abajo (la
 * franja ancha del computador); "x" la corre a los lados (en el celular la
 * franja es angosta y la imagen se recorta por los costados).
 */
function Encuadre({ src, position, onChange, eje, titulo }: {
  src: string; position: number; onChange: (p: number) => void; eje: "x" | "y"; titulo: string;
}) {
  const horizontal = eje === "x";
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ c: 0, pos: 50 });
  const clamp = (n: number) => Math.min(100, Math.max(0, n));

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { c: horizontal ? e.clientX : e.clientY, pos: position };
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const caja = boxRef.current;
    const largo = (horizontal ? caja?.clientWidth : caja?.clientHeight) ?? 1;
    // Arrastrar hacia abajo (o a la derecha) revela la parte de arriba (o de la izquierda)
    const delta = (((horizontal ? e.clientX : e.clientY) - startRef.current.c) / largo) * 100;
    onChange(Math.round(clamp(startRef.current.pos - delta)));
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const menos = horizontal ? "ArrowLeft" : "ArrowUp", mas = horizontal ? "ArrowRight" : "ArrowDown";
    if (e.key === menos) { e.preventDefault(); onChange(clamp(position - 5)); }
    if (e.key === mas)   { e.preventDefault(); onChange(clamp(position + 5)); }
  }

  const mini = (active: boolean): React.CSSProperties => ({
    fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "6px 12px", borderRadius: 7, cursor: "pointer",
    color: active ? BG0 : INK2, background: active ? COURT : "transparent",
    border: `1px solid ${active ? COURT : "rgba(255,255,255,0.14)"}`,
  });

  return (
    <div style={{ marginTop: 14 }}>
      {/* En el celular la portada del perfil se ve mucho más alta (casi 16:9), así
          que el encuadre también crece: muestra un recorte parecido al real y deja
          una franja cómoda para arrastrar con el dedo. Los botones, de 40px. */}
      <style>{`
        @media (max-width: 767px) {
          .ep-encuadre-y { aspect-ratio: 16 / 7 !important; }
        }
        @media (max-width: 767px), (pointer: coarse) {
          .ep-botones button { min-height: 40px; flex: 1 1 0; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: INK2, letterSpacing: "0.1em", textTransform: "uppercase" }}>{titulo} · arrastra {horizontal ? "a los lados" : "arriba o abajo"}</span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: COURT, fontVariantNumeric: "tabular-nums" }}>{position}%</span>
      </div>
      <div ref={boxRef} role="slider" className={`ep-encuadre ep-encuadre-${eje}`} tabIndex={0} aria-label={horizontal ? "Posición horizontal de la portada en el celular" : "Posición vertical de la portada"}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={position}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onKeyDown={onKeyDown}
        style={{
          // El de celular imita la franja de un teléfono (≈390×210)
          position: "relative", width: horizontal ? "min(100%, 340px)" : "100%", aspectRatio: horizontal ? "39 / 21" : "16 / 3", borderRadius: 10, overflow: "hidden",
          border: `1px solid ${dragging ? COURT : "rgba(255,255,255,0.12)"}`,
          cursor: dragging ? "grabbing" : "grab", touchAction: "none", userSelect: "none",
        }}>
        <Image src={src} alt="Previsualización de la portada" fill sizes="720px" draggable={false}
          style={{ objectFit: "cover", objectPosition: horizontal ? `${position}% top` : `center ${position}%`, pointerEvents: "none" }} />
        {/* Guía: dónde cae la foto de perfil (en el celular va centrada) */}
        <div aria-hidden="true" style={horizontal
          ? { position: "absolute", left: "50%", bottom: "-28%", width: "30%", aspectRatio: "1", transform: "translateX(-50%)", borderRadius: "50%", border: "2px dashed rgba(255,255,255,0.5)", background: "rgba(5,7,13,0.5)" }
          : { position: "absolute", left: "4%", bottom: "-18%", width: "11%", aspectRatio: "1", borderRadius: "50%", border: "2px dashed rgba(255,255,255,0.5)", background: "rgba(5,7,13,0.5)" }} />
      </div>
      <div className="ep-botones" style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => onChange(0)} style={mini(position === 0)}>{horizontal ? "Izquierda" : "Arriba"}</button>
        <button type="button" onClick={() => onChange(50)} style={mini(position === 50)}>Centro</button>
        <button type="button" onClick={() => onChange(100)} style={mini(position === 100)}>{horizontal ? "Derecha" : "Abajo"}</button>
      </div>
    </div>
  );
}

/**
 * Encuadre de la portada en el celular, en los dos ejes. En el teléfono la
 * imagen se muestra con zoom (ZOOM_PORTADA_MOVIL) y el punto elegido es el
 * centro del zoom: así sobra imagen arriba, abajo y a los lados. El recuadro
 * imita la franja del teléfono (≈390×210) y se arrastra en cualquier dirección.
 */
function EncuadreMovil({ src, pos, onChange }: {
  src: string; pos: { x: number; y: number }; onChange: (p: { x: number; y: number }) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const inicio = useRef({ cx: 0, cy: 0, x: 50, y: 0 });
  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    inicio.current = { cx: e.clientX, cy: e.clientY, x: pos.x, y: pos.y };
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !boxRef.current) return;
    const { clientWidth: w, clientHeight: h } = boxRef.current;
    // Arrastrar a la derecha (o hacia abajo) muestra lo que está a la izquierda (o arriba).
    // Con el zoom, todo el recorrido cabe en unas 3 veces el tamaño del recuadro.
    const f = 100 / (ZOOM_PORTADA_MOVIL - 1) / 3;
    onChange({
      x: clamp(inicio.current.x - ((e.clientX - inicio.current.cx) / w) * f),
      y: clamp(inicio.current.y - ((e.clientY - inicio.current.cy) / h) * f),
    });
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const paso: Record<string, [number, number]> = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] };
    const d = paso[e.key];
    if (!d) return;
    e.preventDefault();
    onChange({ x: clamp(pos.x + d[0]), y: clamp(pos.y + d[1]) });
  }

  const mini = (active: boolean): React.CSSProperties => ({
    fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "6px 12px", minHeight: 36, borderRadius: 7, cursor: "pointer", flex: "1 1 0",
    color: active ? BG0 : INK2, background: active ? COURT : "transparent",
    border: `1px solid ${active ? COURT : "rgba(255,255,255,0.14)"}`,
  });
  const atajos: { label: string; x: number; y: number }[] = [
    { label: "Arriba", x: 50, y: 0 }, { label: "Centro", x: 50, y: 50 }, { label: "Abajo", x: 50, y: 100 },
    { label: "Izquierda", x: 0, y: pos.y }, { label: "Derecha", x: 100, y: pos.y },
  ];

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: INK2, letterSpacing: "0.1em", textTransform: "uppercase" }}>En el celular · arrastra en cualquier dirección</span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: COURT, fontVariantNumeric: "tabular-nums" }}>{pos.x}% · {pos.y}%</span>
      </div>
      <div ref={boxRef} role="slider" tabIndex={0} aria-label="Encuadre de la portada en el celular"
        aria-valuetext={`horizontal ${pos.x} %, vertical ${pos.y} %`}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onKeyDown={onKeyDown}
        style={{
          position: "relative", width: "min(100%, 340px)", aspectRatio: "39 / 21", borderRadius: 10, overflow: "hidden",
          border: `1px solid ${dragging ? COURT : "rgba(255,255,255,0.12)"}`,
          cursor: dragging ? "grabbing" : "grab", touchAction: "none", userSelect: "none",
        }}>
        <Image src={src} alt="Previsualización de la portada en el celular" fill sizes="340px" draggable={false}
          style={{
            objectFit: "cover", objectPosition: "center", pointerEvents: "none",
            transform: `scale(${ZOOM_PORTADA_MOVIL})`, transformOrigin: `${pos.x}% ${pos.y}%`,
          }} />
        {/* Guía: en el celular la foto de perfil va centrada sobre el borde de abajo */}
        <div aria-hidden="true" style={{ position: "absolute", left: "35%", bottom: "-28%", width: "30%", aspectRatio: "1", borderRadius: "50%", border: "2px dashed rgba(255,255,255,0.5)", background: "rgba(5,7,13,0.5)" }} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", maxWidth: 340 }}>
        {atajos.map(a => (
          <button key={a.label} type="button" onClick={() => onChange({ x: a.x, y: a.y })} style={mini(pos.x === a.x && pos.y === a.y)}>{a.label}</button>
        ))}
      </div>
    </div>
  );
}
