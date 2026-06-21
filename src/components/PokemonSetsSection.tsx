"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES, type PokemonSet } from "@/data/pokemon-sets";
import { VERSION_LABEL, getVersionLabel, getVersionEffect, getVersionColor, type PokemonCard, type CardVersion } from "@/data/pokemon-cards-meta";
import { SET_CARD_COUNT, loadSetCards } from "@/data/pokemon-cards";
import {
  COURT, INK0, INK2, BG0, MONO, DISP,
  VERSION_COLOR, VERSION_FULL,
  QtyControl, CardDetailModal, invKey,
  type InventoryMap, type FeaturedCard, type WishlistCard, type UserListing,
} from "@/components/CardDetailModal";

/* Lazy-load card data only when a set is opened */
async function fetchSetCards(setId: string): Promise<PokemonCard[]> {
  return loadSetCards(setId);
}


/* ── Card (sin efecto 3D, conserva holo/gold/RH en hover) ───── */
function TiltCard({
  card, userId, setId, inventory, onInventoryChange, onCardClick,
  wishlistCards, onWishlistChange,
}: {
  card: PokemonCard;
  userId?: string;
  setId: string;
  inventory: InventoryMap;
  onInventoryChange: (key: string, qty: number) => void;
  onCardClick?: () => void;
  wishlistCards: WishlistCard[];
  onWishlistChange: (cards: WishlistCard[]) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const qty = inventory[invKey(card.id, card.version)] ?? 0;

  const label = getVersionLabel(card.version);
  const effect = getVersionEffect(card.version);
  const isH    = effect === "holofoil";
  const isGold = effect === "goldBorder";
  const isRH   = effect === "reverseHolofoil" || effect === "metal";
  const labelColor = getVersionColor(card.version);
  const isGray = userId ? (qty === 0 && !hovered) : false;
  const isWanted = wishlistCards.some(w => w.card_id === card.id && w.set_id === setId);
  const [togglingWish, setTogglingWish] = useState(false);

  async function handleWishlistToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!userId || togglingWish) return;
    setTogglingWish(true);
    const supabase = createClient();
    if (isWanted) {
      await supabase.from("card_wishlist").delete().eq("user_id", userId).eq("card_id", card.id).eq("set_id", setId);
      onWishlistChange(wishlistCards.filter(w => !(w.card_id === card.id && w.set_id === setId)));
    } else {
      await supabase.from("card_wishlist").insert({ user_id: userId, card_id: card.id, set_id: setId });
      onWishlistChange([...wishlistCards, { card_id: card.id, set_id: setId }]);
    }
    setTogglingWish(false);
  }

  const shadowStyle = isGray
    ? "0 8px 24px rgba(0,0,0,0.5)"
    : isH
    ? "0 16px 48px rgba(255,160,80,0.35), 0 4px 16px rgba(0,0,0,0.6)"
    : isGold
    ? "0 16px 48px rgba(255,200,50,0.45), 0 4px 16px rgba(0,0,0,0.6)"
    : isRH
    ? "0 16px 48px rgba(180,180,220,0.25), 0 4px 16px rgba(0,0,0,0.6)"
    : "0 12px 40px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.4)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>

      <div
        className="tcg-card-wrap"
        style={{ cursor: "pointer", position: "relative" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onCardClick}
        title={VERSION_FULL[label] ?? label}
      >
        <div className="tcg-card-body" style={{
          borderRadius: "12px",
          overflow: "hidden",
          position: "relative",
          opacity: isGray ? 0.45 : 1,
          boxShadow: shadowStyle,
          transition: "opacity 0.3s ease",
        }}>
          <img src={card.image} alt={card.name} loading="lazy" style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />

          {hovered && isRH && !isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(220,220,240,0.3) 0%, transparent 60%), linear-gradient(105deg, transparent 20%, rgba(200,200,230,0.1) 45%, transparent 70%)`,
              mixBlendMode: "screen",
            }} />
          )}

          {hovered && (isH || isGold) && !isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: isGold
                ? `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,220,80,0.35) 0%, rgba(255,160,0,0.2) 50%, transparent 90%)`
                : `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,100,100,0.2) 0%, rgba(80,255,120,0.15) 50%, transparent 90%)`,
              mixBlendMode: "color-dodge",
              animation: isGold ? "goldShift 4s ease-in-out infinite" : "holoShift 4s ease-in-out infinite",
            }} />
          )}

          {hovered && (isH || isGold) && !isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: isGold
                ? `linear-gradient(120deg, transparent 0%, rgba(255,200,50,0.15) 35%, transparent 70%)`
                : `linear-gradient(120deg, transparent 0%, rgba(255,100,150,0.1) 35%, transparent 70%)`,
              mixBlendMode: "screen",
            }} />
          )}

          {hovered && !isGray && (
            <div style={{
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
            background: "rgba(5,7,13,0.88)",
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
        <>
          <QtyControl
            cardId={card.id} setId={setId} version={card.version} qty={qty}
            userId={userId} onChange={onInventoryChange}
          />
          <button
            type="button"
            onClick={handleWishlistToggle}
            disabled={togglingWish}
            title={isWanted ? "Quitar de wishlist" : "Agregar a wishlist"}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              fontFamily: MONO, fontSize: "10px", letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: isWanted ? "#e05580" : INK2,
              background: isWanted ? "rgba(224,85,128,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${isWanted ? "rgba(224,85,128,0.45)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "6px", padding: "5px 12px",
              cursor: togglingWish ? "wait" : "pointer",
              transition: "all 0.15s", width: "100%", justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "12px" }}>{isWanted ? "♥" : "♡"}</span>
            {isWanted ? "En wishlist" : "Wishlist"}
          </button>
        </>
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
      type="button"
      onClick={onClick}
      onTouchEnd={(e) => { if (clickable) { e.preventDefault(); onClick(); } }}
      className={`pks-thumb${isOpen ? " pks-thumb--open" : ""}${!clickable ? " pks-thumb--gray" : ""}`}
      style={{
        background: isOpen ? "rgba(46,230,193,0.08)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isOpen ? `${COURT}55` : "rgba(255,255,255,0.07)"}`,
        cursor: clickable ? "pointer" : "default",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
        padding: "18px 14px", borderRadius: "14px",
        transition: "background 0.2s, border-color 0.2s",
        outline: "none", width: "158px", minWidth: "158px",
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
  const unique   = cards.filter(c => (inventory[invKey(c.id, c.version)] ?? 0) > 0).length;
  const totalQty = cards.reduce((s, c) => s + (inventory[invKey(c.id, c.version)] ?? 0), 0);
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
type InvFilter = "todas" | "tengo" | "faltan";

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
              type="button"
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

