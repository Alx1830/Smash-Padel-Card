"use client";

/**
 * Banco de pruebas de vibración (solo admin).
 *
 * Safari nunca implementó la Vibration API, así que en iPhone el único camino es
 * el interruptor nativo que Apple agregó en Safari 17.4: un
 * `<input type="checkbox" switch>` con su `<label>`; al hacer click() sobre el
 * label, el sistema dispara el Taptic Engine. Detalles que importan:
 *
 * - El input NO puede ir con `display:none` ni `visibility:hidden`: si el sistema
 *   no lo considera visible, no hay háptico. Se esconde fuera de pantalla.
 * - El click va sobre el LABEL, no sobre el input.
 * - React no conoce el atributo booleano `switch`, se pone a mano con setAttribute.
 * - Apple cambió el comportamiento en iOS 26.5, así que puede no responder en los
 *   iOS más nuevos. Por eso la página prueba los tres métodos por separado.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Vibrate, ToggleLeft, Volume2, Trash2 } from "lucide-react";

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";

export default function TestEventPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  const [soporte, setSoporte] = useState<string[]>([]);
  const labelRef = useRef<HTMLLabelElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data } = await supabase.from("players").select("role").eq("user_id", user.id).single();
      if (data?.role !== "admin") { router.replace("/dashboard"); return; }
      setChecking(false);
    })();
  }, [router]);

  /* El atributo `switch` es el que enciende el háptico; React no lo emite solo */
  useEffect(() => {
    if (checking) return;
    inputRef.current?.setAttribute("switch", "");
  }, [checking]);

  /* Qué soporta este teléfono, para leerlo desde el propio celular */
  useEffect(() => {
    if (checking) return;
    const s: string[] = [];
    s.push("vibrate" in navigator ? "navigator.vibrate: SÍ" : "navigator.vibrate: NO");
    s.push(`standalone (PWA instalada): ${
      window.matchMedia("(display-mode: standalone)").matches ? "SÍ" : "NO"
    }`);
    s.push(`UA: ${navigator.userAgent.slice(0, 90)}`);
    setSoporte(s);
  }, [checking]);

  const anotar = useCallback((linea: string) => {
    const hora = new Date().toLocaleTimeString("es-CO", { hour12: false });
    setLog(prev => [`${hora}  ${linea}`, ...prev].slice(0, 30));
  }, []);

  /** Método 1: el estándar. Funciona en Android, nunca en iPhone. */
  function vibrarApi() {
    if ("vibrate" in navigator) {
      const ok = navigator.vibrate(50);
      anotar(`navigator.vibrate(50) → ${ok ? "aceptado" : "rechazado"}`);
    } else {
      anotar("navigator.vibrate no existe en este navegador");
    }
  }

  /** Método 2: el truco del interruptor de iOS. */
  function vibrarSwitch() {
    const label = labelRef.current;
    if (!label) { anotar("switch: no se encontró el label"); return; }
    label.click();
    anotar(`switch: click enviado (estado ${inputRef.current?.checked ? "on" : "off"})`);
  }

  /** El botón grande: intenta el estándar y, si no está, el truco de iOS. */
  function vibrar() {
    if ("vibrate" in navigator) vibrarApi();
    else vibrarSwitch();
  }

  /** Método 3: control. Un tic audible corto, para confirmar que el gesto llegó. */
  function tic() {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 180;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
      anotar("tic de audio disparado");
    } catch (e) {
      anotar(`tic de audio falló: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#05070d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.12em" }}>Verificando acceso...</span>
      </div>
    );
  }

  return (
    <div className="te-page">
      <style>{`
        .te-page { min-height: 100vh; background: #05070d; padding: 40px 24px; }
        .te-wrap { max-width: 1400px; }
        .te-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 1023px) { .te-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 767px)  {
          .te-page { padding: 28px 16px; }
          .te-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        }
        /* Fuera de pantalla, no oculto: con display:none iOS no dispara el háptico */
        .te-switch-host {
          position: absolute; left: -9999px; top: 0;
          width: 51px; height: 31px; opacity: 0.01;
        }
        .te-boton {
          width: 168px; height: 168px; border-radius: 50%;
          border: 1px solid rgba(46,230,193,0.35);
          background: radial-gradient(circle at 50% 35%, rgba(46,230,193,0.18), rgba(255,255,255,0.02));
          color: ${COURT}; font-family: ${MONO}; font-size: 13px;
          letter-spacing: 0.18em; text-transform: uppercase;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 10px; cursor: pointer; user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition: transform 0.08s ease, box-shadow 0.2s ease;
        }
        .te-boton:active { transform: scale(0.95); box-shadow: 0 0 0 6px rgba(46,230,193,0.08); }
        .te-alt {
          padding: 14px 12px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02);
          color: ${INK1}; font-family: ${MONO}; font-size: 11px; letter-spacing: 0.08em;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          cursor: pointer; touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        .te-alt:active { border-color: rgba(46,230,193,0.35); }
      `}</style>

      {/* El interruptor que dispara el Taptic Engine. No tocar el estilo. */}
      <span className="te-switch-host" aria-hidden="true">
        <label ref={labelRef} htmlFor="te-haptic-switch">
          <input ref={inputRef} id="te-haptic-switch" type="checkbox" tabIndex={-1} defaultChecked={false} />
        </label>
      </span>

      <div className="te-wrap">
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
            Panel Admin
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            Test event
          </h1>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.06em", margin: "8px 0 0" }}>
            Probar si el celular responde con una vibración corta al tocar el botón
          </p>
        </div>

        {/* Botón principal */}
        <div style={{ display: "flex", justifyContent: "center", padding: "24px 0 32px" }}>
          <button type="button" className="te-boton" onClick={vibrar}>
            <Vibrate size={30} strokeWidth={1.5} />
            Vibrar
          </button>
        </div>

        {/* Métodos por separado, para saber cuál de los tres respondió */}
        <div className="te-grid" style={{ marginBottom: "28px" }}>
          <button type="button" className="te-alt" onClick={vibrarApi}>
            <Vibrate size={14} /> navigator.vibrate
          </button>
          <button type="button" className="te-alt" onClick={vibrarSwitch}>
            <ToggleLeft size={14} /> switch iOS
          </button>
          <button type="button" className="te-alt" onClick={tic}>
            <Volume2 size={14} /> tic de audio
          </button>
        </div>

        {/* Qué soporta este teléfono */}
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: BALL, marginBottom: "10px" }}>
            Este dispositivo
          </div>
          {soporte.map(s => (
            <div key={s} style={{ fontFamily: MONO, fontSize: "11px", color: INK1, lineHeight: 1.7, wordBreak: "break-all" }}>{s}</div>
          ))}
        </div>

        {/* Registro */}
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: BALL }}>
              Registro
            </span>
            <button
              type="button"
              onClick={() => setLog([])}
              style={{ background: "none", border: "none", color: INK2, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontFamily: MONO, fontSize: "10px" }}
            >
              <Trash2 size={12} /> Limpiar
            </button>
          </div>
          {log.length === 0 ? (
            <div style={{ border: "1px dashed rgba(255,255,255,0.12)", borderRadius: "10px", padding: "22px", textAlign: "center" }}>
              <Vibrate size={18} color={INK2} style={{ marginBottom: "8px" }} />
              <div style={{ fontFamily: MONO, fontSize: "11px", color: INK2 }}>
                Toca el botón para que aparezcan los resultados aquí
              </div>
            </div>
          ) : (
            log.map((l, i) => (
              <div key={`${l}-${i}`} style={{ fontFamily: MONO, fontSize: "11px", color: i === 0 ? INK0 : INK1, lineHeight: 1.8 }}>{l}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
