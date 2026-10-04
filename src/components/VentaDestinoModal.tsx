"use client";

/**
 * Pregunta a quién se vendió una carta del market. Si fue a un usuario de
 * Facebinder, la venta queda pendiente hasta que el comprador la confirme y la
 * califique; si fue a alguien de afuera, solo sale del inventario y no cuenta
 * en el perfil.
 */

import { useEffect, useState } from "react";
import { X, Users, UserX, Search, ArrowLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { escaparLike } from "@/lib/escapar-like";

const COURT = "#2ee6c1";
const CRIT  = "#ff5d5d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface Candidato {
  user_id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
}

export function VentaDestinoModal({
  cardName, cardImage, userId, onFuera, onUsuario, onClose,
}: {
  cardName: string;
  cardImage?: string;
  userId: string;
  /** Venta fuera de Facebinder: se descuenta y listo */
  onFuera: () => Promise<void>;
  /** Venta a un usuario; lanza un error con mensaje si la base la rechaza */
  onUsuario: (username: string) => Promise<void>;
  onClose: () => void;
}) {
  const [paso, setPaso]           = useState<"elegir" | "buscar">("elegir");
  const [texto, setTexto]         = useState("");
  const [resultados, setResultados] = useState<Candidato[]>([]);
  const [elegido, setElegido]     = useState<Candidato | null>(null);
  const [enviando, setEnviando]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    const q = texto.trim().replace(/^@/, "");
    if (paso !== "buscar" || q.length < 2) return;
    const t = setTimeout(async () => {
      const { data } = await createClient()
        .from("players")
        .select("user_id, username, first_name, last_name, photo_url")
        .ilike("username", `${escaparLike(q)}%`)
        .eq("activo", true)
        .neq("user_id", userId)
        .order("username")
        .limit(6);
      setResultados((data ?? []).filter(p => p.username) as Candidato[]);
    }, 250);
    return () => clearTimeout(t);
  }, [texto, paso, userId]);

  const visibles = texto.trim().replace(/^@/, "").length < 2 ? [] : resultados;

  async function ejecutar(accion: () => Promise<void>) {
    setEnviando(true);
    setError(null);
    try {
      await accion();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
      setEnviando(false);
    }
  }

  const opcion: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "14px", width: "100%", textAlign: "left",
    padding: "16px", borderRadius: "12px", cursor: "pointer",
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget && !enviando) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(5,7,13,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
    >
      <div style={{ width: "min(440px, 100%)", maxHeight: "86vh", overflowY: "auto", background: "#0d1520", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "18px", boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {cardImage && (
            <img src={cardImage} alt={cardName} decoding="async" style={{ width: "44px", aspectRatio: "5 / 7", objectFit: "cover", borderRadius: "5px", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: COURT, margin: "0 0 6px" }}>Marcar como vendida</p>
            <p style={{ fontFamily: DISP, fontSize: "18px", fontWeight: 700, color: INK0, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cardName}</p>
          </div>
          <button onClick={onClose} disabled={enviando} aria-label="Cerrar" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", lineHeight: 0 }}>
            <X size={18} color={INK2} />
          </button>
        </div>

        <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {paso === "elegir" ? (
            <>
              <p style={{ fontFamily: MONO, fontSize: "11px", color: INK1, margin: "0 0 4px" }}>¿A quién se la vendiste?</p>

              <button onClick={() => setPaso("buscar")} disabled={enviando} style={opcion}>
                <Users size={22} color={COURT} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                <span>
                  <span style={{ display: "block", fontFamily: MONO, fontSize: "12px", fontWeight: 700, color: INK0 }}>A un usuario de Facebinder</span>
                  <span style={{ display: "block", fontFamily: MONO, fontSize: "10px", color: INK2, marginTop: "4px", lineHeight: 1.5 }}>
                    Le llega un aviso para confirmar y calificarte. Cuando lo haga, la venta sale en tu perfil.
                  </span>
                </span>
              </button>

              <button onClick={() => ejecutar(onFuera)} disabled={enviando} style={{ ...opcion, opacity: enviando ? 0.5 : 1 }}>
                <UserX size={22} color={INK2} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                <span>
                  <span style={{ display: "block", fontFamily: MONO, fontSize: "12px", fontWeight: 700, color: INK0 }}>A alguien fuera de Facebinder</span>
                  <span style={{ display: "block", fontFamily: MONO, fontSize: "10px", color: INK2, marginTop: "4px", lineHeight: 1.5 }}>
                    Se descuenta de tu inventario, pero no cuenta como venta en tu perfil.
                  </span>
                </span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setPaso("elegir"); setElegido(null); setError(null); }} disabled={enviando}
                style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: MONO, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: INK2 }}>
                <ArrowLeft size={13} /> Volver
              </button>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Search size={15} color={INK2} />
                <input
                  autoFocus
                  value={texto}
                  onChange={e => { setTexto(e.target.value); setElegido(null); }}
                  placeholder="@usuario del comprador"
                  style={{ flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", color: INK0, fontFamily: MONO, fontSize: "16px" }}
                />
              </label>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {visibles.map(p => {
                  const activo = elegido?.user_id === p.user_id;
                  const nombre = [p.first_name, p.last_name].filter(Boolean).join(" ");
                  return (
                    <button key={p.user_id} onClick={() => setElegido(p)} disabled={enviando}
                      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "10px", cursor: "pointer", textAlign: "left",
                        background: activo ? `${COURT}14` : "rgba(255,255,255,0.02)", border: `1px solid ${activo ? `${COURT}66` : "rgba(255,255,255,0.06)"}` }}>
                      {p.photo_url ? (
                        <img src={p.photo_url} alt="" decoding="async" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <span style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
                      )}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontFamily: MONO, fontSize: "12px", color: INK0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{p.username}</span>
                        {nombre && <span style={{ display: "block", fontFamily: MONO, fontSize: "10px", color: INK2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nombre}</span>}
                      </span>
                      {activo && <Check size={16} color={COURT} />}
                    </button>
                  );
                })}
                {texto.trim().replace(/^@/, "").length >= 2 && visibles.length === 0 && (
                  <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: "4px 0" }}>Ningún usuario empieza así.</p>
                )}
              </div>

              <button
                onClick={() => elegido && ejecutar(() => onUsuario(elegido.username))}
                disabled={!elegido || enviando}
                style={{ marginTop: "6px", padding: "12px", borderRadius: "10px", border: "none", fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700,
                  color: "#05070d", background: COURT, cursor: elegido && !enviando ? "pointer" : "default", opacity: elegido && !enviando ? 1 : 0.4 }}>
                {enviando ? "Registrando…" : elegido ? `Vendida a @${elegido.username}` : "Elige al comprador"}
              </button>
            </>
          )}

          {error && <p style={{ fontFamily: MONO, fontSize: "11px", color: CRIT, margin: "4px 0 0" }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
