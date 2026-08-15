"use client";

import { useEffect, useState } from "react";
import { Share, MoreVertical, Check, X } from "lucide-react";
import { useMediaQuery } from "@/lib/use-media-query";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

/**
 * Los dos botones de instalación. FaceBinder no está en las tiendas: se instala
 * desde el navegador, así que en Android se usa el aviso nativo cuando Chrome
 * lo ofrece, y en iPhone se explican los dos toques a mano, porque Safari no
 * tiene forma de instalar por código.
 */

interface AvisoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstalarApp() {
  const [avisoAndroid, setAvisoAndroid] = useState<AvisoInstalar | null>(null);
  const [pasos, setPasos] = useState<"ios" | "android" | null>(null);
  /* Si ya está abierta como app, sobra ofrecer instalarla */
  const instalada = useMediaQuery("(display-mode: standalone)");

  useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault();
      setAvisoAndroid(e as AvisoInstalar);
    };
    window.addEventListener("beforeinstallprompt", guardar);
    return () => window.removeEventListener("beforeinstallprompt", guardar);
  }, []);

  async function android() {
    if (avisoAndroid) {
      await avisoAndroid.prompt();
      await avisoAndroid.userChoice;
      setAvisoAndroid(null);
      return;
    }
    setPasos("android");
  }

  if (instalada) {
    return (
      <p style={{
        fontFamily: MONO, fontSize: 11, color: COURT, letterSpacing: "0.06em",
        display: "flex", alignItems: "center", gap: 7, margin: 0,
      }}>
        <Check size={13} /> Ya tienes FaceBinder instalada. Bien ahí.
      </p>
    );
  }

  return (
    <>
      <style>{`
        .inst-btn {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 20px; border-radius: 14px; cursor: pointer;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
          text-align: left;
        }
        .inst-btn:hover {
          transform: translateY(-2px);
          border-color: ${COURT}66;
          background: rgba(46,230,193,0.07);
        }
      `}</style>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="inst-btn" onClick={() => setPasos("ios")} aria-label="Instalar en iPhone">
          <LogoApple />
          <span>
            <span style={{ display: "block", fontFamily: MONO, fontSize: 8.5, color: INK2, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Instálala en
            </span>
            <span style={{ display: "block", fontFamily: DISP, fontSize: 15, color: INK0, marginTop: 1 }}>
              iPhone
            </span>
          </span>
        </button>

        <button className="inst-btn" onClick={android} aria-label="Instalar en Android">
          <LogoAndroid />
          <span>
            <span style={{ display: "block", fontFamily: MONO, fontSize: 8.5, color: INK2, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Instálala en
            </span>
            <span style={{ display: "block", fontFamily: DISP, fontSize: 15, color: INK0, marginTop: 1 }}>
              Android
            </span>
          </span>
        </button>
      </div>

      {pasos && <ComoInstalar sistema={pasos} onCerrar={() => setPasos(null)} />}
    </>
  );
}

function ComoInstalar({ sistema, onCerrar }: { sistema: "ios" | "android"; onCerrar: () => void }) {
  const ios = sistema === "ios";
  const lista = ios
    ? [
        <>Abre esta página en <b style={{ color: INK0 }}>Safari</b> (con Chrome no se puede, cosas de Apple).</>,
        <>Toca el botón de compartir, el cuadrito con la flecha hacia arriba.</>,
        <>Baja y elige <b style={{ color: INK0 }}>Agregar a inicio</b>.</>,
        <>Listo: el ícono queda en tu pantalla como cualquier otra app.</>,
      ]
    : [
        <>Abre esta página en <b style={{ color: INK0 }}>Chrome</b>.</>,
        <>Toca los tres puntitos de la esquina.</>,
        <>Elige <b style={{ color: INK0 }}>Instalar aplicación</b> o <b style={{ color: INK0 }}>Agregar a pantalla principal</b>.</>,
        <>Listo: se abre a pantalla completa, sin barras del navegador.</>,
      ];

  return (
    <div
      onClick={onCerrar}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(3,5,10,0.9)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 22,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(420px, 100%)", borderRadius: 18, padding: 24,
        background: "linear-gradient(180deg, rgba(46,230,193,0.08), rgba(255,255,255,0.02))",
        border: `1px solid ${COURT}33`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          {ios ? <LogoApple /> : <LogoAndroid />}
          <h3 style={{ fontFamily: DISP, fontSize: 19, color: INK0, margin: 0, flex: 1 }}>
            {ios ? "En iPhone son dos toques" : "En Android son dos toques"}
          </h3>
          <button onClick={onCerrar} aria-label="Cerrar" style={{
            background: "transparent", border: "none", color: INK2, cursor: "pointer", display: "flex",
          }}>
            <X size={17} />
          </button>
        </div>

        <p style={{ fontFamily: MONO, fontSize: 10.5, color: INK2, margin: "0 0 18px", lineHeight: 1.7 }}>
          No hay que descargar nada de una tienda. Se instala desde el navegador
          y pesa lo que pesa una foto.
        </p>

        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
          {lista.map((paso, i) => (
            <li key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <span style={{
                flexShrink: 0, width: 21, height: 21, borderRadius: "50%",
                background: `${COURT}1f`, border: `1px solid ${COURT}55`, color: COURT,
                fontFamily: MONO, fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{i + 1}</span>
              <span style={{ fontFamily: MONO, fontSize: 11.5, color: INK1, lineHeight: 1.65 }}>
                {paso}
              </span>
            </li>
          ))}
        </ol>

        <div style={{
          display: "flex", alignItems: "center", gap: 9, marginTop: 18,
          padding: "10px 12px", borderRadius: 10,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
        }}>
          {ios ? <Share size={14} color={COURT} /> : <MoreVertical size={14} color={COURT} />}
          <span style={{ fontFamily: MONO, fontSize: 10, color: INK2, lineHeight: 1.6 }}>
            {ios ? "Este es el botón que hay que buscar, abajo en Safari." : "Este es el botón que hay que buscar, arriba a la derecha."}
          </span>
        </div>
      </div>
    </div>
  );
}

/* Los logos van en SVG y no como imagen: pesan nada y se pintan del color del
   tema sin pedirle otro archivo al servidor. */
function LogoApple() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={INK0} aria-hidden="true">
      <path d="M17.05 12.54c-.02-2.03 1.66-3 1.73-3.05-.94-1.38-2.4-1.57-2.93-1.59-1.25-.13-2.44.73-3.07.73-.63 0-1.61-.71-2.65-.69-1.36.02-2.62.79-3.32 2.01-1.42 2.46-.36 6.1 1.02 8.09.67.98 1.48 2.08 2.53 2.04 1.02-.04 1.4-.66 2.63-.66 1.23 0 1.57.66 2.65.64 1.09-.02 1.79-1 2.46-1.98.77-1.13 1.09-2.23 1.11-2.29-.02-.01-2.14-.82-2.16-3.25zM15.1 5.82c.56-.68.94-1.62.83-2.56-.81.03-1.79.54-2.37 1.21-.52.6-.97 1.56-.85 2.48.9.07 1.83-.46 2.39-1.13z" />
    </svg>
  );
}

function LogoAndroid() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#3ddc84" aria-hidden="true">
      <path d="M17.6 9.48l1.84-3.18a.38.38 0 00-.14-.52.38.38 0 00-.52.14l-1.86 3.22a11.4 11.4 0 00-9.84 0L5.22 5.92a.38.38 0 00-.52-.14.38.38 0 00-.14.52L6.4 9.48A10.8 10.8 0 001 18h22a10.8 10.8 0 00-5.4-8.52zM7 15.25a1.1 1.1 0 110-2.2 1.1 1.1 0 010 2.2zm10 0a1.1 1.1 0 110-2.2 1.1 1.1 0 010 2.2z" />
    </svg>
  );
}
