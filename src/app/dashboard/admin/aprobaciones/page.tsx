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
import { SCRYDEX_SET_CODES } from "@/hooks/useScrydexPrice";
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
  /** Dólar del día, para comparar contra lo que cobra el vendedor */
  const [trm, setTrm]           = useState<{ cop: number; fecha: string; fuente: string } | null>(null);
  /** Precio de mercado en USD por set: { setId: { "me2pt5-122": { holofoil: 3.2 } } } */
  const [precios, setPrecios]   = useState<Record<string, Record<string, Record<string, number>>>>({});

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

  useEffect(() => {
    fetch("/api/trm")
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (j?.cop) setTrm(j); })
      .catch(() => {});
  }, []);

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
      const setIds = [...new Set(rows.map(r => r.set_id))];
      await loadManySets(setIds);
      await cargarPrecios(setIds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    if (!checking) cargar(tab);
  }, [checking, tab, cargar]);

  /** Precio de mercado en USD de cada carta, la misma fuente que el inventario */
  async function cargarPrecios(setIds: string[]) {
    const supabase = createClient();
    await Promise.all(setIds.map(async setId => {
      const sc = SCRYDEX_SET_CODES[setId];
      if (!sc) return;
      const { data } = await supabase
        .from("card_prices_merged").select("card_id, prices").like("card_id", `${sc}-%`);
      if (!data) return;
      const mapa: Record<string, Record<string, number>> = {};
      for (const fila of data) mapa[fila.card_id] = fila.prices as Record<string, number>;
      setPrecios(prev => ({ ...prev, [setId]: mapa }));
    }));
  }

  /**
   * Compara lo que cobra el vendedor contra el precio de mercado.
   * El mercado viene en dólares y casi todos publican en pesos, así que la
   * comparación pasa por la TRM del día.
   */
  function comparar(l: Listing) {
    const sc = SCRYDEX_SET_CODES[l.set_id];
    const porCarta = sc ? precios[l.set_id]?.[`${sc}-${l.card_id}`] : undefined;
    if (!porCarta) return null;

    const vk  = l.version.toLowerCase().replace(/\s+/g, "");
    const usd = porCarta[vk] ?? porCarta[l.version] ?? porCarta["normal"] ?? null;
    if (usd === null) return null;

    /* Solo se puede comparar si sabemos pasar su moneda a dólares */
    const enUsd =
      l.currency === "USD" ? l.price_cop
      : l.currency === "COP" && trm ? l.price_cop / trm.cop
      : null;

    const referenciaCop = trm ? Math.round(usd * trm.cop) : null;
    const diff = enUsd !== null && usd > 0 ? Math.round(((enUsd - usd) / usd) * 100) : null;
    return { usd, referenciaCop, diff };
  }

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
    <div className="ap-page">
      <style>{`
        /* Patrón de página del dashboard: cabecera con antetítulo y grilla que
           baja de 6 columnas a 2 en el celular */
        .ap-page  { min-height: 100vh; background: #05070d; padding: 40px 24px; }
        /* Alineado a la izquierda, no centrado: con pocas cartas el contenido
           quedaba flotando en la mitad de la pantalla */
        .ap-wrap  { max-width: 1400px; }

        .ap-tab { background: none; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px;
                  padding: 7px 16px; cursor: pointer; font-family: ${MONO}; font-size: 10px;
                  letter-spacing: 0.1em; color: ${INK2}; transition: all 0.15s; white-space: nowrap; }
        .ap-tab:hover { border-color: rgba(46,230,193,0.4); color: ${INK0}; }
        .ap-tab.on { border-color: ${COURT}; color: ${COURT}; background: rgba(46,230,193,0.08); }

        .ap-act { display: inline-flex; align-items: center; justify-content: center; gap: 5px;
                  border-radius: 7px; padding: 7px 10px; cursor: pointer; font-family: ${MONO};
                  font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
                  border: 1px solid transparent; transition: opacity 0.15s; flex: 1; }
        .ap-act:disabled { opacity: 0.45; cursor: default; }
        .ap-approve { background: linear-gradient(90deg, ${COURT}, ${BALL}); color: #05070d; }
        /* Rechazar va solo con el icono al lado de Aprobar: la acción principal
           es la que se lee, y así entra en una columna angosta */
        .ap-reject  { background: rgba(255,93,93,0.1); border-color: rgba(255,93,93,0.4); color: ${CRIT};
                      flex: 0 0 auto; padding: 7px 9px; }
        .ap-revert  { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.15); color: ${INK1}; }

        /* minmax(0, 1fr) y no 1fr: si no, la columna no baja del ancho de su
           contenido y la grilla desborda en móvil */
        .ap-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 1500px) { .ap-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
        @media (max-width: 1240px) { .ap-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 1023px) { .ap-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 767px) {
          .ap-page { padding: 28px 16px; }
          .ap-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        }
      `}</style>

      <div className="ap-wrap">

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
            Panel Admin
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            Cartas por aprobar
          </h1>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.06em", margin: "8px 0 0" }}>
            Ninguna carta llega al market sin pasar por aquí
          </p>
          {trm && (
            <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.06em", margin: "6px 0 0", opacity: 0.75 }}>
              Dólar de hoy ${trm.cop.toLocaleString("es-CO")} COP · {trm.fuente}
            </p>
          )}
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
                <div key={l.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ position: "relative", width: "100%", aspectRatio: "5/7", background: "rgba(255,255,255,0.03)", flexShrink: 0 }}>
                    {card?.image && (
                      <img src={card.image} alt={card.name} loading="lazy" decoding="async"
                        style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", inset: 0 }} />
                    )}
                    {/* Precio sobre la imagen: es el dato que se mira al moderar */}
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "16px 8px 6px", background: "linear-gradient(180deg, transparent, rgba(5,7,13,0.92))", fontFamily: MONO, fontSize: 12, fontWeight: 700, color: COURT, textAlign: "center" }}>
                      {CURRENCY_SYMBOL[l.currency] ?? "$"}{formatPrice(l.price_cop, l.currency)}
                      <span style={{ fontSize: 8, color: INK2, marginLeft: 3 }}>{l.currency}</span>
                    </div>
                  </div>

                  <div style={{ padding: "8px 9px 9px", display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: INK0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {card?.name ?? `Carta #${l.card_id}`}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: INK2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {setName}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 8, color: verColor, letterSpacing: "0.06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {getVersionLabel(l.version)}{l.language ? ` · ${l.language.toUpperCase()}` : ""}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: INK2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      title={`@${l.player?.username ?? "—"} · ${new Date(l.created_at).toLocaleDateString("es-CO")}`}>
                      @{l.player?.username ?? "—"} · {new Date(l.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                    </div>

                    {(() => {
                      const c = comparar(l);
                      if (!c) return null;
                      const color = c.diff === null ? INK2 : c.diff > 15 ? CRIT : c.diff < -15 ? BALL : COURT;
                      return (
                        <div style={{ borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: 5, display: "flex", flexDirection: "column", gap: 2 }}>
                          <div style={{ fontFamily: MONO, fontSize: 8, color: INK2, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            Mercado
                          </div>
                          <div style={{ fontFamily: MONO, fontSize: 10, color: INK1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                            title={trm ? `US$${c.usd.toFixed(2)} · dólar a $${trm.cop.toLocaleString("es-CO")} (${trm.fuente}, ${trm.fecha})` : undefined}>
                            US${c.usd.toFixed(2)}
                            {c.referenciaCop !== null && ` · $${c.referenciaCop.toLocaleString("es-CO")}`}
                          </div>
                          {c.diff !== null && (
                            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color }}>
                              {c.diff > 0 ? "+" : ""}{c.diff}% {c.diff > 0 ? "sobre" : c.diff < 0 ? "bajo" : "en"} mercado
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {l.rejection_reason && (
                      <div style={{ fontFamily: MONO, fontSize: 9, color: CRIT, lineHeight: 1.45, background: "rgba(255,93,93,0.07)", border: "1px solid rgba(255,93,93,0.2)", borderRadius: 6, padding: "6px 7px" }}>
                        {l.rejection_reason}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 5, marginTop: "auto", paddingTop: 4 }}>
                      {tab !== "active" && (
                        <button className="ap-act ap-approve" disabled={trabajando === l.id}
                          onClick={() => moderar(l.id, "approve")} title="Aprobar">
                          <Check size={12} /> Aprobar
                        </button>
                      )}
                      {tab === "active" && (
                        <button className="ap-act ap-revert" disabled={trabajando === l.id}
                          onClick={() => moderar(l.id, "revert")} title="Sacar del market y volver a revisión">
                          <Undo2 size={12} /> Revisar
                        </button>
                      )}
                      {tab !== "rejected" && (
                        <button className="ap-act ap-reject" disabled={trabajando === l.id}
                          onClick={() => { setRechazando(l); setMotivo(""); }} title="Rechazar con un motivo">
                          <X size={12} />
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
