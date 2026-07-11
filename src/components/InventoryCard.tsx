"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getVersionLabel, getVersionColor, getVersionEffect } from "@/data/pokemon-cards-meta";
import type { PokemonCard } from "@/data/pokemon-cards-meta";
import type { UserListing } from "@/components/CardDetailModal";
import { getCurrencyForCountry } from "@/lib/currency";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

/* ── Cosmos stars ────────────────────────────────────────────── */
const COSMOS_STARS = Array.from({ length: 18 }, (_, i) => ({
  x:   (i * 37 + 11) % 95,
  y:   (i * 53 +  7) % 93,
  size: 3 + (i % 4) * 1.8,
  delay: parseFloat(((i * 0.28) % 2.4).toFixed(2)),
  dur:  parseFloat((1.1 + (i % 5) * 0.35).toFixed(2)),
}));

/** Animaciones requeridas por InvTiltCard — incluir una vez por página */
export const INV_CARD_KEYFRAMES = `
  @keyframes inv-salePulse {
    0%, 100% { box-shadow: 0 0 8px 3px rgba(214,255,61,0.5); }
    50%       { box-shadow: 0 0 16px 6px rgba(214,255,61,0.85); }
  }
  @keyframes inv-holoShift {
    0%,100% { opacity: 0.7; }
    50%     { opacity: 1; }
  }
  @keyframes inv-goldShift {
    0%,100% { opacity: 0.85; }
    50%     { opacity: 1; }
  }
  @keyframes inv-cosmosHue {
    0%   { filter: hue-rotate(0deg)   brightness(1); }
    50%  { filter: hue-rotate(180deg) brightness(1.1); }
    100% { filter: hue-rotate(360deg) brightness(1); }
  }
  @keyframes inv-cosmosStar {
    0%,100% { opacity: 0;    transform: translate(-50%,-50%) scale(0.2) rotate(0deg); }
    50%     { opacity: 0.95; transform: translate(-50%,-50%) scale(1.1) rotate(20deg); }
  }
  .inv-icon-btn {
    width: 26px; height: 26px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(5,7,13,0.75); border: none; border-radius: 6px;
    cursor: pointer; transition: background 0.15s; padding: 0;
    backdrop-filter: blur(4px);
  }
  .inv-icon-btn:hover { background: rgba(5,7,13,0.92); }
  .inv-icon-btn.active { background: rgba(46,230,193,0.2); }
  .inv-qty-btn {
    width: 28px; height: 28px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; border: 1px solid rgba(255,255,255,0.12);
    background: none; transition: background 0.15s; padding: 0;
    font-size: 16px; font-weight: 600; line-height: 1;
    flex-shrink: 0;
  }
  .inv-qty-btn:hover { background: rgba(255,255,255,0.07); }
  .inv-qty-num {
    width: 24px; text-align: center;
    font-family: var(--font-jetbrains); font-size: 13px;
    font-weight: 700; color: #f5f7fb; flex-shrink: 0;
  }
`;

/* ── Card con efectos holo (sin tilt 3D) ─────────────────────── */
export function InvTiltCard({ card, onClick }: { card: PokemonCard; onClick: () => void }) {
  const effect   = getVersionEffect(card.version);
  const isH      = effect === "holofoil";
  const isGold   = effect === "goldBorder";
  const isRH     = effect === "reverseHolofoil" || effect === "metal";
  const isCosmos = card.version === "cosmosHolofoil" || card.version === "cosmosReverseHolofoil";
  const vLabel   = getVersionLabel(card.version);
  const vColor   = getVersionColor(card.version);

  const shadowStyle = isH
    ? "0 16px 48px rgba(255,160,80,0.4), 0 4px 16px rgba(0,0,0,0.6)"
    : isGold
    ? "0 16px 48px rgba(255,200,50,0.5), 0 4px 16px rgba(0,0,0,0.6)"
    : isRH || isCosmos
    ? "0 16px 48px rgba(180,180,220,0.3), 0 4px 16px rgba(0,0,0,0.6)"
    : "0 8px 24px rgba(0,0,0,0.7)";

  return (
    <div
      style={{ width: "100%", aspectRatio: "5/7", position: "relative", cursor: "pointer" }}
      onClick={onClick}
    >
      <div style={{
        position: "absolute", inset: 0, borderRadius: "8px", overflow: "hidden",
        boxShadow: shadowStyle,
      }}>
        <img src={card.image} alt={card.name} loading="lazy" style={{ objectFit: "contain", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />

        {isRH && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
            background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(220,220,240,0.3) 0%, transparent 60%)`,
          }} />
        )}

        {(isH || isGold) && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "color-dodge",
            background: isGold
              ? `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,220,80,0.35) 0%, rgba(255,160,0,0.2) 50%, transparent 90%)`
              : `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,100,100,0.2) 0%, rgba(80,255,120,0.15) 50%, transparent 90%)`,
            animation: isGold ? "inv-goldShift 4s ease-in-out infinite" : "inv-holoShift 4s ease-in-out infinite",
          }} />
        )}

        {(isH || isGold) && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
            background: isGold
              ? `linear-gradient(120deg, transparent 0%, rgba(255,200,50,0.15) 35%, transparent 70%)`
              : `linear-gradient(120deg, transparent 0%, rgba(255,100,150,0.1) 35%, transparent 70%)`,
          }} />
        )}

        {isCosmos && (
          <>
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              mixBlendMode: "color-dodge",
              background: `linear-gradient(135deg,
                rgba(255,60,80,0.35) 0%, rgba(255,140,0,0.3) 14%,
                rgba(255,230,0,0.28) 28%, rgba(60,220,60,0.28) 42%,
                rgba(0,140,255,0.32) 57%, rgba(120,0,240,0.32) 71%,
                rgba(255,0,160,0.3) 85%, rgba(255,60,80,0.35) 100%)`,
              animation: "inv-cosmosHue 5s linear infinite",
            }} />
            {COSMOS_STARS.map((s, i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${s.x}%`, top: `${s.y}%`,
                width: s.size, height: s.size,
                transform: "translate(-50%, -50%)",
                clipPath: "polygon(50% 0%,56% 44%,100% 50%,56% 56%,50% 100%,44% 56%,0% 50%,44% 44%)",
                background: "white",
                mixBlendMode: "screen",
                animation: `inv-cosmosStar ${s.dur}s ${s.delay}s ease-in-out infinite`,
                pointerEvents: "none",
              }} />
            ))}
          </>
        )}

        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
          background: `linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)`,
        }} />

        {/* Version badge */}
        <div style={{
          position: "absolute", bottom: 6, right: 6, zIndex: 10,
          fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em",
          color: vColor, border: `1px solid ${vColor}60`,
          borderRadius: "4px", padding: "2px 5px",
          background: "rgba(5,7,13,0.85)", backdropFilter: "blur(4px)",
          pointerEvents: "none",
        }}>
          {vLabel}
        </div>
      </div>
    </div>
  );
}

