"use client";

/**
 * Enviar un aviso a todos los usuarios.
 *
 * Se escribe el título, el mensaje y a qué parte de la app lleva al tocarlo.
 * Sale por las dos vías de siempre: la campana de la app, que la ve todo el
 * mundo, y la notificación en el celular de quien la tenga activada.
 *
 * El envío va por `/api/admin/notificar`, que vuelve a comprobar que quien
 * llama sea admin: lo de acá es comodidad, no seguridad.
 *
 * No hay deshacer. Un aviso mandado no se puede recoger, así que antes de
 * enviarlo se muestra tal como va a verse y se pide confirmar.
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Send, Smartphone, TriangleAlert, Check, CalendarClock } from "lucide-react";

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const CRIT  = "#ff5d5d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";

const TITULO_MAX  = 70;
const MENSAJE_MAX = 180;

/** A dónde puede llevar un aviso. Son las secciones que le sirven a un usuario. */
const DESTINOS = [
  { url: "/dashboard",                 label: "Inicio del panel" },
  { url: "/noticias",                      label: "Noticias" },
  { url: "/dashboard/market",          label: "Market" },
  { url: "/dashboard/market/wishlist", label: "Mi wishlist" },
  { url: "/dashboard/inventario",      label: "Mi colección" },
  { url: "/dashboard/juego",           label: "Higher Or Lower (el juego)" },
  { url: "/dashboard/decks",           label: "Decks" },
  { url: "/dashboard/my-sets",         label: "Mis sets" },
  { url: "/dashboard/trades",          label: "Intercambios" },
  { url: "/dashboard/jugadores",       label: "Jugadores" },
  { url: "otra",                       label: "Otra dirección…" },
];

interface Resultado { campana: number; push: number; suscritos: number }

