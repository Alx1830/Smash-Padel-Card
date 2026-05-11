"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { getVersionLabel } from "@/data/pokemon-cards-meta";
import { formatPrice, CURRENCY_SYMBOL } from "@/lib/currency";

const MONO  = "var(--font-jetbrains)";
const COURT = "#2ee6c1";
const ALL_SETS = POKEMON_SERIES.flatMap(s => s.sets);

interface TickerItem {
  cardName: string;
  versionLabel: string;
  setName: string;
  price: string;
}

export function MarketTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [debug, setDebug] = useState<string>("cargando...");

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("market_listings")
          .select("card_id, set_id, version, price_cop, currency")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(60);

        console.log("[MarketTicker] fetch:", { data, error, count: data?.length });

        if (error) {
          console.error("[MarketTicker] error:", error);
          setDebug(`Error Supabase: ${error.message}`);
          return;
        }
        if (!data || data.length === 0) {
          console.warn("[MarketTicker] 0 active listings");
          setDebug("0 listings activos");
          return;
        }

        const setIds = [...new Set(data.map((r: { set_id: string }) => r.set_id))];
        console.log("[MarketTicker] loading sets:", setIds);

        try { await loadManySets(setIds); } catch (e) { console.error("[MarketTicker] loadManySets:", e); }

        const mapped: TickerItem[] = data.map((r: { card_id: string; set_id: string; version: string; price_cop: number; currency: string }) => {
          const cards   = SET_CARDS[r.set_id] ?? [];
          const card    = cards.find(c => String(c.id) === String(r.card_id))
                       ?? cards.find(c => String(c.card_number) === String(r.card_id) && c.version === r.version)
                       ?? cards.find(c => String(c.card_number) === String(r.card_id));
          const setInfo = ALL_SETS.find(s => s.id === r.set_id);
          return {
            cardName:     card?.name?.trim() || String(r.card_id).split(":")[0] || "Carta",
            versionLabel: getVersionLabel(card?.version ?? r.version),
            setName:      setInfo?.name ?? r.set_id,
            price:        `${CURRENCY_SYMBOL[r.currency] ?? "$"}${formatPrice(r.price_cop, r.currency)} ${r.currency}`,
          };
        });

        console.log("[MarketTicker] items:", mapped.length);
        setItems(mapped);
      } catch (e) {
        console.error("[MarketTicker] unexpected:", e);
        setDebug(`Error: ${String(e)}`);
      }
    })();
  }, []);

  const BG      = "#2ee6c1";
  const PRICE   = "#05070d";
  const NAME    = "#0a2a24";
  const VARIANT = "#ff4fd8";
  const SET     = "rgba(5,7,13,0.55)";
  const SEP     = "rgba(5,7,13,0.3)";

  if (items.length === 0) {
    return (
      <div style={{ width: "100%", background: BG, height: "32px", display: "flex", alignItems: "center", paddingLeft: "16px" }}>
        <span style={{ fontFamily: MONO, fontSize: "10px", color: PRICE }}>{debug}</span>
      </div>
    );
  }

  const track = [...items, ...items];

  return (
    <div style={{ width: "100%", background: BG, overflow: "hidden", height: "32px", display: "flex", alignItems: "center" }}>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          align-items: center;
          white-space: nowrap;
          animation: ticker-scroll ${Math.max(items.length * 4, 30)}s linear infinite;
          will-change: transform;
        }
        .ticker-track:hover { animation-play-state: paused; }
      `}</style>
      <div className="ticker-track">
        {track.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: "10px", color: NAME, fontWeight: 600, letterSpacing: "0.04em", paddingRight: "6px" }}>{item.cardName}</span>
            <span style={{ fontFamily: MONO, fontSize: "9px", color: VARIANT, fontWeight: 700, letterSpacing: "0.08em", paddingRight: "6px" }}>{item.versionLabel}</span>
            <span style={{ fontFamily: MONO, fontSize: "9px", color: SET, paddingRight: "6px" }}>del</span>
            <span style={{ fontFamily: MONO, fontSize: "9px", color: SET, letterSpacing: "0.02em", paddingRight: "6px" }}>{item.setName}</span>
            <span style={{ fontFamily: MONO, fontSize: "10px", color: PRICE, fontWeight: 800, letterSpacing: "0.04em", paddingRight: "28px" }}>{item.price}</span>
            <span style={{ color: SEP, fontSize: "8px", paddingRight: "28px" }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
