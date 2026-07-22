"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { getVersionLabel, getVersionColor } from "@/data/pokemon-cards-meta";
import type { PokemonCard } from "@/data/pokemon-cards-meta";
import { useScrydexPrice, SCRYDEX_SET_CODES } from "@/hooks/useScrydexPrice";

const ModalTiltCard = dynamic(
  () => import("@/components/CardDetailModal").then(m => ({ default: m.ModalTiltCard })),
  { ssr: false }
);

const VIOLET = "#a78bfa";
const INK0   = "#f5f7fb";
const INK2   = "#7a8298";
const BG0    = "#05070d";
const MONO   = "var(--font-jetbrains)";
const DISP   = "var(--font-archivo)";

interface Row { card_id: string; set_id: string; version: string; quantity: number; position: number; }
interface SetInfo { id: string; name: string; logo: string; }

function CardPriceTag({ card, setId }: { card: PokemonCard; setId: string }) {
  const scrydexCode = SCRYDEX_SET_CODES[setId];
  const { prices, loading } = useScrydexPrice({
    setSlug: setId, setCode: scrydexCode ?? "",
    cardName: card.name, cardNumber: card.card_number,
    enabled: !!scrydexCode,
  });
  if (!scrydexCode) return null;
  const vKey = card.version.toLowerCase().replace(/\s+/g, "");
  const price: number | null = prices
    ? (prices[vKey] ?? prices[card.version] ?? prices[card.version.charAt(0).toUpperCase() + card.version.slice(1)] ?? null)
    : null;
  if (loading) return (
    <span style={{ fontFamily: MONO, fontSize: "9px", color: INK2, letterSpacing: "0.06em" }}>…</span>
  );
  if (price === null) return null;
  return (
    <span style={{ fontFamily: MONO, fontSize: "10px", color: "#2ee6c1", fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      ${price.toFixed(2)}
    </span>
  );
}

export function MySetViewClient({
  username, setName, description, rows, allSets,
}: {
  username:    string;
  setName:     string;
  description: string;
  rows:        Row[];
  allSets:     SetInfo[];
}) {
  const [previewCard, setPreviewCard] = useState<PokemonCard | null>(null);
  const [setsLoaded,  setSetsLoaded]  = useState(false);

  useEffect(() => {
    const ids = [...new Set(rows.map(r => r.set_id))];
    loadManySets(ids).then(() => setSetsLoaded(true));
  }, [rows]);

  const resolved = useMemo(() => {
    if (!setsLoaded) return [];
    return rows.map(r => {
      const cards = SET_CARDS[r.set_id];
      const card  = cards?.find(c => c.id === r.card_id && c.version === r.version);
      const set   = allSets.find(s => s.id === r.set_id);
      return card && set ? { card, set, set_id: r.set_id, quantity: r.quantity } : null;
    }).filter(Boolean) as { card: NonNullable<ReturnType<typeof SET_CARDS[string]["find"]>>; set: SetInfo; set_id: string; quantity: number }[];
  }, [rows, allSets, setsLoaded]);

  return (
    <div style={{ width: "100%", background: BG0 }}>

      {/* ══ LIGHTBOX ══ */}
      {previewCard && (
        <div onClick={() => setPreviewCard(null)} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(5,7,13,0.92)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(300px, 78vw)" }}>
            <ModalTiltCard card={previewCard} />
          </div>
          <button onClick={() => setPreviewCard(null)} style={{ position: "fixed", top: "20px", right: "24px", background: "none", border: "none", color: INK0, fontSize: "24px", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ══ HEADER SECTION ══ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px 16px" }} className="ms-section-header">
        <style>{`@media (min-width: 1024px) { .ms-section-header { padding: 32px 80px 16px !important; } }`}</style>
        <div style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: VIOLET, display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ width: "18px", height: "1px", background: VIOLET, display: "inline-block" }} />
          <Link href={`/${username}`} style={{ color: VIOLET, textDecoration: "none" }}>@{username}</Link>
          <span style={{ color: INK2 }}>›</span>
          Set
        </div>
        <h2 style={{ fontFamily: DISP, fontSize: "clamp(24px, 3vw, 36px)", lineHeight: 1.05, margin: 0, letterSpacing: "-0.02em", color: INK0 }}>
          {setName}
        </h2>
        {description && (
          <p style={{ margin: "10px 0 0", fontFamily: MONO, fontSize: "12px", color: INK2, lineHeight: 1.6, maxWidth: "560px" }}>{description}</p>
        )}
        <p style={{ margin: "8px 0 0", fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.1em" }}>
          {!setsLoaded && rows.length > 0
            ? "Cargando cartas..."
            : `${resolved.length} ${resolved.length === 1 ? "carta" : "cartas"}`}
        </p>
      </section>

      {/* ══ BODY ══ */}
      <section style={{ padding: "32px 24px 80px" }} className="ms-body">
        <style>{`
          @media (min-width: 1024px) { .ms-body { padding: 48px 80px 80px !important; } }
          @keyframes ms-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          .ms-skeleton {
            background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%);
            background-size: 200% 100%;
            animation: ms-shimmer 1.4s ease-in-out infinite;
            border-radius: 8px;
          }
          @media (max-width: 767px) { .ms-cards-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; } }
        `}</style>

        {!setsLoaded && rows.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }} className="ms-cards-grid">
            {Array.from({ length: Math.min(rows.length, 12) }).map((_, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div className="ms-skeleton" style={{ width: "100%", aspectRatio: "5/7", flexShrink: 0 }} />
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                  <div className="ms-skeleton" style={{ height: "10px", width: "40%" }} />
                  <div className="ms-skeleton" style={{ height: "12px", width: "75%" }} />
                  <div className="ms-skeleton" style={{ height: "18px", width: "56px" }} />
                </div>
              </div>
            ))}
          </div>
        ) : resolved.length === 0 ? (
          <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "80px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.3 }}>🗂️</div>
            <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Este set está vacío</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }} className="ms-cards-grid">
            {resolved.map((item, i) => {
              const color    = getVersionColor(item.card.version);
              const label    = getVersionLabel(item.card.version);
              const tcgQuery = encodeURIComponent([item.card.name, item.set.name, label].filter(Boolean).join(" "));
              return (
                <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div
                    onClick={() => setPreviewCard(item.card as PokemonCard)}
                    style={{ position: "relative", width: "100%", aspectRatio: "5/7", background: "rgba(255,255,255,0.03)", flexShrink: 0, cursor: "pointer", filter: item.quantity === 0 ? "grayscale(1) brightness(0.75)" : "none" }}
                  >
                    <img
                      src={item.card.image}
                      alt={item.card.name}
                      style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
                      onError={e => {
                        const t = e.currentTarget;
                        t.style.display = "none";
                        const ph = t.parentElement?.querySelector(".ms-img-ph") as HTMLElement | null;
                        if (ph) ph.style.display = "flex";
                      }}
                    />
                    <div className="ms-img-ph" style={{ display: "none", position: "absolute", inset: 0, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", background: "rgba(255,255,255,0.03)" }}>
                      <span style={{ fontSize: "28px", opacity: 0.3 }}>🃏</span>
                      <span style={{ fontFamily: MONO, fontSize: "9px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center", padding: "0 8px" }}>{item.card.name}</span>
                    </div>
                    {item.quantity !== 1 && (
                      <div style={{ position: "absolute", top: "8px", right: "8px", fontFamily: MONO, fontSize: "10px", fontWeight: 700, color: item.quantity === 0 ? INK2 : "#05070d", background: item.quantity === 0 ? "rgba(5,7,13,0.85)" : VIOLET, border: item.quantity === 0 ? "1px solid rgba(122,130,152,0.5)" : "none", borderRadius: "6px", padding: "2px 7px" }}>
                        {item.quantity === 0 ? "falta" : `×${item.quantity}`}
                      </div>
                    )}
                    <div style={{ position: "absolute", bottom: "8px", right: "8px", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.12em", color, border: `1px solid ${color}55`, borderRadius: "4px", padding: "2px 7px", background: "rgba(5,7,13,0.85)" }}>{label}</div>
                  </div>
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 10px", alignItems: "center" }}>
                      <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>#{String(item.card.card_number).padStart(3, "0")}</span>
                      <span style={{ fontFamily: MONO, fontSize: "11px", color: INK0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.card.name}</span>
                      <div style={{ position: "relative", width: "56px", height: "18px" }}>
                        <Image src={item.set.logo} alt={item.set.name} fill style={{ objectFit: "contain", objectPosition: "left center" }} />
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: "9px", color: INK2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.set.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "auto", paddingTop: "2px", alignItems: "center" }}>
                      <CardPriceTag card={item.card as PokemonCard} setId={item.set_id} />
                      <button
                        onClick={() => { const w=430,h=600,left=screen.availWidth-w-16,top=screen.availHeight-h-16; window.open(`https://www.tcgplayer.com/search/pokemon/product?q=${tcgQuery}`,"tcgplayer",`width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`); }}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "8px 4px", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#2ee696", background: "#ffffff", borderRadius: "8px", fontWeight: 700, border: "none", cursor: "pointer" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="https://www.tcgplayer.com/favicon.ico" alt="TCGPlayer" width={12} height={12} style={{ flexShrink: 0 }} />
                        TCGPlayer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
