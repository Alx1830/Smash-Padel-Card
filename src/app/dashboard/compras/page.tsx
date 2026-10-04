"use client";

/**
 * Compras que otros usuarios registraron a tu nombre desde el market. Las
 * pendientes se confirman aquí con una calificación de 1 a 5 estrellas y un
 * comentario opcional; solo entonces cuentan en el perfil del vendedor. El
 * aviso de la campanita llega con ?venta=<id> y abre esa compra directo.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { getVersionLabel } from "@/data/pokemon-cards-meta";
import { formatPrice, CURRENCY_SYMBOL } from "@/lib/currency";
import { Star, X, ShoppingBag } from "lucide-react";

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const CRIT  = "#ff5d5d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";

const ALL_SETS = POKEMON_SERIES.flatMap(s => s.sets);

type Estado = "pendiente" | "completada" | "anulada" | "vencida";
type Tab = "pendiente" | "historial";

interface Compra {
  id: string;
  vendedor_id: string;
  set_id: string;
  card_id: number;
  version: string;
  price: number | null;
  currency: string | null;
  estado: Estado;
  estrellas: number | null;
  comentario: string | null;
  created_at: string;
}

const ESTADO_LABEL: Record<Estado, { label: string; color: string }> = {
  pendiente:  { label: "Por confirmar", color: BALL },
  completada: { label: "Calificada",    color: COURT },
  anulada:    { label: "No recibida",   color: CRIT },
  vencida:    { label: "Vencida",       color: INK2 },
};

export default function ComprasPage() {
  const [compras, setCompras]     = useState<Compra[]>([]);
  const [vendedores, setVendedores] = useState<Record<string, string>>({});
  const [cargando, setCargando]   = useState(true);
  const [tab, setTab]             = useState<Tab>("pendiente");
  const [, setSetsListos]         = useState(0);
  const [calificando, setCalificando] = useState<Compra | null>(null);
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => { (async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error: e } = await supabase
      .from("ventas")
      .select("id, vendedor_id, set_id, card_id, version, price, currency, estado, estrellas, comentario, created_at")
      .eq("comprador_id", user.id)
      .order("created_at", { ascending: false });
    if (e) { setError(e.message); setCargando(false); return; }
    const rows = (data ?? []) as Compra[];
    setCompras(rows);

    const ids = [...new Set(rows.map(r => r.vendedor_id))];
    if (ids.length) {
      const { data: ps } = await supabase.from("players").select("user_id, username").in("user_id", ids);
      setVendedores(Object.fromEntries((ps ?? []).map(p => [p.user_id, p.username ?? ""])));
    }
    setCargando(false);

    // El aviso trae ?venta=<id>: abre esa compra si sigue pendiente.
    const pedida = new URLSearchParams(window.location.search).get("venta");
    const objetivo = rows.find(r => r.id === pedida);
    if (objetivo) {
      setTab(objetivo.estado === "pendiente" ? "pendiente" : "historial");
      if (objetivo.estado === "pendiente") setCalificando(objetivo);
    }

    await loadManySets([...new Set(rows.map(r => r.set_id))]);
    setSetsListos(n => n + 1);
  })(); }, []);

  function abrir(c: Compra) {
    setCalificando(c);
    setEstrellas(0);
    setComentario("");
    setError(null);
  }

  async function responder(c: Compra, recibida: boolean) {
    if (recibida && estrellas < 1) return;
    if (!recibida && !window.confirm("¿Confirmas que no compraste o no recibiste esta carta? La venta no contará en el perfil del vendedor.")) return;
    setTrabajando(c.id);
    setError(null);
    const { error: e } = await createClient().rpc("responder_compra", {
      p_venta_id: c.id,
      p_recibida: recibida,
      p_estrellas: recibida ? estrellas : null,
      p_comentario: recibida ? comentario : null,
    });
    setTrabajando(null);
    if (e) { setError(e.message); return; }
    setCompras(prev => prev.map(x => x.id === c.id
      ? { ...x, estado: recibida ? "completada" : "anulada", estrellas: recibida ? estrellas : null, comentario: recibida ? (comentario.trim() || null) : null }
      : x));
    setCalificando(null);
  }

  const cartaDe = (c: Compra) =>
    SET_CARDS[c.set_id]?.find(k => k.card_number === c.card_id && k.version === c.version);

  const pendientes = compras.filter(c => c.estado === "pendiente");
  const visibles   = tab === "pendiente" ? pendientes : compras.filter(c => c.estado !== "pendiente");

  return (
    <div className="cp-page">
      <style>{`
        .cp-page { min-height: 100vh; background: #05070d; padding: 40px 24px; }
        .cp-wrap { max-width: 1400px; }

        .cp-tab { background: none; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px;
                  padding: 7px 16px; cursor: pointer; font-family: ${MONO}; font-size: 10px;
                  letter-spacing: 0.1em; color: ${INK2}; transition: all 0.15s; white-space: nowrap; }
        .cp-tab:hover { border-color: rgba(46,230,193,0.4); color: ${INK0}; }
        .cp-tab.on { border-color: ${COURT}; color: ${COURT}; background: rgba(46,230,193,0.08); }

        .cp-act { display: inline-flex; align-items: center; justify-content: center; gap: 5px;
                  border-radius: 7px; padding: 7px 10px; cursor: pointer; font-family: ${MONO};
                  font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
                  border: 1px solid transparent; transition: opacity 0.15s; flex: 1; }
        .cp-act:disabled { opacity: 0.45; cursor: default; }
        .cp-ok  { background: linear-gradient(90deg, ${COURT}, ${BALL}); color: #05070d; }
        .cp-no  { background: rgba(255,93,93,0.1); border-color: rgba(255,93,93,0.4); color: ${CRIT};
                  flex: 0 0 auto; padding: 7px 9px; }

        .cp-txt { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: ${MONO}; margin: 0; }

        .cp-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 1500px) { .cp-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
        @media (max-width: 1240px) { .cp-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 1023px) { .cp-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width:  767px) {
          .cp-page { padding: 28px 16px; }
          .cp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        }
      `}</style>

      <div className="cp-wrap">
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
            Market
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            Mis compras
          </h1>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.06em", margin: "8px 0 0" }}>
            Confirma las cartas que recibiste y califica al vendedor; tu reseña sale en su perfil
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
          <button className={`cp-tab${tab === "pendiente" ? " on" : ""}`} onClick={() => setTab("pendiente")}>
            Por confirmar
            {pendientes.length > 0 && <span style={{ marginLeft: 8, color: BALL, fontWeight: 700 }}>{pendientes.length}</span>}
          </button>
          <button className={`cp-tab${tab === "historial" ? " on" : ""}`} onClick={() => setTab("historial")}>
            Historial
          </button>
        </div>

        {error && !calificando && (
          <p style={{ fontFamily: MONO, fontSize: "11px", color: CRIT, marginBottom: 16 }}>{error}</p>
        )}

        {cargando ? null : visibles.length === 0 ? (
          <div style={{ border: "1px dashed rgba(46,230,193,0.2)", borderRadius: "12px", padding: "32px 24px", textAlign: "center", maxWidth: "520px" }}>
            <div style={{ marginBottom: "12px" }}><ShoppingBag size={28} color={COURT} strokeWidth={1.6} /></div>
            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, lineHeight: 1.6, margin: 0 }}>
              {tab === "pendiente"
                ? "No tienes compras por confirmar. Cuando un vendedor marque una carta como vendida a tu nombre, aparece aquí."
                : "Todavía no has calificado ninguna compra."}
            </p>
          </div>
        ) : (
          <div className="cp-grid">
            {visibles.map(c => {
              const carta = cartaDe(c);
              const set   = ALL_SETS.find(s => s.id === c.set_id);
              const est   = ESTADO_LABEL[c.estado];
              const vend  = vendedores[c.vendedor_id];
              return (
                <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "8px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", minWidth: 0 }}>
                  {carta ? (
                    <img src={carta.image} alt={carta.name} loading="lazy" decoding="async" style={{ width: "100%", aspectRatio: "5 / 7", objectFit: "cover", borderRadius: "7px" }} />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "5 / 7", borderRadius: "7px", background: "rgba(255,255,255,0.04)" }} />
                  )}
                  <p className="cp-txt" style={{ fontSize: "11px", color: INK0, fontWeight: 600 }}>{carta?.name ?? `Carta #${c.card_id}`}</p>
                  <p className="cp-txt" style={{ fontSize: "9px", color: INK2 }}>{set?.name ?? c.set_id}</p>
                  <p className="cp-txt" style={{ fontSize: "8px", color: INK2 }}>{getVersionLabel(c.version)}</p>
                  <p className="cp-txt" style={{ fontSize: "9px", color: INK1 }}>
                    {vend ? <Link href={`/${vend}`} style={{ color: INK1 }}>@{vend}</Link> : "Vendedor"}
                    {c.price != null && c.currency && <span style={{ color: COURT }}> · {CURRENCY_SYMBOL[c.currency] ?? "$"}{formatPrice(c.price, c.currency)}</span>}
                  </p>

                  <div style={{ marginTop: "auto", display: "flex", gap: "6px" }}>
                    {c.estado === "pendiente" ? (
                      <>
                        <button className="cp-act cp-ok" disabled={trabajando === c.id} onClick={() => abrir(c)}>
                          <Star size={12} /> Calificar
                        </button>
                        <button className="cp-act cp-no" disabled={trabajando === c.id} onClick={() => responder(c, false)} aria-label="No la recibí" title="No la recibí">
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <span className="cp-txt" style={{ fontSize: "9px", color: est.color, display: "flex", alignItems: "center", gap: "4px" }}>
                        {c.estado === "completada" && c.estrellas
                          ? <>{Array.from({ length: c.estrellas }, (_, i) => <Star key={i} size={10} color={BALL} fill={BALL} />)}</>
                          : est.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {calificando && (() => {
        const carta = cartaDe(calificando);
        const vend  = vendedores[calificando.vendedor_id];
        const ocupado = trabajando === calificando.id;
        return (
          <div
            onClick={e => { if (e.target === e.currentTarget && !ocupado) setCalificando(null); }}
            style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(5,7,13,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
          >
            <div style={{ width: "min(420px, 100%)", maxHeight: "86vh", overflowY: "auto", background: "#0d1520", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "18px", padding: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }}>
              <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "18px" }}>
                {carta && <img src={carta.image} alt={carta.name} decoding="async" style={{ width: "52px", aspectRatio: "5 / 7", objectFit: "cover", borderRadius: "5px", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: COURT, margin: "0 0 6px" }}>¿La recibiste?</p>
                  <p style={{ fontFamily: DISP, fontSize: "17px", fontWeight: 700, color: INK0, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{carta?.name ?? `Carta #${calificando.card_id}`}</p>
                  {vend && <p className="cp-txt" style={{ fontSize: "10px", color: INK2, marginTop: "4px" }}>Vendida por @{vend}</p>}
                </div>
              </div>

              <p style={{ fontFamily: MONO, fontSize: "11px", color: INK1, margin: "0 0 10px" }}>Califica al vendedor</p>
              <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setEstrellas(n)} disabled={ocupado} aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                    style={{ background: "none", border: "none", padding: "2px", cursor: "pointer", lineHeight: 0 }}>
                    <Star size={30} strokeWidth={1.6} color={n <= estrellas ? BALL : INK2} fill={n <= estrellas ? BALL : "none"} />
                  </button>
                ))}
              </div>

              <textarea
                value={comentario}
                onChange={e => setComentario(e.target.value.slice(0, 500))}
                disabled={ocupado}
                placeholder="Cuéntale a la comunidad cómo te fue (opcional)"
                rows={4}
                style={{ width: "100%", boxSizing: "border-box", resize: "vertical", padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: INK0, fontFamily: MONO, fontSize: "16px", outline: "none" }}
              />
              <p style={{ fontFamily: MONO, fontSize: "9px", color: INK2, textAlign: "right", margin: "4px 0 14px" }}>{comentario.length}/500</p>

              {error && <p style={{ fontFamily: MONO, fontSize: "11px", color: CRIT, margin: "0 0 12px" }}>{error}</p>}

              <div style={{ display: "flex", gap: "8px" }}>
                <button className="cp-act" disabled={ocupado} onClick={() => setCalificando(null)}
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.15)", color: INK1, padding: "11px" }}>
                  Cancelar
                </button>
                <button className="cp-act cp-ok" disabled={ocupado || estrellas < 1} onClick={() => responder(calificando, true)} style={{ padding: "11px" }}>
                  {ocupado ? "Enviando…" : "Confirmar compra"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
