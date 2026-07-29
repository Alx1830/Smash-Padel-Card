"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { getVersionLabel } from "@/data/pokemon-cards-meta";
import { formatPrice } from "@/lib/currency";
import { Store } from "lucide-react";

const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface Row {
  card_id: string; set_id: string; version: string | null;
  price_cop: number; currency: string | null;
}

interface TopCard {
  key: string;
  card_id: string; set_id: string; version: string | null;
  listings: number;
  minPrice: number; currency: string;
}

/** Las 5 cartas con más publicaciones activas en el país del usuario */
export function TopLocalCards() {
  const [cards, setCards]     = useState<TopCard[]>([]);
  const [pais, setPais]       = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setCardsReady]     = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }

      const { data: me } = await supabase
        .from("players").select("pais").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      const myPais = me?.pais ?? null;
      setPais(myPais);

      // "Local" = publicaciones de jugadores del mismo país, igual que /market
      let userIds: string[] | null = null;
      if (myPais) {
        const { data: peers } = await supabase
          .from("players").select("user_id").eq("pais", myPais);
        if (cancelled) return;
        userIds = (peers ?? []).map((p: { user_id: string }) => p.user_id);
        if (userIds.length === 0) { setLoading(false); return; }
      }

      let q = supabase
        .from("market_listings")
        .select("card_id, set_id, version, price_cop, currency")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(500);
      if (userIds) q = q.in("user_id", userIds);

      const { data } = await q;
      if (cancelled) return;

      // Se agrupa por carta + variante: la misma carta publicada por varios
      // jugadores es lo que la vuelve "lo que más se está vendiendo".
      const grouped: Record<string, TopCard> = {};
      for (const r of (data ?? []) as Row[]) {
        const key = `${r.card_id}::${r.set_id}::${r.version ?? ""}`;
        const cur = r.currency ?? "COP";
        const g = grouped[key];
        if (g) {
          g.listings += 1;
          if (r.price_cop < g.minPrice) { g.minPrice = r.price_cop; g.currency = cur; }
        } else {
          grouped[key] = {
            key, card_id: r.card_id, set_id: r.set_id, version: r.version,
            listings: 1, minPrice: r.price_cop, currency: cur,
          };
        }
      }

      const top = Object.values(grouped)
        .sort((a, b) => b.listings - a.listings || a.minPrice - b.minPrice)
        .slice(0, 5);

      setCards(top);
      setLoading(false);

      for (const setId of new Set(top.map(c => c.set_id))) {
        if (cancelled) return;
        await loadManySets([setId]);
        if (!cancelled) setCardsReady(n => n + 1);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "16px",
      padding: "20px",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Store size={14} color={LIME} strokeWidth={1.8} />
        <p style={{
          fontFamily: MONO, fontSize: "9px", color: INK2,
          letterSpacing: "0.18em", textTransform: "uppercase", margin: 0,
        }}>
          Top 5 en venta
        </p>
      </div>
      <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: "0 0 14px" }}>
        {pais ? `Lo más publicado en ${pais}` : "Lo más publicado en el market"}
      </p>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <style>{`@keyframes fb-pulse{0%,100%{opacity:.3}50%{opacity:.7}}`}</style>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 44, borderRadius: 8, background: "rgba(255,255,255,0.05)",
              animation: `fb-pulse 1.4s ease-in-out infinite ${i * 0.1}s`,
            }} />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, margin: 0, lineHeight: 1.6 }}>
          Todavía no hay cartas publicadas cerca de ti.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {cards.map((c, i) => {
            const card = SET_CARDS[c.set_id]?.find(pc => String(pc.id) === String(c.card_id));
            const name = card?.name ?? String(c.card_id).split(":")[1] ?? "Carta";
            const version = c.version ?? card?.version ?? "";
            return (
              <Link key={c.key} href="/market" className="top-local-row" style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 9px", borderRadius: 10, textDecoration: "none",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <span style={{
                  fontFamily: DISP, fontSize: 13, color: i === 0 ? LIME : INK2,
                  width: 14, textAlign: "center", flexShrink: 0,
                }}>{i + 1}</span>

                {card?.image
                  ? <img src={card.image} alt="" loading="lazy" style={{
                      width: 30, aspectRatio: "5/7", objectFit: "contain",
                      borderRadius: 4, flexShrink: 0,
                    }} />
                  : <div style={{
                      width: 30, aspectRatio: "5/7", borderRadius: 4, flexShrink: 0,
                      background: "rgba(255,255,255,0.06)",
                    }} />}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: MONO, fontSize: 11, color: INK0, margin: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }} title={name}>{name}</p>
                  <p style={{ fontFamily: MONO, fontSize: 9, color: INK2, margin: 0 }}>
                    {version ? getVersionLabel(version) : "—"} · {c.listings} en venta
                  </p>
                </div>

                <span style={{
                  fontFamily: MONO, fontSize: 10, fontWeight: 700, color: COURT,
                  flexShrink: 0, whiteSpace: "nowrap",
                }}>
                  {formatPrice(c.minPrice, c.currency)}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <Link href="/market" style={{
        marginTop: 14, textAlign: "center", padding: "9px",
        borderRadius: 9, textDecoration: "none",
        border: `1px solid ${LIME}33`, background: `${LIME}0e`, color: LIME,
        fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        Ir al market local →
      </Link>

      <style>{`
        .top-local-row { transition: border-color 0.15s, background 0.15s; }
        .top-local-row:hover {
          border-color: ${LIME}44 !important;
          background: rgba(214,255,61,0.06) !important;
        }
      `}</style>
    </div>
  );
}
