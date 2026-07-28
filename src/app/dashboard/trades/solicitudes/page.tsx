"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loadManySets, SET_CARDS } from "@/data/pokemon-cards";
import { formatPrice } from "@/lib/currency";
import { ArrowLeft, Check, X, Clock, Ban } from "lucide-react";

const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const RED   = "#ff6b6b";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface TradeCard {
  side: "offer" | "request";
  card_id: string; set_id: string; version: string | null; quantity: number;
}

interface Trade {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  cash_amount: number | null;
  cash_currency: string | null;
  cash_payer: "from" | "to" | null;
  message: string | null;
  created_at: string;
  trade_cards: TradeCard[];
}

interface PlayerLite {
  user_id: string; username: string | null;
  first_name: string | null; photo_url: string | null;
}

const STATUS_META: Record<Trade["status"], { label: string; color: string }> = {
  pending:   { label: "Pendiente", color: LIME  },
  accepted:  { label: "Aceptado",  color: COURT },
  rejected:  { label: "Rechazado", color: RED   },
  cancelled: { label: "Cancelado", color: INK2  },
};

export default function SolicitudesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [meId, setMeId]       = useState<string | null>(null);
  const [trades, setTrades]   = useState<Trade[]>([]);
  const [players, setPlayers] = useState<Record<string, PlayerLite>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<"recibidas" | "enviadas">("recibidas");
  const [acting, setActing]   = useState<string | null>(null);
  const [, setCardsReady]     = useState(0);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setMeId(user.id);

    const { data } = await supabase
      .from("trades")
      .select("id, from_user_id, to_user_id, status, cash_amount, cash_currency, cash_payer, message, created_at, trade_cards(side, card_id, set_id, version, quantity)")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as unknown as Trade[];
    setTrades(rows);
    setLoading(false);

    const otherIds = [...new Set(rows.map(t => t.from_user_id === user.id ? t.to_user_id : t.from_user_id))];
    if (otherIds.length) {
      const { data: pl } = await supabase
        .from("players").select("user_id, username, first_name, photo_url").in("user_id", otherIds);
      const map: Record<string, PlayerLite> = {};
      (pl ?? []).forEach((p: PlayerLite) => { map[p.user_id] = p; });
      setPlayers(map);
    }

    const setIds = [...new Set(rows.flatMap(t => (t.trade_cards ?? []).map(c => c.set_id)))];
    for (const setId of setIds) {
      await loadManySets([setId]);
      setCardsReady(n => n + 1);
    }
  }, [supabase]);

  useEffect(() => { (async () => { await load(); })(); }, [load]);

  async function respond(trade: Trade, status: "accepted" | "rejected" | "cancelled") {
    if (acting) return;
    setActing(trade.id);
    const { error } = await supabase
      .from("trades")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", trade.id)
      .eq("status", "pending");

    if (error) {
      console.error("[Trades] Error respondiendo:", error);
      alert("No se pudo actualizar la solicitud.");
      setActing(null);
      return;
    }

    if (status !== "cancelled") {
      await fetch("/api/trades/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade_id: trade.id, kind: status }),
      }).catch(() => {});
    }

    setTrades(prev => prev.map(t => t.id === trade.id ? { ...t, status } : t));
    setActing(null);
  }

  const visible = trades.filter(t =>
    tab === "recibidas" ? t.to_user_id === meId : t.from_user_id === meId
  );

  return (
    <div style={{ padding: "24px", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Link href="/dashboard/trades" style={{ display: "flex", color: INK2 }}>
          <ArrowLeft size={20} strokeWidth={1.8} />
        </Link>
        <h1 style={{ fontFamily: DISP, fontSize: "24px", color: INK0, margin: 0, letterSpacing: "-0.02em" }}>
          Solicitudes de intercambio
        </h1>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        {(["recibidas", "enviadas"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "9px 16px", borderRadius: 10, cursor: "pointer",
            background: tab === t ? `${COURT}18` : "transparent",
            border: `1px solid ${tab === t ? `${COURT}44` : "rgba(255,255,255,0.1)"}`,
            color: tab === t ? COURT : INK2,
            fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>{t}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontFamily: MONO, fontSize: 12, color: INK2 }}>Cargando…</p>
      ) : visible.length === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: 12, color: INK2 }}>
          No tienes solicitudes {tab}.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 860 }}>
          {visible.map(trade => {
            const isReceived = trade.to_user_id === meId;
            const other      = players[isReceived ? trade.from_user_id : trade.to_user_id];
            const meta       = STATUS_META[trade.status];
            // Desde mi punto de vista: si recibí la solicitud, su 'offer' es lo que yo recibo
            const iGive    = (trade.trade_cards ?? []).filter(c => c.side === (isReceived ? "request" : "offer"));
            const iReceive = (trade.trade_cards ?? []).filter(c => c.side === (isReceived ? "offer" : "request"));
            const cashLabel = trade.cash_amount
              ? formatPrice(Number(trade.cash_amount), trade.cash_currency ?? "COP")
              : null;
            // cash_payer se guarda respecto a from_user_id
            const iPayCash = trade.cash_payer === (isReceived ? "to" : "from");

            return (
              <div key={trade.id} style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14, padding: 18,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                  {other?.photo_url
                    ? <img src={other.photo_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                    : <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${COURT}22`, border: `1px solid ${COURT}44` }} />}
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <p style={{ fontFamily: DISP, fontSize: 15, color: INK0, margin: 0 }}>
                      @{other?.username ?? "jugador"}
                    </p>
                    <p style={{ fontFamily: MONO, fontSize: 9.5, color: INK2, margin: 0 }}>
                      {new Date(trade.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase",
                    color: meta.color, border: `1px solid ${meta.color}44`,
                    background: `${meta.color}12`, borderRadius: 6, padding: "4px 8px",
                  }}>
                    {trade.status === "pending" ? <Clock size={11} />
                      : trade.status === "accepted" ? <Check size={11} />
                      : trade.status === "cancelled" ? <Ban size={11} /> : <X size={11} />}
                    {meta.label}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <CardList label="Tú entregas" accent={RED} cards={iGive} />
                  <CardList label="Tú recibes"  accent={COURT} cards={iReceive} />
                </div>

                {cashLabel && (
                  <p style={{
                    fontFamily: MONO, fontSize: 11, color: LIME, margin: "14px 0 0",
                    borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12,
                  }}>
                    {iPayCash ? `Tú pagas ${cashLabel}` : `Recibes ${cashLabel}`}
                  </p>
                )}

                {trade.message && (
                  <p style={{
                    fontFamily: MONO, fontSize: 11, color: INK2, margin: "10px 0 0",
                    lineHeight: 1.6, fontStyle: "italic",
                  }}>
                    “{trade.message}”
                  </p>
                )}

                {trade.status === "pending" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                    {isReceived ? (
                      <>
                        <button onClick={() => respond(trade, "accepted")} disabled={acting === trade.id}
                          style={btnStyle(COURT, "#05070d")}>
                          <Check size={14} strokeWidth={2.2} /> Aceptar
                        </button>
                        <button onClick={() => respond(trade, "rejected")} disabled={acting === trade.id}
                          style={btnStyle("transparent", RED, RED)}>
                          <X size={14} strokeWidth={2.2} /> Rechazar
                        </button>
                      </>
                    ) : (
                      <button onClick={() => respond(trade, "cancelled")} disabled={acting === trade.id}
                        style={btnStyle("transparent", INK2, "rgba(255,255,255,0.15)")}>
                        <Ban size={14} strokeWidth={2} /> Cancelar solicitud
                      </button>
                    )}
                  </div>
                )}

                {trade.status === "accepted" && (
                  <p style={{ fontFamily: MONO, fontSize: 10.5, color: INK2, margin: "14px 0 0", lineHeight: 1.6 }}>
                    Intercambio acordado. Coordinen el envío entre ustedes — el inventario no se
                    modifica automáticamente.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function btnStyle(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
    borderRadius: 9, cursor: "pointer",
    background: bg, color,
    border: `1px solid ${border ?? bg}`,
    fontFamily: MONO, fontSize: 11, fontWeight: 700,
    letterSpacing: "0.07em", textTransform: "uppercase",
  };
}

function CardList({ label, accent, cards }: { label: string; accent: string; cards: TradeCard[] }) {
  return (
    <div>
      <p style={{ fontFamily: MONO, fontSize: 9.5, color: accent, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px" }}>
        {label}
      </p>
      {cards.length === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, margin: 0 }}>—</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {cards.map((c, i) => {
            const card = SET_CARDS[c.set_id]?.find(pc => String(pc.id) === String(c.card_id));
            const name = card?.name ?? String(c.card_id).split(":")[1] ?? "Carta";
            return (
              <div key={i} style={{ width: 54, textAlign: "center" }}>
                <div style={{ position: "relative", width: 54, aspectRatio: "5/7" }}>
                  {card?.image
                    ? <img src={card.image} alt={name} loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 4 }} />
                    : <div style={{ width: "100%", height: "100%", borderRadius: 4, background: "rgba(255,255,255,0.05)" }} />}
                  {c.quantity > 1 && (
                    <span style={{
                      position: "absolute", top: 2, right: 2,
                      background: "rgba(5,7,13,0.9)", borderRadius: 4, padding: "1px 4px",
                      fontFamily: MONO, fontSize: 8.5, color: INK0,
                    }}>×{c.quantity}</span>
                  )}
                </div>
                <p style={{
                  fontFamily: MONO, fontSize: 8, color: INK2, margin: "4px 0 0",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }} title={name}>{name}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