export function EnviarAviso() {
  const [titulo, setTitulo]     = useState("");
  const [mensaje, setMensaje]   = useState("");
  const [destino, setDestino]   = useState(DESTINOS[0].url);
  const [otraUrl, setOtraUrl]   = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [hecho, setHecho]       = useState<Resultado | null>(null);
  /* "ahora" lo manda de una; "luego" lo deja anotado y lo saca el reloj de la
     base, el mismo que publica las noticias programadas. */
  const [cuando, setCuando]     = useState<"ahora" | "luego">("ahora");
  const [fecha, setFecha]       = useState("");
  const [programado, setProgramado] = useState<string | null>(null);

  const urlFinal = destino === "otra" ? otraUrl.trim() : destino;
  const completo = titulo.trim().length > 0 && mensaje.trim().length > 0
                && urlFinal.startsWith("/") && !urlFinal.startsWith("//")
                && (cuando === "ahora" || fecha.length > 0);

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      if (cuando === "luego") { await programar(); return; }
      const res = await fetch("/api/admin/notificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: titulo.trim(), mensaje: mensaje.trim(), destino: urlFinal }),
      });
      const cuerpo = await res.json();
      if (!res.ok) throw new Error(cuerpo.error ?? "No se pudo enviar");
      setHecho(cuerpo as Resultado);
      setTitulo("");
      setMensaje("");
      setConfirmando(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar");
      setConfirmando(false);
    } finally {
      setEnviando(false);
    }
  };

  /**
   * Lo deja anotado para más tarde.
   *
   * La hora llega del campo como hora local de quien lo escribe, que es la de
   * Colombia; se guarda con su huso para que el reloj de la base no la
   * interprete como UTC y lo mande cinco horas antes.
   */
  const programar = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("avisos_programados").insert({
      titulo: titulo.trim(),
      mensaje: mensaje.trim(),
      destino: urlFinal,
      scheduled_at: new Date(fecha).toISOString(),
      created_by: user?.id ?? null,
    });
    if (err) throw new Error(err.message);
    setProgramado(new Date(fecha).toLocaleString("es-CO", {
      dateStyle: "long", timeStyle: "short", timeZone: "America/Bogota",
    }));
    setTitulo("");
    setMensaje("");
    setFecha("");
    setConfirmando(false);
  };

  return (
    <div className="nt-page">
      <style>{`
        .nt-page { min-height: 100vh; background: #05070d; padding: 40px 24px; }
        /* Alineado a la izquierda, como el resto del panel. */
        .nt-wrap { max-width: 1400px; }
        /* Un formulario corto no gana nada por estirarse a lo ancho de un monitor. */
        .nt-caja { max-width: 620px; }

        .nt-campo { width: 100%; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.12); border-radius: 9px;
          padding: 12px 14px; color: ${INK0}; font-family: ${MONO}; font-size: 12.5px;
          line-height: 1.6; transition: border-color 0.15s; }
        .nt-campo:focus { outline: none; border-color: ${COURT}; }
        .nt-campo::placeholder { color: rgba(122,130,152,0.7); }
        textarea.nt-campo { resize: vertical; min-height: 92px; }

        .nt-etiqueta { display: flex; align-items: baseline; justify-content: space-between;
          gap: 10px; font-family: ${MONO}; font-size: 10px; letter-spacing: 0.14em;
          text-transform: uppercase; color: ${INK2}; margin-bottom: 7px; }
        .nt-cuenta { font-size: 10px; }

        .nt-cuando { display: flex; gap: 8px; flex-wrap: wrap; }
        .nt-pildora { display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
          background: none; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px;
          padding: 8px 15px; font-family: ${MONO}; font-size: 10px; letter-spacing: 0.1em;
          text-transform: uppercase; color: ${INK2}; transition: all 0.15s; }
        .nt-pildora:hover { border-color: rgba(46,230,193,0.4); color: ${INK0}; }
        .nt-pildora.on { border-color: ${COURT}; color: ${COURT}; background: rgba(46,230,193,0.08); }

        .nt-btn { display: inline-flex; align-items: center; gap: 9px; border: 0;
          border-radius: 9px; padding: 13px 24px; cursor: pointer; font-family: ${MONO};
          font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
          background: linear-gradient(90deg, ${COURT}, ${BALL}); color: #05070d; }
        .nt-btn:disabled { opacity: 0.4; cursor: default; }
        .nt-btn.gris { background: rgba(255,255,255,0.06); color: ${INK1};
          border: 1px solid rgba(255,255,255,0.14); }

        /* La vista previa: así se ve el aviso en la pantalla del celular. */
        .nt-previa { border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
          background: rgba(255,255,255,0.03); padding: 13px 15px;
          display: flex; gap: 12px; align-items: flex-start; }
        .nt-previa-icono { width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
          background: rgba(46,230,193,0.12); display: flex; align-items: center;
          justify-content: center; }

        @media (max-width: 767px), (pointer: coarse) {
          .nt-page { padding: 28px 16px; }
        }
      `}</style>

      <div className="nt-wrap">
        {/* Cabecera */}
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
            Panel Admin
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            Enviar un aviso
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, letterSpacing: "0.06em", margin: "8px 0 0" }}>
            Le llega a todos: a la campana de la app y al celular de quien la tenga activada
          </p>
        </div>

        <div className="nt-caja" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {hecho && (
            <div style={{ border: `1px solid ${COURT}55`, background: "rgba(46,230,193,0.07)", borderRadius: 11, padding: "14px 16px", display: "flex", gap: 11, alignItems: "flex-start" }}>
              <Check size={16} color={COURT} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontFamily: MONO, fontSize: 11, color: INK1, margin: 0, lineHeight: 1.7 }}>
                Aviso enviado. Le apareció en la campana a <strong style={{ color: INK0 }}>{hecho.campana}</strong>{" "}
                {hecho.campana === 1 ? "persona" : "personas"} y llegó al celular de{" "}
                <strong style={{ color: INK0 }}>{hecho.push}</strong> de{" "}
                {hecho.suscritos} {hecho.suscritos === 1 ? "suscrito" : "suscritos"}.
              </p>
            </div>
          )}

          {programado && (
            <div style={{ border: `1px solid ${BALL}55`, background: "rgba(214,255,61,0.07)", borderRadius: 11, padding: "14px 16px", display: "flex", gap: 11, alignItems: "flex-start" }}>
              <CalendarClock size={16} color={BALL} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontFamily: MONO, fontSize: 11, color: INK1, margin: 0, lineHeight: 1.7 }}>
                Aviso programado para el <strong style={{ color: INK0 }}>{programado}</strong>.
                Sale solo; no hace falta dejar la página abierta.
              </p>
            </div>
          )}

          {error && (
            <div style={{ border: `1px solid ${CRIT}55`, background: "rgba(255,93,93,0.07)", borderRadius: 11, padding: "14px 16px", display: "flex", gap: 11, alignItems: "flex-start" }}>
              <TriangleAlert size={16} color={CRIT} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontFamily: MONO, fontSize: 11, color: INK1, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="nt-etiqueta" htmlFor="nt-titulo">
              <span>Título</span>
              <span className="nt-cuenta" style={{ color: titulo.length > TITULO_MAX ? CRIT : INK2 }}>
                {titulo.length}/{TITULO_MAX}
              </span>
            </label>
            <input
              id="nt-titulo"
              className="nt-campo"
              value={titulo}
              maxLength={TITULO_MAX}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Llegó Mega Evolution"
            />
          </div>

          {/* Mensaje */}
          <div>
            <label className="nt-etiqueta" htmlFor="nt-mensaje">
              <span>Mensaje</span>
              <span className="nt-cuenta" style={{ color: mensaje.length > MENSAJE_MAX ? CRIT : INK2 }}>
                {mensaje.length}/{MENSAJE_MAX}
              </span>
            </label>
            <textarea
              id="nt-mensaje"
              className="nt-campo"
              value={mensaje}
              maxLength={MENSAJE_MAX}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Ya puedes agregar las cartas del set nuevo a tu colección."
            />
          </div>

          {/* A dónde lleva */}
          <div>
            <label className="nt-etiqueta" htmlFor="nt-destino">
              <span>Al tocarlo, lleva a</span>
            </label>
            <select
              id="nt-destino"
              className="nt-campo"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              style={{ cursor: "pointer" }}
            >
              {DESTINOS.map((d) => (
                <option key={d.url} value={d.url} style={{ background: "#0a0e18" }}>
                  {d.label}
                </option>
              ))}
            </select>

            {destino === "otra" && (
              <>
                <input
                  className="nt-campo"
                  style={{ marginTop: 9 }}
                  value={otraUrl}
                  onChange={(e) => setOtraUrl(e.target.value)}
                  placeholder="/noticias/nombre-de-la-nota"
                />
                <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, margin: "7px 0 0", lineHeight: 1.7 }}>
                  Una dirección de la app, empezando con barra. No se puede mandar a
                  otro sitio: un aviso que saca a la gente afuera sería una puerta
                  abierta a cualquier cosa.
                </p>
              </>
            )}
          </div>

          {/* Cuándo sale */}
          <div>
            <p className="nt-etiqueta"><span>Cuándo sale</span></p>
            <div className="nt-cuando">
              <button
                className={"nt-pildora" + (cuando === "ahora" ? " on" : "")}
                onClick={() => setCuando("ahora")}
              >
                <Send size={12} /> Ahora
              </button>
              <button
                className={"nt-pildora" + (cuando === "luego" ? " on" : "")}
                onClick={() => setCuando("luego")}
              >
                <CalendarClock size={12} /> Programar
              </button>
            </div>

            {cuando === "luego" && (
              <>
                <input
                  type="datetime-local"
                  className="nt-campo"
                  style={{ marginTop: 10 }}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
                <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, margin: "7px 0 0", lineHeight: 1.7 }}>
                  Hora de Colombia. Un reloj de la base revisa cada cinco minutos,
                  así que puede salir hasta cinco minutos después de la hora fijada.
                </p>
              </>
            )}
          </div>

          {/* Cómo se va a ver */}
          {(titulo.trim() || mensaje.trim()) && (
            <div>
              <p className="nt-etiqueta"><span>Así se va a ver</span></p>
              <div className="nt-previa">
                <span className="nt-previa-icono">
                  <Bell size={15} color={COURT} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: INK0, margin: 0 }}>
                    {titulo.trim() || "Sin título"}
                  </p>
                  <p style={{ fontFamily: MONO, fontSize: 11, color: INK1, margin: "5px 0 0", lineHeight: 1.6 }}>
                    {mensaje.trim() || "Sin mensaje"}
                  </p>
                  <p style={{ fontFamily: MONO, fontSize: 9.5, color: INK2, margin: "7px 0 0", letterSpacing: "0.06em" }}>
                    abre {urlFinal || "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Enviar */}
          {confirmando ? (
            <div style={{ border: `1px solid ${BALL}55`, background: "rgba(214,255,61,0.06)", borderRadius: 11, padding: "16px 18px" }}>
              <p style={{ fontFamily: MONO, fontSize: 11, color: INK1, margin: "0 0 14px", lineHeight: 1.8 }}>
                {cuando === "ahora"
                  ? <>Esto le llega a <strong style={{ color: INK0 }}>todos los usuarios</strong> ahora mismo y no se puede deshacer. ¿Lo mando?</>
                  : <>Queda anotado para salir a la hora que elegiste, a <strong style={{ color: INK0 }}>todos los usuarios</strong>. ¿Lo programo?</>}
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="nt-btn" onClick={enviar} disabled={enviando}>
                  <Send size={14} /> {enviando ? "Un momento…" : cuando === "ahora" ? "Sí, enviar" : "Sí, programar"}
                </button>
                <button className="nt-btn gris" onClick={() => setConfirmando(false)} disabled={enviando}>
                  Mejor no
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                className="nt-btn"
                onClick={() => { setHecho(null); setProgramado(null); setConfirmando(true); }}
                disabled={!completo}
              >
                {cuando === "ahora"
                  ? <><Smartphone size={14} /> Enviar a todos</>
                  : <><CalendarClock size={14} /> Programar aviso</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
