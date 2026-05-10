"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRef, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { getVersionLabel, getVersionColor, getVersionEffect } from "@/data/pokemon-cards-meta";
import {
  invKey,
  type InventoryMap, type FeaturedCard, type WishlistCard, type UserListing,
} from "@/components/CardDetailModal";
import { Plus, Search, ChevronDown, ChevronUp, BadgeDollarSign, Star } from "lucide-react";
import type { PokemonCard } from "@/data/pokemon-cards-meta";
import { getCurrencyForCountry } from "@/lib/currency";

const CardDetailModal = dynamic(
  () => import("@/components/CardDetailModal").then(m => ({ default: m.CardDetailModal })),
  { ssr: false }
);

const AgregarDrawer = dynamic(
  () => import("@/components/AgregarDrawer").then(m => ({ default: m.AgregarDrawer })),
  { ssr: false }
);

const BuscarCartaDrawer = dynamic(
  () => import("@/components/BuscarCartaDrawer").then(m => ({ default: m.BuscarCartaDrawer })),
  { ssr: false }
);

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const SET_LOGO: Record<string, string> = Object.fromEntries(
  POKEMON_SERIES.flatMap(s => s.sets).map(s => [s.id, s.logo])
);

function openTCG(card: PokemonCard) {
  const q   = encodeURIComponent(card.name);
  const url = `https://www.tcgplayer.com/search/pokemon/product?q=${q}`;
  const w = 430, h = 600;
  const left = screen.availWidth - w - 16;
  const top  = screen.availHeight - h - 16;
  window.open(url, "tcgplayer", `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
}

/* ── Cosmos stars (static positions, animated via CSS) ──────── */
const COSMOS_STARS = Array.from({ length: 18 }, (_, i) => ({
  x:   (i * 37 + 11) % 95,
  y:   (i * 53 +  7) % 93,
  size: 3 + (i % 4) * 1.8,
  delay: parseFloat(((i * 0.28) % 2.4).toFixed(2)),
  dur:  parseFloat((1.1 + (i % 5) * 0.35).toFixed(2)),
}));

/* ── Tilt card with holo effects ────────────────────────────── */
function InvTiltCard({ card, onClick }: { card: PokemonCard; onClick: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const rhRef   = useRef<HTMLDivElement>(null);
  const hRef1   = useRef<HTMLDivElement>(null);
  const hRef2   = useRef<HTMLDivElement>(null);
  const glRef   = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const rafId   = useRef(0);

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

  const onEnter = () => { rectRef.current = wrapRef.current?.getBoundingClientRect() ?? null; };

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    cancelAnimationFrame(rafId.current);
    const r = rectRef.current; if (!r) return;
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top)  / r.height;
    const tx = -(ny - 0.5) * 24;
    const ty =  (nx - 0.5) * 24;
    const mx = nx * 100;
    const my = ny * 100;
    rafId.current = requestAnimationFrame(() => {
      if (bodyRef.current) {
        bodyRef.current.style.transition = "transform 0.08s ease-out, box-shadow 0.3s";
        bodyRef.current.style.transform  = `rotateX(${tx}deg) rotateY(${ty}deg)`;
      }
      if (rhRef.current) {
        rhRef.current.style.background = `
          radial-gradient(ellipse 80% 60% at ${mx}% ${my}%,
            rgba(220,220,240,0.55) 0%, rgba(180,180,210,0.25) 30%, transparent 60%),
          linear-gradient(${105 + ty * 2}deg,
            transparent 20%, rgba(200,200,230,0.18) 35%,
            rgba(255,255,255,0.28) 45%, rgba(200,200,230,0.18) 55%, transparent 70%)`;
      }
      if (hRef1.current) {
        hRef1.current.style.background = isGold
          ? `radial-gradient(ellipse 90% 70% at ${mx}% ${my}%, rgba(255,220,80,0.6) 0%, rgba(255,180,30,0.45) 20%, rgba(220,140,0,0.35) 45%, rgba(255,200,80,0.2) 65%, transparent 90%)`
          : `radial-gradient(ellipse 90% 70% at ${mx}% ${my}%, rgba(255,100,100,0.5) 0%, rgba(255,200,50,0.4) 15%, rgba(80,255,120,0.4) 30%, rgba(50,180,255,0.4) 45%, rgba(180,80,255,0.4) 60%, rgba(255,80,200,0.35) 75%, transparent 90%)`;
      }
      if (hRef2.current) {
        hRef2.current.style.background = isGold
          ? `linear-gradient(${120 + ty * 3}deg, transparent 0%, rgba(255,200,50,0.2) 25%, rgba(255,160,0,0.25) 45%, rgba(255,220,80,0.2) 65%, transparent 85%)`
          : `linear-gradient(${120 + ty * 3}deg, transparent 0%, rgba(255,100,150,0.15) 20%, rgba(80,200,255,0.2) 35%, rgba(200,80,255,0.15) 50%, rgba(255,200,80,0.15) 65%, transparent 80%)`;
      }
      if (glRef.current) {
        glRef.current.style.background = `linear-gradient(${110 + ty}deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)`;
      }
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(rafId.current);
    rectRef.current = null;
    if (bodyRef.current) {
      bodyRef.current.style.transition = "transform 0.6s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.3s";
      bodyRef.current.style.transform  = "rotateX(0deg) rotateY(0deg)";
    }
    if (rhRef.current) {
      rhRef.current.style.background = `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(220,220,240,0.3) 0%, transparent 60%), linear-gradient(105deg, transparent 20%, rgba(200,200,230,0.1) 45%, transparent 70%)`;
    }
    if (hRef1.current) {
      hRef1.current.style.background = isGold
        ? `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,220,80,0.35) 0%, rgba(255,160,0,0.2) 50%, transparent 90%)`
        : `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,100,100,0.2) 0%, rgba(80,255,120,0.15) 50%, transparent 90%)`;
    }
  };

  return (
    <div
      ref={wrapRef}
      style={{ width: "100%", aspectRatio: "2/3", position: "relative", perspective: "700px", cursor: "pointer" }}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <div ref={bodyRef} style={{
        position: "absolute", inset: 0, borderRadius: "8px", overflow: "hidden",
        transform: "rotateX(0deg) rotateY(0deg)",
        transition: "transform 0.6s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.3s",
        willChange: "transform", boxShadow: shadowStyle,
      }}>
        <Image src={card.image} alt={card.name} fill style={{ objectFit: "cover" }} sizes="(max-width:639px) 44vw, (max-width:1023px) 28vw, 14vw" loading="lazy" />

        {/* Reverse holo shimmer */}
        {isRH && (
          <div ref={rhRef} style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
            background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(220,220,240,0.3) 0%, transparent 60%)`,
          }} />
        )}

        {/* Holo / gold layer 1 */}
        {(isH || isGold) && (
          <div ref={hRef1} style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "color-dodge",
            background: isGold
              ? `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,220,80,0.35) 0%, rgba(255,160,0,0.2) 50%, transparent 90%)`
              : `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,100,100,0.2) 0%, rgba(80,255,120,0.15) 50%, transparent 90%)`,
            animation: isGold ? "inv-goldShift 4s ease-in-out infinite" : "inv-holoShift 4s ease-in-out infinite",
          }} />
        )}

        {/* Holo / gold layer 2 */}
        {(isH || isGold) && (
          <div ref={hRef2} style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
            background: isGold
              ? `linear-gradient(120deg, transparent 0%, rgba(255,200,50,0.15) 35%, transparent 70%)`
              : `linear-gradient(120deg, transparent 0%, rgba(255,100,150,0.1) 35%, transparent 70%)`,
          }} />
        )}

        {/* Cosmos Holo: rainbow + estrellas */}
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

        {/* Gloss reflection */}
        <div ref={glRef} style={{
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
function SellPopup({ card, setId, userId, onPublished, onClose }: {
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

/* ── Main page ───────────────────────────────────────────────── */
export default function InventarioPage() {
  const supabase = createClient();

  const [userId,        setUserId]        = useState<string | null>(null);
  const [inventory,     setInventory]     = useState<InventoryMap>({});
  const [featuredCards, setFeaturedCards] = useState<FeaturedCard[]>([]);
  const [wishlistCards, setWishlistCards] = useState<WishlistCard[]>([]);
  const [listings,      setListings]      = useState<UserListing[]>([]);

  const [sets,        setSets]        = useState<{ setId: string; count: number }[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [loadingSet,  setLoadingSet]  = useState<string | null>(null);
  const [setCards,    setSetCards]    = useState<Record<string, PokemonCard[]>>({});

  const [modalCard,      setModalCard]      = useState<{ card: PokemonCard; setId: string } | null>(null);
  const [sellTarget,     setSellTarget]     = useState<{ card: PokemonCard; setId: string } | null>(null);
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [buscarOpen,     setBuscarOpen]     = useState(false);

  const userIdRef = useRef<string | null>(null);

  async function loadData(uid: string) {
    const [invRes, featRes, wishRes, listRes] = await Promise.all([
      supabase.from("card_inventory").select("card_id, set_id, version, quantity").eq("user_id", uid).gt("quantity", 0),
      supabase.from("featured_cards").select("card_id, set_id").eq("user_id", uid),
      supabase.from("card_wishlist").select("card_id, set_id").eq("user_id", uid),
      supabase.from("market_listings").select("id, card_id, set_id, price_cop, version").eq("user_id", uid).eq("status", "active"),
    ]);
    const invMap: InventoryMap = {};
    const setMap: Record<string, number> = {};
    for (const row of (invRes.data ?? [])) {
      invMap[invKey(row.card_id, row.version ?? "normal")] = row.quantity;
      if (row.set_id) setMap[row.set_id] = (setMap[row.set_id] ?? 0) + 1;
    }
    setInventory(invMap);
    setFeaturedCards((featRes.data ?? []) as FeaturedCard[]);
    setWishlistCards((wishRes.data ?? []) as WishlistCard[]);
    setListings((listRes.data ?? []) as UserListing[]);
    setSets(Object.entries(setMap).map(([setId, count]) => ({ setId, count })).sort((a, b) => b.count - a.count));
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      userIdRef.current = user.id;
      await loadData(user.id);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleSet(setId: string) {
    if (expanded === setId) { setExpanded(null); return; }
    setExpanded(setId);
    if (setCards[setId]) return;
    setLoadingSet(setId);
    await loadManySets([setId]);
    setSetCards(prev => ({ ...prev, [setId]: SET_CARDS[setId] ?? [] }));
    setLoadingSet(null);
  }

  async function toggleFeatured(card: PokemonCard, setId: string) {
    if (!userId) return;
    const isFeat = featuredCards.some(f => Number(f.card_id) === card.card_number && f.set_id === setId);
    if (isFeat) {
      await supabase.from("featured_cards").delete().eq("user_id", userId).eq("card_id", card.card_number).eq("set_id", setId);
      setFeaturedCards(prev => prev.filter(f => !(Number(f.card_id) === card.card_number && f.set_id === setId)));
    } else {
      if (featuredCards.length >= 10) return;
      await supabase.from("featured_cards").insert({ user_id: userId, card_id: card.card_number, set_id: setId });
      setFeaturedCards(prev => [...prev, { card_id: card.card_number, set_id: setId }]);
    }
  }

  async function toggleWishlist(card: PokemonCard, setId: string) {
    if (!userId) return;
    const isWanted = wishlistCards.some(w => w.card_id === card.id && w.set_id === setId);
    if (isWanted) {
      await supabase.from("card_wishlist").delete().eq("user_id", userId).eq("card_id", card.id).eq("set_id", setId);
      setWishlistCards(prev => prev.filter(w => !(w.card_id === card.id && w.set_id === setId)));
    } else {
      await supabase.from("card_wishlist").insert({ user_id: userId, card_id: card.id, set_id: setId });
      setWishlistCards(prev => [...prev, { card_id: card.id, set_id: setId }]);
    }
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        .inv-header { padding: 24px 20px 0; }
        @media (min-width: 768px) { .inv-header { padding: 48px 48px 0; } }
        .inv-body { padding: 0 20px 60px; }
        @media (min-width: 768px) { .inv-body { padding: 0 48px 80px; } }

        .inv-card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        @media (min-width: 640px)  { .inv-card-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1280px) { .inv-card-grid { grid-template-columns: repeat(6, 1fr); } }

        .inv-act-row {
          display: flex; align-items: center; gap: 2px;
          flex-wrap: nowrap; justify-content: center; overflow: hidden;
        }
        .inv-act-btn {
          background: none; border: none; cursor: pointer; padding: 0;
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 6px;
          transition: background 0.15s; flex-shrink: 0;
        }
        .inv-act-btn:hover { background: rgba(255,255,255,0.08); }
        .inv-act-btn.active { background: rgba(46,230,193,0.15); }
        .inv-act-icon { width: 14px; height: 14px; }
        @media (min-width: 640px) {
          .inv-act-row { gap: 3px; }
          .inv-act-btn { width: 34px; height: 34px; border-radius: 7px; }
          .inv-act-icon { width: 18px; height: 18px; }
        }
        @media (min-width: 1280px) {
          .inv-act-row { gap: 4px; }
          .inv-act-btn { width: 40px; height: 40px; border-radius: 8px; }
          .inv-act-icon { width: 22px; height: 22px; }
        }

        @keyframes inv-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
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
          0%,100% { opacity: 0;   transform: translate(-50%,-50%) scale(0.2) rotate(0deg); }
          50%     { opacity: 0.95; transform: translate(-50%,-50%) scale(1.1) rotate(20deg); }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="inv-header">
        <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
          Mi Colección
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "36px", color: INK0, margin: "0 0 24px" }}>Inventario</h1>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "36px" }}>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "11px 22px", borderRadius: "10px", background: COURT, color: "#05070d",
              fontFamily: MONO, fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", border: "none", cursor: "pointer", transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <Plus size={14} strokeWidth={2.5} />
            Agregar al inventario
          </button>
          <button
            onClick={() => setBuscarOpen(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "11px 22px", borderRadius: "10px",
              background: "rgba(46,230,193,0.08)", color: COURT,
              border: "1px solid rgba(46,230,193,0.25)",
              fontFamily: MONO, fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em",
              textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(46,230,193,0.14)"; e.currentTarget.style.borderColor = "rgba(46,230,193,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(46,230,193,0.08)"; e.currentTarget.style.borderColor = "rgba(46,230,193,0.25)"; }}
          >
            <Search size={14} strokeWidth={2} />
            Buscar carta
          </button>
        </div>
      </div>

      {/* ── Sets list ── */}
      <div className="inv-body">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 72, borderRadius: "12px", background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)", backgroundSize: "200% 100%", animation: "inv-shimmer 1.4s ease-in-out infinite" }} />
            ))}
          </div>
        ) : sets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: INK2 }}>
            <p style={{ fontFamily: MONO, fontSize: "13px", marginBottom: "16px" }}>Tu colección está vacía.</p>
            <Link href="/dashboard/inventario/agregar" style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: COURT, textDecoration: "none" }}>
              Agregar tu primera carta →
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: INK2, marginBottom: "8px" }}>
              {sets.length} {sets.length === 1 ? "set" : "sets"} · {Object.values(inventory).reduce((a, b) => a + b, 0)} cartas
            </p>

            {sets.map(({ setId, count }) => {
              const isOpen = expanded === setId;
              const isLoadingThis = loadingSet === setId;
              const loadedCards = setCards[setId] ?? [];
              const userCards = isOpen && loadedCards.length > 0
                ? loadedCards.filter(c => (inventory[invKey(c.id, c.version)] ?? 0) > 0)
                : [];

              return (
                <div key={setId} style={{ borderRadius: "12px", overflow: "hidden", border: `1px solid ${isOpen ? "rgba(46,230,193,0.25)" : "rgba(255,255,255,0.07)"}`, transition: "border-color 0.2s" }}>

                  {/* Set row button */}
                  <button onClick={() => toggleSet(setId)} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "14px",
                    padding: "14px 18px",
                    background: isOpen ? "rgba(46,230,193,0.06)" : "rgba(255,255,255,0.02)",
                    border: "none", cursor: "pointer", transition: "background 0.15s",
                  }}>
                    {SET_LOGO[setId]
                      ? <img src={SET_LOGO[setId]} alt={setId} style={{ width: 56, height: 40, objectFit: "contain", flexShrink: 0 }} />
                      : <div style={{ width: 56, height: 40, flexShrink: 0 }} />
                    }
                    <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: INK2, margin: "0 0 3px" }}>{setId}</p>
                      <p style={{ fontFamily: MONO, fontSize: "15px", color: isOpen ? COURT : INK0, fontWeight: 700, margin: 0 }}>
                        {count} {count === 1 ? "carta" : "cartas"}
                      </p>
                    </div>
                    {isOpen ? <ChevronUp size={18} color={COURT} /> : <ChevronDown size={18} color={INK2} />}
                  </button>

                  {/* Expanded card grid */}
                  {isOpen && (
                    <div style={{ padding: "18px 18px 24px", background: "rgba(0,0,0,0.15)" }}>
                      {isLoadingThis ? (
                        <div className="inv-card-grid">
                          {Array.from({ length: count }).map((_, i) => (
                            <div key={i} style={{ aspectRatio: "2/3", borderRadius: "8px", background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%)", backgroundSize: "200% 100%", animation: "inv-shimmer 1.4s ease-in-out infinite" }} />
                          ))}
                        </div>
                      ) : (
                        <div className="inv-card-grid">
                          {userCards.map(card => {
                            const isFeat   = featuredCards.some(f => Number(f.card_id) === card.card_number && f.set_id === setId);
                            const isWanted = wishlistCards.some(w => w.card_id === card.id && w.set_id === setId);
                            const isListed = listings.some(l => String(l.card_id) === String(card.card_number) && l.set_id === setId && l.version === card.version);

                            return (
                              <div key={`${card.id}-${card.version}`} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

                                {/* Card with 3D tilt + overlays container */}
                                <div style={{ position: "relative" }}>
                                  <InvTiltCard card={card} onClick={() => setModalCard({ card, setId })} />

                                  {/* Badge "En venta" */}
                                  {isListed && (
                                    <div title="En venta" style={{
                                      position: "absolute", top: 8, right: 8,
                                      width: 33, height: 33, borderRadius: "50%",
                                      background: "rgba(5,7,13,0.85)",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      animation: "inv-salePulse 2s ease-in-out infinite",
                                      zIndex: 10, pointerEvents: "none",
                                    }}>
                                      <BadgeDollarSign size={20} color="#d6ff3d" strokeWidth={1.8} />
                                    </div>
                                  )}
                                </div>

                                {/* Action buttons */}
                                {userId && (
                                  <div className="inv-act-row">
                                    {/* TCGPlayer */}
                                    <button className="inv-act-btn" onClick={() => openTCG(card)} title="Ver en TCGPlayer">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src="https://www.tcgplayer.com/favicon.ico" alt="TCG" className="inv-act-icon" />
                                    </button>

                                    {/* Destacar */}
                                    <button
                                      className={`inv-act-btn${isFeat ? " active" : ""}`}
                                      onClick={() => toggleFeatured(card, setId)}
                                      title={isFeat ? "Quitar de destacadas" : "Destacar en perfil"}
                                    >
                                      <span className="inv-act-icon" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
                                        <Star size="100%" color={isFeat ? COURT : INK2} strokeWidth={isFeat ? 2.2 : 1.7} fill={isFeat ? COURT : "none"} />
                                      </span>
                                    </button>

                                    {/* Vender */}
                                    <button
                                      className={`inv-act-btn${isListed ? " active" : ""}`}
                                      onClick={() => setSellTarget({ card, setId })}
                                      title="Poner en venta"
                                    >
                                      <span className="inv-act-icon" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
                                        <BadgeDollarSign size="100%" color={isListed ? "#d6ff3d" : INK2} strokeWidth={1.8} />
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CardDetailModal */}
      {modalCard && userId && (
        <CardDetailModal
          card={modalCard.card} setId={modalCard.setId} userId={userId}
          inventory={inventory}
          onInventoryChange={(key, qty) => setInventory(prev => ({ ...prev, [key]: qty }))}
          featuredCards={featuredCards} onFeaturedChange={setFeaturedCards}
          wishlistCards={wishlistCards} onWishlistChange={setWishlistCards}
          userListings={listings} onListingsChange={setListings}
          onClose={() => setModalCard(null)}
        />
      )}

      {/* Sell popup */}
      {sellTarget && userId && (
        <SellPopup
          card={sellTarget.card} setId={sellTarget.setId} userId={userId}
          onPublished={listing => setListings(prev => [...prev, listing])}
          onClose={() => setSellTarget(null)}
        />
      )}

      {/* Agregar drawer */}
      {drawerOpen && userId && (
        <AgregarDrawer
          userId={userId}
          onClose={() => { setDrawerOpen(false); if (userIdRef.current) loadData(userIdRef.current); }}
        />
      )}

      {/* Buscar carta drawer */}
      {buscarOpen && userId && (
        <BuscarCartaDrawer
          userId={userId}
          onClose={() => setBuscarOpen(false)}
        />
      )}
    </div>
  );
}