/* ── Sell popup ──────────────────────────────────────────────── */
export function SellPopup({ card, setId, userId, onPublished, onClose }: {
  card: PokemonCard; setId: string; userId: string;
  onPublished: (listing: UserListing) => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [price, setPrice] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [userCurrency, setUserCurrency] = useState("COP");
  const vColor = getVersionColor(card.version);
  const vLabel = getVersionLabel(card.version);

  useEffect(() => {
    supabase.from("players").select("pais").eq("user_id", userId).single()
      .then(({ data }) => { if (data?.pais) setUserCurrency(getCurrencyForCountry(data.pais)); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function publish() {
    const p = parseInt(price.replace(/\D/g, ""), 10);
    if (!p || p <= 0) return;
    setState("saving");
    const { data, error } = await supabase.from("market_listings").insert({
      user_id: userId, card_id: card.card_number, set_id: setId,
      price_cop: p, version: card.version, status: "active", currency: userCurrency,
    }).select("id, card_id, set_id, price_cop, version, currency").single();
    if (!error && data) onPublished(data as UserListing);
    setState("done");
    setTimeout(onClose, 1500);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(5,7,13,0.75)", backdropFilter: "blur(6px)",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: 320, borderRadius: "16px",
        background: "#0d1520", border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)", padding: "24px",
      }}>
        {state === "done" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "32px", color: COURT, marginBottom: "10px" }}>✓</div>
            <p style={{ fontFamily: MONO, fontSize: "13px", color: COURT, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
              Publicado
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, marginBottom: "6px" }}>
              Poner en venta
            </p>
            <p style={{ fontFamily: DISP, fontSize: "16px", color: INK0, fontWeight: 700, margin: "0 0 4px" }}>{card.name}</p>
            <p style={{ fontFamily: MONO, fontSize: "10px", color: vColor, margin: "0 0 20px", letterSpacing: "0.1em" }}>{vLabel}</p>
            <label style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: INK2, display: "block", marginBottom: "8px" }}>
              Precio en {userCurrency}
            </label>
            <input
              type="text" inputMode="numeric" placeholder="Ej: 15000"
              value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => { if (e.key === "Enter") publish(); }}
              autoFocus
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "8px",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                color: INK0, fontFamily: MONO, fontSize: "16px", fontWeight: 600,
                outline: "none", boxSizing: "border-box", marginBottom: "16px",
              }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={onClose} style={{
                flex: 1, padding: "10px", borderRadius: "8px",
                background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                color: INK2, fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em",
                textTransform: "uppercase", cursor: "pointer",
              }}>Cancelar</button>
              <button onClick={publish} disabled={state === "saving" || !price} style={{
                flex: 1, padding: "10px", borderRadius: "8px",
                background: COURT, color: "#05070d",
                fontFamily: MONO, fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                border: "none", cursor: state === "saving" ? "default" : "pointer",
                opacity: !price ? 0.5 : 1,
              }}>
                {state === "saving" ? "…" : "Publicar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
