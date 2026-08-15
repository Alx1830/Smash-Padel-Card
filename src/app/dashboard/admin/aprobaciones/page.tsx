"use client";

/**
 * Bandeja de moderación del market. Toda publicación nueva entra aquí antes de
 * ser visible; desde acá se aprueba, se rechaza con un motivo que le llega al
 * vendedor, o se devuelve a revisión una que ya estaba publicada.
 *
 * Los datos vienen de /api/admin/listings porque las pendientes no son legibles
 * por RLS fuera de su dueño.
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { getVersionLabel, getVersionColor } from "@/data/pokemon-cards-meta";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { formatPrice, CURRENCY_SYMBOL } from "@/lib/currency";
import { Check, X, Undo2, Clock } from "lucide-react";

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const CRIT  = "#ff5d5d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";

const ALL_SETS = POKEMON_SERIES.flatMap(s => s.sets);

type Estado = "pending" | "active" | "rejected";

interface Listing {
  id: string;
  user_id: string;
  card_id: number;
  set_id: string;
  price_cop: number;
  currency: string;
  version: string;
  language: string | null;
  status: Estado;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  player: { username: string; pais: string | null; ciudad: string | null } | null;
}

const TABS: { id: Estado; label: string }[] = [
  { id: "pending",  label: "Por aprobar" },
  { id: "active",   label: "Publicadas" },
  { id: "rejected", label: "Rechazadas" },
];

export default function AprobacionesPage() {
  const router   = useRouter();
  const [checking, setChecking] = useState(true);
  const [tab, setTab]           = useState<Estado>("pending");
  const [listings, setListings] = useState<Listing[]>([]);
  const [pendientes, setPendientes] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [rechazando, setRechazando] = useState<Listing | null>(null);
  const [motivo, setMotivo]     = useState("");
  const [error, setError]       = useState<string | null>(null);

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

  const cargar = useCallback(async (estado: Estado) => {
    setCargando(true);
    setError(null);
    try {
      const res  = await fetch(`/api/admin/listings?status=${estado}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo cargar");
      const rows = (json.listings ?? []) as Listing[];
      setListings(rows);
      setPendientes(json.pendingCount ?? 0);
      await loadManySets([...new Set(rows.map(r => r.set_id))]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    if (!checking) cargar(tab);
  }, [checking, tab, cargar]);

  async function moderar(id: string, action: "approve" | "reject" | "revert", reason?: string) {
    setTrabajando(id);
    try {
      const res  = await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo aplicar");
      setListings(prev => prev.filter(l => l.id !== id));
      setPendientes(p => (action === "revert" ? p + 1 : tab === "pending" ? Math.max(0, p - 1) : p));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    }
    setTrabajando(null);
  }

  function datosCarta(l: Listing) {
    const card = SET_CARDS[l.set_id]?.find(c => c.card_number === l.card_id && c.version === l.version)
              ?? SET_CARDS[l.set_id]?.find(c => c.card_number === l.card_id);
    return { card, setName: ALL_SETS.find(s => s.id === l.set_id)?.name ?? l.set_id };
  }

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#05070d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.12em" }}>Verificando acceso...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#05070d", padding: "40px 24px" }}>
      <style>{`
        .ap-tab { background: none; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px;
                  padding: 8px 18px; cursor: pointer; font-family: ${MONO}; font-size: 11px;
                  letter-spacing: 0.1em; color: ${INK2}; transition: all 0.15s; }
        .ap-tab:hover { border-color: rgba(46,230,193,0.4); color: ${INK0}; }
        .ap-tab.on { border-color: ${COURT}; color: ${COURT}; background: rgba(46,230,193,0.08); }
        .ap-act { display: inline-flex; align-items: center; gap: 6px; border-radius: 8px;
                  padding: 8px 14px; cursor: pointer; font-family: ${MONO}; font-size: 11px;
                  font-weight: 600; letter-spacing: 0.06em; border: 1px solid transparent;
                  transition: opacity 0.15s; }
        .ap-act:disabled { opacity: 0.45; cursor: default; }
        .ap-approve { background: linear-gradient(90deg, ${COURT}, ${BALL}); color: #05070d; }
        .ap-reject  { background: rgba(255,93,93,0.1); border-color: rgba(255,93,93,0.4); color: ${CRIT}; }
        .ap-revert  { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.15); color: ${INK1}; }
        .ap-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
            Panel Admin
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "32px", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            Cartas por aprobar
          </h1>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.06em", margin: "8px 0 0" }}>
            Ninguna carta llega al market sin pasar por aquí
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t.id} className={`ap-tab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
              {t.id === "pending" && pendientes > 0 && (
                <span style={{ marginLeft: 8, color: BALL, fontWeight: 700 }}>{pendientes}</span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <p style={{ fontFamily: MONO, fontSize: "11px", color: CRIT, marginBottom: 16 }}>✕ {error}</p>
        )}

        {cargando ? (
          <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em" }}>Cargando...</p>
        ) : listings.length === 0 ? (
          <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, padding: "60px 30px", textAlign: "center" }}>
            <Clock size={26} color={INK2} strokeWidth={1.6} />
            <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.08em", margin: "14px 0 0" }}>
              {tab === "pending" ? "No hay nada esperando aprobación" : tab === "active" ? "No hay cartas publicadas" : "No hay cartas rechazadas"}
            </p>
          </div>
        ) : (
          <div className="ap-grid">
            {listings.map(l => {
              const { card, setName } = datosCarta(l);
              const verColor = getVersionColor(l.version);
              return (
                <div key={l.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ position: "relative", width: "100%", aspectRatio: "5/7", background: "rgba(255,255,255,0.03)" }}>
                    {card?.image && (
                      <img src={card.image} alt={card.name} style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", inset: 0 }} />
                    )}
                  </div>

                  <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 12, color: INK0, fontWeight: 600 }}>
                        {card?.name ?? `Carta #${l.card_id}`}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: INK2, marginTop: 3 }}>{setName}</div>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: verColor, marginTop: 3, letterSpacing: "0.08em" }}>
                        {getVersionLabel(l.version)}{l.language ? ` · ${l.language.toUpperCase()}` : ""}
                      </div>
                    </div>

                    <div style={{ fontFamily: MONO, fontSize: 15, color: COURT, fontWeight: 700 }}>
                      {CURRENCY_SYMBOL[l.currency] ?? "$"}{formatPrice(l.price_cop, l.currency)} <span style={{ fontSize: 9, color: INK2 }}>{l.currency}</span>
                    </div>

                    <div style={{ fontFamily: MONO, fontSize: 10, color: INK2 }}>
                      @{l.player?.username ?? "—"}
                      {l.player?.ciudad ? ` · ${l.player.ciudad}` : ""}
                      <br />
                      {new Date(l.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>

                    {l.rejection_reason && (
                      <div style={{ fontFamily: MONO, fontSize: 10, color: CRIT, lineHeight: 1.5, background: "rgba(255,93,93,0.07)", border: "1px solid rgba(255,93,93,0.2)", borderRadius: 8, padding: "8px 10px" }}>
                        {l.rejection_reason}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 6, flexWrap: "wrap" }}>
                      {tab !== "active" && (
                        <button className="ap-act ap-approve" disabled={trabajando === l.id}
                          onClick={() => moderar(l.id, "approve")}>
                          <Check size={13} /> Aprobar
                        </button>
                      )}
                      {tab === "active" && (
                        <button className="ap-act ap-revert" disabled={trabajando === l.id}
                          onClick={() => moderar(l.id, "revert")}>
                          <Undo2 size={13} /> A revisión
                        </button>
                      )}
                      {tab !== "rejected" && (
                        <button className="ap-act ap-reject" disabled={trabajando === l.id}
                          onClick={() => { setRechazando(l); setMotivo(""); }}>
                          <X size={13} /> Rechazar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Motivo del rechazo — le llega al vendedor tal cual se escriba */}
      {rechazando && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,7,13,0.75)", backdropFilter: "blur(6px)", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setRechazando(null); }}
        >
          <div style={{ width: "100%", maxWidth: 420, background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: "26px 24px" }}>
            <h3 style={{ fontFamily: DISP, fontSize: 18, color: INK0, margin: "0 0 6px" }}>Rechazar publicación</h3>
            <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, lineHeight: 1.6, margin: "0 0 16px" }}>
              El vendedor recibe este mensaje y puede corregir el precio para volver a enviarla.
            </p>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Ej: el precio está muy por encima del mercado para esta carta."
              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: INK0, fontFamily: MONO, fontSize: 12, outline: "none", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button className="ap-act ap-revert" onClick={() => setRechazando(null)}>Cancelar</button>
              <button
                className="ap-act ap-reject"
                disabled={!motivo.trim() || trabajando === rechazando.id}
                onClick={async () => { const l = rechazando; setRechazando(null); await moderar(l.id, "reject", motivo.trim()); }}
              >
                <X size={13} /> Rechazar y avisar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
