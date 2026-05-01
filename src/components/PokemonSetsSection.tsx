"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES, type PokemonSet } from "@/data/pokemon-sets";
import { VERSION_LABEL, SET_CARD_COUNT, type PokemonCard, type CardVersion } from "@/data/pokemon-cards-meta";
import {
  COURT, INK0, INK2, BG0, MONO, DISP,
  VERSION_COLOR, VERSION_FULL,
  QtyControl, CardDetailModal, invKey,
  type InventoryMap, type FeaturedCard, type WishlistCard, type UserListing,
} from "@/components/CardDetailModal";

/* Lazy-load card data only when a set is opened */
async function fetchSetCards(setId: string): Promise<PokemonCard[]> {
  const mod = await import("@/data/pokemon-cards");
  return mod.SET_CARDS[setId] ?? [];
}


/* ── Card image with 3D tilt (reusable) ─────────────────────── */
function TiltCard({
  card, userId, setId, inventory, onInventoryChange, onCardClick,
}: {
  card: PokemonCard;
  userId?: string;
  setId: string;
  inventory: InventoryMap;
  onInventoryChange: (key: string, qty: number) => void;
  onCardClick?: () => void;
}) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const bodyRef  = useRef<HTMLDivElement>(null);
  const rhRef    = useRef<HTMLDivElement>(null);
  const hRef1    = useRef<HTMLDivElement>(null);
  const hRef2    = useRef<HTMLDivElement>(null);
  const glRef    = useRef<HTMLDivElement>(null);
  const rectRef  = useRef<DOMRect | null>(null);
  const rafId    = useRef(0);
  const [hovered, setHovered] = useState(false);

  const qty = inventory[invKey(card.id, card.version)] ?? 0;

  const label = VERSION_LABEL[card.version];
  const labelColor = VERSION_COLOR[label] ?? INK2;
  const isH  = label === "H";
  const isRH = label !== "N" && label !== "H";
  const isGray = userId ? (qty === 0 && !hovered) : false;

  const onEnter = () => {
    rectRef.current = wrapRef.current?.getBoundingClientRect() ?? null;
    setHovered(true);
  };

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    cancelAnimationFrame(rafId.current);
    const r = rectRef.current; if (!r) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    rafId.current = requestAnimationFrame(() => {
      const nx = (clientX - r.left) / r.width;
      const ny = (clientY - r.top)  / r.height;
      const tx = (-(ny - 0.5)) * 24;
      const ty = ((nx - 0.5)) * 24;
      const mx = nx * 100;
      const my = ny * 100;

      if (bodyRef.current) {
        bodyRef.current.style.transition = "transform 0.08s ease-out, filter 0.3s ease";
        bodyRef.current.style.transform  = `rotateX(${tx}deg) rotateY(${ty}deg)`;
      }
      if (rhRef.current) {
        rhRef.current.style.background = `
          radial-gradient(ellipse 80% 60% at ${mx}% ${my}%,
            rgba(220,220,240,0.55) 0%, rgba(180,180,210,0.25) 30%, transparent 60%),
          linear-gradient(${105 + ty * 2}deg,
            transparent 20%, rgba(200,200,230,0.18) 35%, rgba(255,255,255,0.28) 45%,
            rgba(200,200,230,0.18) 55%, transparent 70%)`;
      }
      if (hRef1.current) {
        hRef1.current.style.background = `
          radial-gradient(ellipse 90% 70% at ${mx}% ${my}%,
            rgba(255,100,100,0.5) 0%, rgba(255,200,50,0.4) 15%,
            rgba(80,255,120,0.4) 30%, rgba(50,180,255,0.4) 45%,
            rgba(180,80,255,0.4) 60%, rgba(255,80,200,0.35) 75%, transparent 90%)`;
      }
      if (hRef2.current) {
        hRef2.current.style.background = `linear-gradient(${120 + ty * 3}deg,
          transparent 0%, rgba(255,100,150,0.15) 20%, rgba(80,200,255,0.2) 35%,
          rgba(200,80,255,0.15) 50%, rgba(255,200,80,0.15) 65%, transparent 80%)`;
      }
      if (glRef.current) {
        glRef.current.style.background = `linear-gradient(${110 + ty}deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)`;
      }
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(rafId.current);
    rectRef.current = null;
    setHovered(false);
    if (bodyRef.current) {
      bodyRef.current.style.transition = "transform 0.6s cubic-bezier(0.2,0.8,0.2,1), filter 0.3s ease";
      bodyRef.current.style.transform  = "rotateX(0deg) rotateY(0deg)";
    }
    if (rhRef.current) {
      rhRef.current.style.background = `
        radial-gradient(ellipse 80% 60% at 50% 50%,
          rgba(220,220,240,0.3) 0%, rgba(180,180,210,0.1) 30%, transparent 60%),
        linear-gradient(105deg, transparent 20%, rgba(200,200,230,0.1) 45%, transparent 70%)`;
    }
    if (hRef1.current) {
      hRef1.current.style.background = `
        radial-gradient(ellipse 90% 70% at 50% 50%,
          rgba(255,100,100,0.2) 0%, rgba(255,200,50,0.15) 25%,
          rgba(80,255,120,0.15) 50%, transparent 90%)`;
    }
  };

  const shadowStyle = isGray
    ? "0 8px 24px rgba(0,0,0,0.5)"
    : isH
    ? "0 16px 48px rgba(255,160,80,0.35), 0 4px 16px rgba(0,0,0,0.6)"
    : isRH
    ? "0 16px 48px rgba(180,180,220,0.25), 0 4px 16px rgba(0,0,0,0.6)"
    : "0 12px 40px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.4)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>

      {/* Card with 3D tilt */}
      <div
        ref={wrapRef}
        className="tcg-card-wrap"
        style={{ perspective: "800px", cursor: "pointer", position: "relative" }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onMouseEnter={onEnter}
        onClick={onCardClick}
        title={VERSION_FULL[label] ?? label}
      >
        <div ref={bodyRef} className="tcg-card-body" style={{
          borderRadius: "12px",
          overflow: "hidden",
          position: "relative",
          transform: "rotateX(0deg) rotateY(0deg)",
          transition: "transform 0.6s cubic-bezier(0.2,0.8,0.2,1), filter 0.3s ease",
          willChange: "transform",
          filter: isGray ? "grayscale(1) opacity(0.9)" : "none",
          boxShadow: shadowStyle,
        }}>
          <Image
            src={card.image}
            alt={card.name}
            fill
            style={{ objectFit: "cover" }}
            sizes="(max-width: 767px) 45vw, 240px"
            loading="lazy"
            unoptimized
          />

          {isRH && !isGray && (
            <div ref={rhRef} style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(220,220,240,0.3) 0%, transparent 60%)`,
              mixBlendMode: "screen",
            }} />
          )}

          {isH && !isGray && (
            <div ref={hRef1} style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,100,100,0.2) 0%, rgba(80,255,120,0.15) 50%, transparent 90%)`,
              mixBlendMode: "color-dodge",
              animation: "holoShift 4s ease-in-out infinite",
            }} />
          )}

          {isH && !isGray && (
            <div ref={hRef2} style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `linear-gradient(120deg, transparent 0%, rgba(255,100,150,0.1) 35%, transparent 70%)`,
              mixBlendMode: "screen",
            }} />
          )}

          {!isGray && (
            <div ref={glRef} style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)`,
              mixBlendMode: "screen",
            }} />
          )}
          <div style={{
            position: "absolute", bottom: "10px", right: "10px", zIndex: 10,
            fontFamily: MONO, fontSize: "10px", letterSpacing: "0.12em",
            color: labelColor, border: `1px solid ${labelColor}60`,
            borderRadius: "5px", padding: "3px 8px",
            background: "rgba(5,7,13,0.82)", backdropFilter: "blur(4px)",
            pointerEvents: "none",
          }}>
            {VERSION_FULL[label] ?? label}
          </div>
        </div>
      </div>

      <span style={{
        fontFamily: MONO, fontSize: "12px", letterSpacing: "0.06em",
        color: INK0, textAlign: "center", lineHeight: 1.3, maxWidth: "100%",
      }}>
        #{String(card.card_number).padStart(3, "0")} {card.name}
      </span>

      {userId && (
        <QtyControl
          cardId={card.id} setId={setId} version={card.version} qty={qty}
          userId={userId} onChange={onInventoryChange}
        />
      )}
    </div>
  );
}

/* ── Thumb base ────────────────────────────────────────────── */
function Thumb({
  imgSrc, imgW, imgH, label, sublabel, isOpen, isGray, onClick, badgeText, showPronto,
}: {
  imgSrc: string; imgW: number; imgH: number;
  label: string; sublabel?: string;
  isOpen: boolean; isGray?: boolean;
  onClick: () => void; badgeText?: string; showPronto?: boolean;
}) {
  const clickable = !isGray;
  return (
    <button
      onClick={onClick}
      className="pks-thumb"
      style={{
        background: isOpen ? "rgba(46,230,193,0.08)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isOpen ? `${COURT}55` : "rgba(255,255,255,0.07)"}`,
        cursor: clickable ? "pointer" : "default",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
        padding: "18px 14px", borderRadius: "14px",
        transition: "background 0.2s, border-color 0.2s",
        outline: "none", width: "158px", minWidth: "158px",
      }}
      onMouseEnter={e => {
        if (clickable && !isOpen) (e.currentTarget as HTMLButtonElement).style.background = "rgba(46,230,193,0.05)";
      }}
      onMouseLeave={e => {
        if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.02)";
      }}
    >
      <div style={{
        position: "relative", width: `${imgW}px`, height: `${imgH}px`, flexShrink: 0,
        filter: isGray ? "grayscale(1) opacity(0.9)" : "none",
        transition: "filter 0.3s",
      }}>
        <Image src={imgSrc} alt={label} fill style={{ objectFit: "contain" }} loading="lazy" sizes="130px" />
        {showPronto && (
          <div style={{
            position: "absolute", top: "-6px", right: "-6px",
            fontFamily: MONO, fontSize: "8px", letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#fff",
            background: "#e03535", borderRadius: "4px",
            padding: "2px 6px", pointerEvents: "none",
            boxShadow: "0 2px 6px rgba(224,53,53,0.5)",
          }}>
            Pronto
          </div>
        )}
      </div>
      <span style={{
        fontFamily: MONO, fontSize: "10px", letterSpacing: "0.08em",
        color: isGray ? INK2 : INK0, textAlign: "center", lineHeight: 1.4,
        maxWidth: "130px",
      }}>
        {label}
      </span>
      {sublabel && !isGray && (
        <span style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em", color: INK2 }}>
          {sublabel}
        </span>
      )}
      {badgeText && !isGray && (
        <span style={{
          fontFamily: MONO, fontSize: "9px", letterSpacing: "0.12em",
          color: COURT, textTransform: "uppercase",
        }}>
          {badgeText}
        </span>
      )}
    </button>
  );
}