const PAGE_SIZE = 40;

function InfiniteScrollSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisible(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);
  return <div ref={ref} style={{ height: "1px", marginTop: "40px" }} />;
}

export function PokemonSetsSection({ userId }: { userId?: string }) {
  const [view,         setView]        = useState<DrillView>("series");
  const [openSeriesId, setOpenSeriesId] = useState<string | null>(null);
  const [openSetId,    setOpenSetId]    = useState<string | null>(null);
  const [setCards,     setSetCards]     = useState<PokemonCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [inventory,    setInventory]    = useState<InventoryMap>({});
  const [loadingInv,   setLoadingInv]   = useState(false);
  const [invFilter,     setInvFilter]     = useState<InvFilter>("todas");
  const [versionFilter, setVersionFilter] = useState<string>("todas");
  const [visibleCount,  setVisibleCount]  = useState<number>(PAGE_SIZE);
  const [selectedCard, setSelectedCard] = useState<{ card: PokemonCard; setId: string } | null>(null);
  const [featuredCards, setFeaturedCards] = useState<FeaturedCard[]>([]);
  const [wishlistCards, setWishlistCards] = useState<WishlistCard[]>([]);
  const [userListings,  setUserListings]  = useState<UserListing[]>([]);
  const [addingWish,    setAddingWish]    = useState<"idle" | "loading" | "done">("idle");

  const openSeries = POKEMON_SERIES.find(s => s.id === openSeriesId);
  const openSet    = openSeries?.sets.find(s => s.id === openSetId);

  useEffect(() => { setInvFilter("todas"); setVersionFilter("todas"); setAddingWish("idle"); setVisibleCount(PAGE_SIZE); }, [openSetId]);

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

  async function handleAddAllMissingToWishlist() {
    if (!userId || !openSetId || addingWish === "loading") return;
    setAddingWish("loading");
    const missing = setCards.filter(c => (inventory[invKey(c.id, c.version)] ?? 0) === 0);
    const toAdd   = missing.filter(c => !wishlistCards.some(w => w.card_id === c.id && w.set_id === openSetId));
    if (toAdd.length > 0) {
      const supabase = createClient();
      await supabase.from("card_wishlist").insert(
        toAdd.map(c => ({ user_id: userId, card_id: c.id, set_id: openSetId }))
      );
      setWishlistCards(prev => [...prev, ...toAdd.map(c => ({ card_id: c.id, set_id: openSetId! }))]);
    }
    setAddingWish("done");
    setTimeout(() => setAddingWish("idle"), 2500);
  }

  function goToSeries() {
    setView("series");
    setOpenSeriesId(null);
    setOpenSetId(null);
    setTimeout(() => window.scrollTo(0, 0), 50);
  }

  function goToSets(seriesId: string) {
    setOpenSeriesId(seriesId);
    setOpenSetId(null);
    setView("sets");
    setTimeout(() => window.scrollTo(0, 0), 50);
  }

  function goToCards(setId: string) {
    setOpenSetId(setId);
    setView("cards");
    setTimeout(() => window.scrollTo(0, 0), 50);
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
          Pokémon Master Set's
        </h2>
        <p style={{
          fontFamily: MONO, fontSize: "12px", letterSpacing: "0.1em",
          color: INK2, marginTop: "10px", textTransform: "uppercase",
        }}>
          {POKEMON_SERIES.length} expansiones · {POKEMON_SERIES.reduce((a, s) => a + s.sets.length, 0)} sets
        </p>
      </div>

      <div className="pks-body" style={{ padding: "0 80px" }}>

        {/* ── VISTA: Series ── */}
        {view === "series" && (
          <>
            <SectionLabel>Expansiones</SectionLabel>
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
              { label: "Expansiones", onClick: goToSeries },
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

          // Variantes únicas del set, ordenadas
          const setVersions = [...new Set(allCards.map(c => c.version))].sort();

          const filteredCards = allCards.filter(card => {
            const qty = inventory[invKey(card.id, card.version)] ?? 0;
            if (invFilter === "tengo"  && qty === 0) return false;
            if (invFilter === "faltan" && qty  >  0) return false;
            if (versionFilter !== "todas" && card.version !== versionFilter) return false;
            return true;
          });
          const visibleCards = filteredCards.slice(0, visibleCount);
          const hasMore = filteredCards.length > visibleCount;
          return (
            <>
              <Breadcrumb items={[
                { label: "Expansiones", onClick: goToSeries },
                { label: openSeries!.name, onClick: () => goToSets(openSeries!.id) },
                { label: openSet.name },
              ]} />

              <SectionLabel>
                {openSet.name} — {allCards.length} cartas
                {(loadingCards || loadingInv) && <span style={{ color: INK2, fontSize: "10px", marginLeft: "8px" }}>cargando...</span>}
              </SectionLabel>

              {userId && <SetProgress cards={allCards} inventory={inventory} />}

              {/* Filtros */}
              {(() => {
                const tengoCount  = allCards.filter(c => (inventory[invKey(c.id, c.version)] ?? 0) > 0).length;
                const faltanCount = allCards.filter(c => (inventory[invKey(c.id, c.version)] ?? 0) === 0).length;
                const sSelect: React.CSSProperties = {
                  fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em",
                  color: INK0, background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px",
                  padding: "8px 12px", cursor: "pointer", outline: "none",
                  appearance: "none", WebkitAppearance: "none",
                  minWidth: "180px",
                };
                return (
                  <div style={{ display: "flex", gap: "10px", marginBottom: "28px", flexWrap: "wrap", alignItems: "center" }}>
                    {userId && (
                      <select value={invFilter} onChange={e => { setInvFilter(e.target.value as InvFilter); setVisibleCount(PAGE_SIZE); }} style={sSelect}>
                        <option value="todas" style={{ background: "#0a0e1a" }}>Todas ({allCards.length})</option>
                        <option value="tengo" style={{ background: "#0a0e1a" }}>En inventario ({tengoCount})</option>
                        <option value="faltan" style={{ background: "#0a0e1a" }}>Restantes ({faltanCount})</option>
                      </select>
                    )}
                    <select value={versionFilter} onChange={e => { setVersionFilter(e.target.value); setVisibleCount(PAGE_SIZE); }} style={sSelect}>
                      <option value="todas" style={{ background: "#0a0e1a" }}>Todas las variantes</option>
                      {setVersions.map(v => {
                        const cnt = allCards.filter(c => {
                          const qty = inventory[invKey(c.id, c.version)] ?? 0;
                          if (invFilter === "tengo"  && qty === 0) return false;
                          if (invFilter === "faltan" && qty  >  0) return false;
                          return c.version === v;
                        }).length;
                        return (
                          <option key={v} value={v} style={{ background: "#0a0e1a" }}>
                            {getVersionLabel(v)} ({cnt})
                          </option>
                        );
                      })}
                    </select>
                    {userId && (
                      <button
                        type="button"
                        onClick={handleAddAllMissingToWishlist}
                        disabled={addingWish === "loading" || setCards.length === 0}
                        style={{
                          fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em",
                          color: addingWish === "done" ? BG0 : COURT,
                          background: addingWish === "done" ? COURT : "rgba(46,230,193,0.08)",
                          border: `1px solid ${COURT}55`,
                          borderRadius: "8px", padding: "8px 16px",
                          cursor: addingWish === "loading" || setCards.length === 0 ? "default" : "pointer",
                          opacity: addingWish === "loading" ? 0.6 : 1,
                          transition: "all 0.2s", whiteSpace: "nowrap",
                        }}
                      >
                        {addingWish === "done" ? "Listo ✓" : addingWish === "loading" ? "Agregando..." : `+ Wishlist restantes (${faltanCount})`}
                      </button>
                    )}
                  </div>
                );
              })()}

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
                    wishlistCards={wishlistCards}
                    onWishlistChange={setWishlistCards}
                  />
                ))}
                {filteredCards.length === 0 && (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 0", color: INK2, fontFamily: MONO, fontSize: "12px", letterSpacing: "0.1em" }}>
                    No hay cartas en este filtro
                  </div>
                )}
              </div>
              {hasMore && <InfiniteScrollSentinel onVisible={() => setVisibleCount(c => c + PAGE_SIZE)} />}
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
        @keyframes goldShift {
          0%   { opacity: 0.6; filter: brightness(0.9) saturate(1.2); }
          50%  { opacity: 1;   filter: brightness(1.3) saturate(1.6); }
          100% { opacity: 0.6; filter: brightness(0.9) saturate(1.2); }
        }
        .tcg-card-wrap { width: 240px; }
        .tcg-card-body { width: 240px; height: 336px; overflow: hidden; position: relative; }
        .pks-thumb:not(.pks-thumb--open):not(.pks-thumb--gray):hover { background: rgba(46,230,193,0.05) !important; }
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
