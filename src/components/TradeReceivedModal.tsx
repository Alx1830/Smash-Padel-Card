"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import type { PokemonCard } from "@/data/pokemon-cards-meta";
import { ChevronLeft, ChevronRight } from "lucide-react";

const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface PendingCard { card: PokemonCard; quantity: number }

/**
 * Aviso de "objetos recibidos": aparece una sola vez por intercambio, la
 * primera vez que entras al inventario después de confirmar la recepción.
 */
export function TradeReceivedModal() {
  const [cards, setCards]   = useState<PendingCard[]>([]);
  const [tradeIds, setIds]  = useState<{ id: string; field: string }[]>([]);
  const [index, setIndex]   = useState(0);
  const [closing, setClose] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase
        .from("trades")
        .select("id, from_user_id, to_user_id, from_received_at, to_received_at, from_ack_at, to_ack_at, trade_cards(side, card_id, set_id, version, quantity)")
        .eq("status", "accepted")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);
      if (cancelled || !data?.length) return;

      type Row = {
        id: string; from_user_id: string; to_user_id: string;
        from_received_at: string | null; to_received_at: string | null;
        from_ack_at: string | null; to_ack_at: string | null;
        trade_cards: { side: "offer" | "request"; card_id: string; set_id: string; version: string | null; quantity: number }[];
      };

      // Solo los que yo ya confirmé y todavía no vi
      const pending = (data as Row[]).filter(t => {
        const isTo = t.to_user_id === user.id;
        return isTo
          ? t.to_received_at && !t.to_ack_at
          : t.from_received_at && !t.from_ack_at;
      });
      if (!pending.length) return;

      const got = pending.flatMap(t => {
        const isTo = t.to_user_id === user.id;
        // Lo que yo recibo es el 'offer' del emisor si soy el receptor
        return (t.trade_cards ?? []).filter(c => c.side === (isTo ? "offer" : "request"));
      });
      if (!got.length) return;

      await loadManySets([...new Set(got.map(c => c.set_id))]);
      if (cancelled) return;

      const resolved = got.map(c => {
        const card = (SET_CARDS[c.set_id] ?? []).find(pc => String(pc.id) === String(c.card_id));
        return card ? { card, quantity: c.quantity } : null;
      }).filter(Boolean) as PendingCard[];
      if (!resolved.length) return;

      setCards(resolved);
      setIds(pending.map(t => ({
        id: t.id,
        field: t.to_user_id === user.id ? "to_ack_at" : "from_ack_at",
      })));
    })();

    return () => { cancelled = true; };
  }, []);

  const dismiss = useCallback(async () => {
    setClose(true);
    const supabase = createClient();
    const stamp = new Date().toISOString();
    await Promise.all(tradeIds.map(t =>
      supabase.from("trades").update({ [t.field]: stamp }).eq("id", t.id)
    ));
    setCards([]);
  }, [tradeIds]);

  useEffect(() => {
    if (!cards.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      if (e.key === "ArrowRight") setIndex(i => Math.min(cards.length - 1, i + 1));
      if (e.key === "ArrowLeft")  setIndex(i => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards.length, dismiss]);

  if (!cards.length || closing) return null;

  const total = cards.reduce((n, c) => n + c.quantity, 0);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      background: "rgba(3,5,10,0.9)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <style>{`
        @keyframes trm-in { from { opacity: 0; transform: translateY(14px) scale(0.97) } to { opacity: 1; transform: none } }
        @keyframes trm-glow { 0%,100% { opacity: .35 } 50% { opacity: .7 } }
        .trm-card { transition: transform 0.28s ease, opacity 0.28s ease; }
      `}</style>

      <div style={{
        width: "min(460px, 94vw)", borderRadius: 20, padding: "26px 22px",
        background: "linear-gradient(180deg, rgba(46,230,193,0.10), rgba(255,255,255,0.02))",
        border: `1px solid ${COURT}33`, textAlign: "center",
        animation: "trm-in 0.35s ease both",
      }}>
        <p style={{
          fontFamily: MONO, fontSize: 10, color: COURT, letterSpacing: "0.2em",
          textTransform: "uppercase", margin: "0 0 6px",
        }}>
          Intercambio completado
        </p>
        <h2 style={{ fontFamily: DISP, fontSize: 24, color: INK0, margin: "0 0 4px" }}>
          Cartas recibidas
        </h2>
        <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: "0 0 18px" }}>
          {total} {total === 1 ? "carta entró" : "cartas entraron"} a tu inventario
        </p>

        {/* Carrusel */}
        <div style={{
          position: "relative", height: 260,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            position: "absolute", width: 150, height: 150, borderRadius: "50%",
            background: `radial-gradient(circle, ${COURT}55, transparent 70%)`,
            animation: "trm-glow 2.4s ease-in-out infinite",
          }} />

          {cards.map(({ card }, i) => {
            const offset = i - index;
            if (Math.abs(offset) > 2) return null;
            return (
              <img
                key={`${card.id}-${i}`}
                className="trm-card"
                src={card.image}
                alt={card.name}
                style={{
                  position: "absolute", height: offset === 0 ? 240 : 190,
                  borderRadius: 8, objectFit: "contain",
                  transform: `translateX(${offset * 70}px) rotate(${offset * 6}deg)`,
                  opacity: offset === 0 ? 1 : 0.45,
                  zIndex: 10 - Math.abs(offset),
                  boxShadow: offset === 0 ? `0 12px 40px rgba(0,0,0,0.75)` : "none",
                  cursor: offset === 0 ? "default" : "pointer",
                }}
                onClick={() => offset !== 0 && setIndex(i)}
              />
            );
          })}

          {index > 0 && (
            <button onClick={() => setIndex(i => i - 1)} aria-label="Anterior" style={arrowStyle("left")}>
              <ChevronLeft size={18} />
            </button>
          )}
          {index < cards.length - 1 && (
            <button onClick={() => setIndex(i => i + 1)} aria-label="Siguiente" style={arrowStyle("right")}>
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        <p style={{ fontFamily: MONO, fontSize: 12, color: INK0, margin: "10px 0 2px" }}>
          {cards[index].card.name}
          {cards[index].quantity > 1 && (
            <span style={{ color: LIME }}> ×{cards[index].quantity}</span>
          )}
        </p>
        <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, margin: "0 0 18px" }}>
          {index + 1} / {cards.length}
        </p>

        <button onClick={dismiss} style={{
          width: "100%", padding: "13px", borderRadius: 12, border: "none",
          background: COURT, color: "#05070d", cursor: "pointer",
          fontFamily: MONO, fontSize: 13, fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          Vale
        </button>
      </div>
    </div>
  );
}

function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute", [side]: 0, zIndex: 20,
    width: 34, height: 34, borderRadius: "50%",
    background: "rgba(5,7,13,0.8)", border: "1px solid rgba(255,255,255,0.12)",
    color: INK0, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}