/* ── Sub-label helper ──────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: MONO, fontSize: "11px", letterSpacing: "0.2em",
      textTransform: "uppercase", color: COURT, marginBottom: "20px",
      display: "flex", alignItems: "center", gap: "10px",
    }}>
      <span style={{ width: "16px", height: "1px", background: COURT, display: "inline-block" }} />
      {children}
    </div>
  );
}

/* ── Progress bar ──────────────────────────────────────────── */
function SetProgress({ cards, inventory }: { cards: PokemonCard[]; inventory: InventoryMap }) {
  if (!cards.length) return null;
  const total    = cards.length;
  const unique   = cards.filter(c => (inventory[c.id] ?? 0) > 0).length;
  const totalQty = cards.reduce((s, c) => s + (inventory[c.id] ?? 0), 0);
  const pct = total > 0 ? Math.round((unique / total) * 100) : 0;

  return (
    <div style={{ marginBottom: "32px", padding: "20px 24px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: INK2 }}>
          Progreso Master Set
        </span>
        <div style={{ display: "flex", gap: "24px" }}>
          <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", color: COURT }}>{unique}/{total} únicas</span>
          <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", color: INK2 }}>{totalQty} total</span>
          <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", color: INK0 }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${COURT}, #4ff0ff)`,
          borderRadius: "2px", transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

/* ── Main section ───────────────────────────────────────────── */
type CardFilter = "todas" | "tengo" | "faltan" | "normal" | "holofoil" | "reverseHolofoil";

const FILTERS: { id: CardFilter; label: string; authOnly?: boolean }[] = [
  { id: "todas",           label: "Todas" },
  { id: "tengo",           label: "Cartas en inventario", authOnly: true },
  { id: "faltan",          label: "Cartas restantes",     authOnly: true },
  { id: "normal",          label: "Normales" },
  { id: "reverseHolofoil", label: "Reverse Holo" },
  { id: "holofoil",        label: "Holofoil" },
];

/* ── Breadcrumb ─────────────────────────────────────────────── */
function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      fontFamily: MONO, fontSize: "11px", letterSpacing: "0.12em",
      marginBottom: "28px", flexWrap: "wrap",
    }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {i > 0 && <span style={{ color: INK2 }}>›</span>}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: COURT, fontFamily: MONO, fontSize: "11px",
                letterSpacing: "0.12em", textTransform: "uppercase", padding: 0,
                textDecoration: "underline", textDecorationColor: `${COURT}55`,
                textUnderlineOffset: "3px",
              }}
            >
              {item.label}
            </button>
          ) : (
            <span style={{ color: INK0, textTransform: "uppercase" }}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

type DrillView = "series" | "sets" | "cards";

/* Cache loaded card arrays in memory so re-opening a set is instant */
const cardCache: Record<string, PokemonCard[]> = {};

export function PokemonSetsSection({ userId }: { userId?: string }) {
  const [view,         setView]        = useState<DrillView>("series");
  const [openSeriesId, setOpenSeriesId] = useState<string | null>(null);
  const [openSetId,    setOpenSetId]    = useState<string | null>(null);
  const [setCards,     setSetCards]     = useState<PokemonCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [inventory,    setInventory]    = useState<InventoryMap>({});
  const [loadingInv,   setLoadingInv]   = useState(false);
  const [activeFilter, setActiveFilter] = useState<CardFilter>("todas");
  const [selectedCard, setSelectedCard] = useState<{ card: PokemonCard; setId: string } | null>(null);
  const [featuredCards, setFeaturedCards] = useState<FeaturedCard[]>([]);
  const [wishlistCards, setWishlistCards] = useState<WishlistCard[]>([]);
  const [userListings,  setUserListings]  = useState<UserListing[]>([]);

  const openSeries = POKEMON_SERIES.find(s => s.id === openSeriesId);
  const openSet    = openSeries?.sets.find(s => s.id === openSetId);

  useEffect(() => { setActiveFilter("todas"); }, [openSetId]);

  /* Fetch featured cards and active listings for logged-in user */
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("featured_cards")
      .select("card_id, set_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) setFeaturedCards(data as FeaturedCard[]);
      });
    supabase
      .from("card_wishlist")
      .select("card_id, set_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) setWishlistCards(data as WishlistCard[]);
      });
    supabase
      .from("market_listings")
      .select("id, card_id, set_id, price_cop, version")
      .eq("user_id", userId)
      .eq("status", "active")
      .then(({ data }) => {
        if (data) setUserListings(data as UserListing[]);
      });
  }, [userId]);

  /* Lazy-load card data when a set is opened */
  useEffect(() => {
    if (!openSetId) return;
    if (cardCache[openSetId]) { setSetCards(cardCache[openSetId]); return; }
    setLoadingCards(true);
    fetchSetCards(openSetId).then(cards => {
      cardCache[openSetId] = cards;
      setSetCards(cards);
      setLoadingCards(false);
    });
  }, [openSetId]);

  useEffect(() => {
    if (!userId || !openSetId) return;
    setLoadingInv(true);
    const supabase = createClient();
    supabase
      .from("card_inventory")
      .select("card_id, version, quantity")
      .eq("user_id", userId)
      .eq("set_id", openSetId)
      .then(({ data }) => {
        if (data) {
          const map: InventoryMap = {};
          data.forEach(r => { map[invKey(r.card_id, r.version ?? "normal")] = r.quantity; });
          setInventory(prev => ({ ...prev, ...map }));
        }
        setLoadingInv(false);
      });
  }, [userId, openSetId]);

  const handleInventoryChange = useCallback((key: string, qty: number) => {
    setInventory(prev => ({ ...prev, [key]: qty }));
  }, []);

  function goToSeries() {
    setView("series");
    setOpenSeriesId(null);
    setOpenSetId(null);
  }

  function goToSets(seriesId: string) {
    setOpenSeriesId(seriesId);
    setOpenSetId(null);
    setView("sets");
  }

  function goToCards(setId: string) {
    setOpenSetId(setId);
    setView("cards");
  }

  return (
    <section style={{ background: BG0, padding: "0 0 80px" }}>
      {/* Header */}
      <div className="pks-header" style={{ padding: "64px 80px 48px" }}>
        <div style={{
          fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em",
          textTransform: "uppercase", color: COURT,
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
        }}>
          <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
          Colección
        </div>
        <h2 style={{
          fontFamily: DISP, fontSize: "clamp(28px, 3vw, 42px)",
          letterSpacing: "-0.02em", margin: 0, color: INK0,
        }}>
          Pokémon TCG Sets
        </h2>
        <p style={{
          fontFamily: MONO, fontSize: "12px", letterSpacing: "0.1em",
          color: INK2, marginTop: "10px", textTransform: "uppercase",
        }}>
          {POKEMON_SERIES.length} series · {POKEMON_SERIES.reduce((a, s) => a + s.sets.length, 0)} sets
        </p>
      </div>

      <div className="pks-body" style={{ padding: "0 80px" }}>

        {/* ── VISTA: Series ── */}
        {view === "series" && (
          <>
            <SectionLabel>Series</SectionLabel>
            <div className="pks-thumbs" style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "40px" }}>
              {POKEMON_SERIES.map(series => (
                <Thumb
                  key={series.id}
                  imgSrc={series.icon}
                  imgW={110} imgH={50}
                  label={series.name}
                  sublabel={`${series.sets.length} sets`}
                  isOpen={false}
                  onClick={() => goToSets(series.id)}
                />
              ))}
            </div>
          </>
        )}

        {/* ── VISTA: Sets ── */}
        {view === "sets" && openSeries && (
          <>
            <Breadcrumb items={[
              { label: "Series", onClick: goToSeries },
              { label: openSeries.name },
            ]} />
            <SectionLabel>{openSeries.name} — {openSeries.sets.length} sets</SectionLabel>
            <div className="pks-thumbs" style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "40px" }}>
              {openSeries.sets.map(set => {
                const cardCount = SET_CARD_COUNT[set.id] ?? 0;
                return (
                  <Thumb
                    key={set.id}
                    imgSrc={set.logo}
                    imgW={120} imgH={56}
                    label={set.name}
                    isOpen={false}
                    isGray={!cardCount}
                    badgeText={cardCount ? `${cardCount} cartas` : undefined}
                    showPronto={!cardCount}
                    onClick={() => { if (cardCount) goToCards(set.id); }}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* ── VISTA: Cards ── */}
        {view === "cards" && openSet && (() => {
          const allCards = setCards;
          const visibleCards = allCards.filter(card => {
            if (activeFilter === "tengo")           return (inventory[invKey(card.id, card.version)] ?? 0) > 0;
            if (activeFilter === "faltan")          return (inventory[invKey(card.id, card.version)] ?? 0) === 0;
            if (activeFilter === "normal")          return card.version === "normal";
            if (activeFilter === "holofoil")        return card.version === "holofoil";
            if (activeFilter === "reverseHolofoil") return card.version === "reverseHolofoil";
            return true;
          });
          return (
            <>
              <Breadcrumb items={[
                { label: "Series", onClick: goToSeries },
                { label: openSeries!.name, onClick: () => goToSets(openSeries!.id) },
                { label: openSet.name },
              ]} />

              <SectionLabel>
                {openSet.name} — {allCards.length} cartas
                {(loadingCards || loadingInv) && <span style={{ color: INK2, fontSize: "10px", marginLeft: "8px" }}>cargando...</span>}
              </SectionLabel>

              {userId && <SetProgress cards={allCards} inventory={inventory} />}

              {/* Filter buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "28px" }}>
                {FILTERS.filter(f => !f.authOnly || userId).map(f => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    style={{
                      fontFamily: MONO, fontSize: "10px", letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: activeFilter === f.id ? BG0 : INK2,
                      background: activeFilter === f.id ? COURT : "rgba(255,255,255,0.04)",
                      border: `1px solid ${activeFilter === f.id ? COURT : "rgba(255,255,255,0.1)"}`,
                      borderRadius: "6px", padding: "5px 12px",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {f.label}
                    {f.id === "tengo"  && userId ? ` (${allCards.filter(c => (inventory[invKey(c.id, c.version)] ?? 0) > 0).length})` : ""}
                    {f.id === "faltan" && userId ? ` (${allCards.filter(c => (inventory[invKey(c.id, c.version)] ?? 0) === 0).length})` : ""}
                  </button>
                ))}
              </div>

              <div className="pks-cards-grid" style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 240px)",
                gap: "32px 24px",
                justifyContent: "center",
                width: "100%",
              }}>
                {visibleCards.map((card, i) => (
                  <TiltCard
                    key={`${card.id}-${card.version}-${i}`}
                    card={card}
                    userId={userId}
                    setId={openSet.id}
                    inventory={inventory}
                    onInventoryChange={handleInventoryChange}
                    onCardClick={() => setSelectedCard({ card, setId: openSet.id })}
                  />
                ))}
                {visibleCards.length === 0 && (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 0", color: INK2, fontFamily: MONO, fontSize: "12px", letterSpacing: "0.1em" }}>
                    No hay cartas en este filtro
                  </div>
                )}
              </div>
            </>
          );
        })()}

      </div>

      {/* Card detail modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard.card}
          setId={selectedCard.setId}
          userId={userId}
          inventory={inventory}
          onInventoryChange={handleInventoryChange}
          featuredCards={featuredCards}
          onFeaturedChange={setFeaturedCards}
          wishlistCards={wishlistCards}
          onWishlistChange={setWishlistCards}
          userListings={userListings}
          onListingsChange={setUserListings}
          onClose={() => setSelectedCard(null)}
        />
      )}

      <style>{`
        @keyframes holoShift {
          0%   { opacity: 0.7; filter: hue-rotate(0deg); }
          50%  { opacity: 1;   filter: hue-rotate(180deg); }
          100% { opacity: 0.7; filter: hue-rotate(360deg); }
        }
        .tcg-card-wrap { width: 240px; }
        .tcg-card-body { width: 240px; height: 336px; overflow: hidden; position: relative; }
        @media (max-width: 767px) {
          .pks-header { padding: 48px 12px 32px !important; }
          .pks-body   { padding: 0 12px !important; }
          .pks-cards-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 28px 10px !important;
            align-items: start !important;
          }
          .tcg-card-wrap { width: 100% !important; max-width: 100% !important; }
          .tcg-card-body { width: 100% !important; height: auto !important; aspect-ratio: 5 / 7 !important; }
          .pks-thumbs {
            justify-content: center !important;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .pks-thumb {
            width: 100% !important;
            min-width: unset !important;
            max-width: unset !important;
          }
        }
      `}</style>
    </section>
  );
}
