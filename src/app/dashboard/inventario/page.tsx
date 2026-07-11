"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef, useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { SCRYDEX_SET_CODES } from "@/hooks/useScrydexPrice";
import { getVersionLabel } from "@/data/pokemon-cards-meta";
import { InvTiltCard, SellPopup } from "@/components/InventoryCard";
import {
  invKey,
  type InventoryMap, type FeaturedCard, type WishlistCard, type UserListing,
} from "@/components/CardDetailModal";
import { Plus, Search, BadgeDollarSign, Star } from "lucide-react";
import type { PokemonCard } from "@/data/pokemon-cards-meta";
import { useDashboardUser } from "../DashboardUserContext";

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

const SET_META: Record<string, { name: string; logo: string }> = Object.fromEntries(
  POKEMON_SERIES.flatMap(s => s.sets).map(s => [s.id, { name: s.name, logo: s.logo }])
);

/* ── Main page ───────────────────────────────────────────────── */
export default function InventarioPage() {
  const supabase = createClient();
  const { userId: ctxUserId } = useDashboardUser();

  const [userId,        setUserId]        = useState<string | null>(null);
  const [inventory,     setInventory]     = useState<InventoryMap>({});
  const [featuredCards, setFeaturedCards] = useState<FeaturedCard[]>([]);
  const [wishlistCards, setWishlistCards] = useState<WishlistCard[]>([]);
  const [listings,      setListings]      = useState<UserListing[]>([]);

  const [sets,            setSets]            = useState<{ setId: string; count: number }[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [allCardsLoaded,  setAllCardsLoaded]  = useState(false);
  const [setCards,        setSetCards]        = useState<Record<string, PokemonCard[]>>({});
  const [setCardPrices,   setSetCardPrices]   = useState<Record<string, Record<string, Record<string, number>>>>({});

  // Filters (local state — no URL params needed)
  const [fNombre,     setFNombre]     = useState("");
  const [fVariante,   setFVariante]   = useState("");
  const [fSet,        setFSet]        = useState("");
  const [fDestacados, setFDestacados] = useState(false);
  const [fBulk,       setFBulk]       = useState(false);
  const [setDropdownOpen, setSetDropdownOpen] = useState(false);

  const [modalCard,  setModalCard]  = useState<{ card: PokemonCard; setId: string } | null>(null);
  const [sellTarget, setSellTarget] = useState<{ card: PokemonCard; setId: string } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [buscarOpen, setBuscarOpen] = useState(false);

  const PAGE_SIZE = 50;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

    // Limpiar registros fantasma: featured_cards con card_id en formato string (NaN al convertir)
    const allFeat = (featRes.data ?? []) as FeaturedCard[];
    const ghostFeat = allFeat.filter(f => isNaN(Number(f.card_id)));
    if (ghostFeat.length > 0) {
      await Promise.all(ghostFeat.map(f =>
        supabase.from("featured_cards").delete().eq("user_id", uid).eq("card_id", f.card_id).eq("set_id", f.set_id)
      ));
    }
    setFeaturedCards(allFeat.filter(f => !isNaN(Number(f.card_id))));

    setWishlistCards((wishRes.data ?? []) as WishlistCard[]);
    setListings((listRes.data ?? []) as UserListing[]);
    const newSets = Object.entries(setMap).map(([setId, count]) => ({ setId, count })).sort((a, b) => b.count - a.count);
    setSets(newSets);
    setLoading(false);
    return { newSets, invMap };
  }

  async function loadAllSetsData(setIds: string[]) {
    if (setIds.length === 0) { setAllCardsLoaded(true); return; }

    // Load card data for all sets
    await loadManySets(setIds);
    const newSetCards: Record<string, PokemonCard[]> = {};
    for (const sid of setIds) {
      newSetCards[sid] = SET_CARDS[sid] ?? [];
    }
    setSetCards(newSetCards);

    // Load prices for all sets in parallel
    const pricePromises = setIds.map(async (setId) => {
      const sc = SCRYDEX_SET_CODES[setId];
      if (!sc) return;
      const { data: priceRows } = await supabase
        .from("card_prices")
        .select("card_id, prices")
        .like("card_id", `${sc}-%`);
      if (priceRows) {
        const map: Record<string, Record<string, number>> = {};
        for (const row of priceRows) {
          map[row.card_id] = row.prices as Record<string, number>;
        }
        setSetCardPrices(prev => ({ ...prev, [setId]: map }));
      }
    });
    await Promise.all(pricePromises);
    setAllCardsLoaded(true);
  }

  useEffect(() => {
    if (!setDropdownOpen) return;
    function handleClick() { setSetDropdownOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [setDropdownOpen]);

  useEffect(() => {
    if (!ctxUserId) return;
    async function init() {
      setUserId(ctxUserId!);
      userIdRef.current = ctxUserId!;
      const { newSets } = await loadData(ctxUserId!);
      await loadAllSetsData(newSets.map(s => s.setId));
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxUserId]);

  function matchesFeatured(f: FeaturedCard, card: PokemonCard, setId: string) {
    return (Number(f.card_id) === card.card_number || String(f.card_id) === String(card.id)) && f.set_id === setId;
  }

  async function toggleFeatured(card: PokemonCard, setId: string) {
    if (!userId) return;
    const isFeat = featuredCards.some(f => matchesFeatured(f, card, setId));
    if (isFeat) {
      // Intentar borrar por card_number y por card.id para cubrir ambos formatos
      await Promise.all([
        supabase.from("featured_cards").delete().eq("user_id", userId).eq("card_id", card.card_number).eq("set_id", setId),
        supabase.from("featured_cards").delete().eq("user_id", userId).eq("card_id", card.id).eq("set_id", setId),
      ]);
      setFeaturedCards(prev => prev.filter(f => !matchesFeatured(f, card, setId)));
    } else {
      if (featuredCards.length >= 10) return;
      await supabase.from("featured_cards").insert({ user_id: userId, card_id: card.card_number, set_id: setId });
      setFeaturedCards(prev => [...prev, { card_id: card.card_number, set_id: setId }]);
    }
  }

  async function incrementQty(card: PokemonCard, setId: string) {
    if (!userId) return;
    const key = invKey(card.id, card.version);
    const current = inventory[key] ?? 0;
    const next = current + 1;
    await supabase.from("card_inventory").upsert({
      user_id: userId, card_id: card.id, set_id: setId,
      version: card.version, quantity: next,
    }, { onConflict: "user_id,card_id,set_id,version" });
    setInventory(prev => ({ ...prev, [key]: next }));
  }

  async function decrementQty(card: PokemonCard, setId: string) {
    if (!userId) return;
    const key = invKey(card.id, card.version);
    const current = inventory[key] ?? 0;
    if (current <= 0) return;
    const next = current - 1;
    if (next === 0) {
      await supabase.from("card_inventory")
        .delete()
        .eq("user_id", userId)
        .eq("card_id", card.id)
        .eq("set_id", setId)
        .eq("version", card.version);
      setInventory(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    } else {
      await supabase.from("card_inventory").update({ quantity: next })
        .eq("user_id", userId).eq("card_id", card.id).eq("set_id", setId).eq("version", card.version);
      setInventory(prev => ({ ...prev, [key]: next }));
    }
  }

  // Build flat list of all cards in inventory
  const allInventoryCards = useMemo(() => {
    if (!allCardsLoaded) return [];
    const result: { card: PokemonCard; setId: string }[] = [];
    for (const { setId } of sets) {
      const cards = setCards[setId] ?? [];
      for (const card of cards) {
        if ((inventory[invKey(card.id, card.version)] ?? 0) > 0) {
          result.push({ card, setId });
        }
      }
    }
    return result;
  }, [allCardsLoaded, sets, setCards, inventory]);

  // Unique versions from inventory
  const availableVersions = useMemo(() => {
    const vs = new Set<string>();
    allInventoryCards.forEach(({ card }) => vs.add(card.version));
    return [...vs].sort();
  }, [allInventoryCards]);

  // Unique sets from inventory
  const availableSets = useMemo(() => {
    const seen = new Set<string>();
    return sets.filter(({ setId }) => {
      if (seen.has(setId)) return false;
      seen.add(setId);
      return true;
    });
  }, [sets]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    return allInventoryCards.filter(({ card, setId }) => {
      if (fNombre.trim() && !card.name.toLowerCase().includes(fNombre.trim().toLowerCase())) return false;
      if (fVariante && card.version !== fVariante) return false;
      if (fSet && setId !== fSet) return false;
      if (fDestacados && !featuredCards.some(f =>
        (Number(f.card_id) === card.card_number || String(f.card_id) === String(card.id)) &&
        f.set_id === setId
      )) return false;
      if (fBulk && (inventory[invKey(card.id, card.version)] ?? 0) < 2) return false;
      return true;
    });
  }, [allInventoryCards, fNombre, fVariante, fSet, fDestacados, fBulk, featuredCards, inventory]);

  const hasFilters = fNombre || fVariante || fSet || fDestacados || fBulk;
  function clearFilters() { setFNombre(""); setFVariante(""); setFSet(""); setFDestacados(false); setFBulk(false); }

  // Resetear paginación cuando cambian los filtros
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [fNombre, fVariante, fSet, fDestacados, fBulk]);

  // IntersectionObserver para cargar más cartas al hacer scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + PAGE_SIZE);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredCards.length]);

  const visibleCards = useMemo(
    () => filteredCards.slice(0, visibleCount),
    [filteredCards, visibleCount]
  );

  const totalCards = Object.values(inventory).reduce((a, b) => a + b, 0);

  const sInput: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: "7px",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    color: INK0, fontFamily: MONO, fontSize: "12px", outline: "none", boxSizing: "border-box",
  };
  const sLabel: React.CSSProperties = {
    fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em",
    textTransform: "uppercase", color: INK2, display: "block", marginBottom: "8px",
  };
  const sDivider: React.CSSProperties = { height: "1px", background: "rgba(255,255,255,0.06)", margin: "18px 0" };
  const sSelect: React.CSSProperties = { ...sInput, cursor: "pointer", appearance: "none", WebkitAppearance: "none" };

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        /* ── Animations ── */
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
          0%,100% { opacity: 0;    transform: translate(-50%,-50%) scale(0.2) rotate(0deg); }
          50%     { opacity: 0.95; transform: translate(-50%,-50%) scale(1.1) rotate(20deg); }
        }

        /* ── Layout ── */
        .inv-page-padding { padding: 24px 20px 0; }
        @media (min-width: 768px) { .inv-page-padding { padding: 48px 48px 0; } }

        .inv-body { padding: 0 20px 80px; }
        @media (min-width: 768px) { .inv-body { padding: 0 48px 80px; } }

        .inv-layout { display: flex; gap: 32px; align-items: flex-start; }
        .inv-sidebar { width: 220px; flex-shrink: 0; }
        .inv-grid-area { flex: 1; min-width: 0; }
        @media (max-width: 1023px) {
          .inv-layout { flex-direction: column; }
          .inv-sidebar { width: 100% !important; }
          .inv-sidebar > div { position: static !important; }
        }

        /* ── Card grid ── */
        .inv-card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px)  { .inv-card-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; } }
        @media (min-width: 1280px) { .inv-card-grid { grid-template-columns: repeat(6, 1fr); gap: 12px; } }

        /* ── Icon overlay buttons ── */
        .inv-icon-btn {
          width: 26px; height: 26px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(5,7,13,0.75); border: none; border-radius: 6px;
          cursor: pointer; transition: background 0.15s; padding: 0;
          backdrop-filter: blur(4px);
        }
        .inv-icon-btn:hover { background: rgba(5,7,13,0.92); }
        .inv-icon-btn.active { background: rgba(46,230,193,0.2); }

        /* ── Qty controls ── */
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
      `}</style>

      {/* ── Header ── */}
      <div className="inv-page-padding">
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

      {/* ── Body ── */}
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
          <>
            <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: INK2, marginBottom: "24px" }}>
              {sets.length} {sets.length === 1 ? "set" : "sets"} · {totalCards} cartas
            </p>

            <div className="inv-layout">

              {/* ── Sidebar ── */}
              <aside className="inv-sidebar">
                <div style={{
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "16px", padding: "20px", position: "sticky", top: "80px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                    <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: COURT }}>Filtros</span>
                    {hasFilters && (
                      <button onClick={clearFilters} style={{
                        fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase",
                        color: "#d95555", background: "none", border: "1px solid rgba(209,53,53,0.3)",
                        borderRadius: "5px", padding: "3px 10px", cursor: "pointer",
                      }}>
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div>
                    <label style={sLabel}>Nombre de carta</label>
                    <input
                      style={sInput}
                      value={fNombre}
                      onChange={e => setFNombre(e.target.value)}
                      placeholder="Ej: Pikachu..."
                    />
                  </div>

                  <div style={sDivider} />

                  <div>
                    <label style={sLabel}>Variante</label>
                    <select value={fVariante} onChange={e => setFVariante(e.target.value)} style={sSelect}>
                      <option value="" style={{ background: "#0a0e1a" }}>Todas las variantes</option>
                      {availableVersions.map(v => (
                        <option key={v} value={v} style={{ background: "#0a0e1a", color: INK0 }}>{getVersionLabel(v)}</option>
                      ))}
                    </select>
                  </div>

                  <div style={sDivider} />

                  <div style={{ position: "relative" }}>
                    <label style={sLabel}>Set</label>
                    <button
                      onClick={() => setSetDropdownOpen(p => !p)}
                      style={{
                        ...sInput,
                        display: "flex", alignItems: "center", gap: "8px",
                        cursor: "pointer", background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${setDropdownOpen ? COURT + "66" : "rgba(255,255,255,0.1)"}`,
                        width: "100%", textAlign: "left", justifyContent: "space-between",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                        {fSet && SET_META[fSet]?.logo && (
                          <img src={SET_META[fSet].logo} alt="" style={{ width: 28, height: 20, objectFit: "contain", flexShrink: 0 }} />
                        )}
                        <span style={{ color: INK0, fontSize: "12px", fontFamily: MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {fSet ? (SET_META[fSet]?.name ?? fSet) : "Todos los sets"}
                        </span>
                      </span>
                      <span style={{ color: INK2, fontSize: "10px", flexShrink: 0 }}>▾</span>
                    </button>

                    {setDropdownOpen && (
                      <div
                        onMouseDown={e => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
                        style={{
                          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
                          background: "#0d1520", border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "10px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                          maxHeight: "240px", overflowY: "auto",
                        }}
                      >
                        {/* Opción "Todos los sets" */}
                        <button
                          onClick={() => { setFSet(""); setSetDropdownOpen(false); }}
                          style={{
                            display: "flex", alignItems: "center", gap: "8px", width: "100%",
                            padding: "9px 12px", background: fSet === "" ? "rgba(46,230,193,0.1)" : "none",
                            border: "none", cursor: "pointer", textAlign: "left",
                          }}
                        >
                          <span style={{ fontFamily: MONO, fontSize: "11px", color: fSet === "" ? COURT : INK0 }}>Todos los sets</span>
                        </button>

                        {availableSets.map(({ setId }) => (
                          <button
                            key={setId}
                            onClick={() => { setFSet(setId); setSetDropdownOpen(false); }}
                            style={{
                              display: "flex", alignItems: "center", gap: "8px", width: "100%",
                              padding: "7px 12px", background: fSet === setId ? "rgba(46,230,193,0.1)" : "none",
                              border: "none", cursor: "pointer", textAlign: "left",
                              borderTop: "1px solid rgba(255,255,255,0.05)",
                            }}
                          >
                            {SET_META[setId]?.logo && (
                              <img src={SET_META[setId].logo} alt="" style={{ width: 32, height: 22, objectFit: "contain", flexShrink: 0 }} />
                            )}
                            <span style={{ fontFamily: MONO, fontSize: "11px", color: fSet === setId ? COURT : INK0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {SET_META[setId]?.name ?? setId}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={sDivider} />

                  {/* Checkbox Destacados */}
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={fDestacados}
                      onChange={e => setFDestacados(e.target.checked)}
                      style={{ width: "15px", height: "15px", accentColor: COURT, cursor: "pointer", flexShrink: 0 }}
                    />
                    <span style={{ fontFamily: MONO, fontSize: "11px", color: fDestacados ? COURT : INK0, letterSpacing: "0.06em", userSelect: "none" }}>
                      Destacados
                    </span>
                  </label>

                  <div style={{ height: "10px" }} />

                  {/* Checkbox Bulk */}
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={fBulk}
                      onChange={e => setFBulk(e.target.checked)}
                      style={{ width: "15px", height: "15px", accentColor: COURT, cursor: "pointer", flexShrink: 0 }}
                    />
                    <span style={{ fontFamily: MONO, fontSize: "11px", color: fBulk ? COURT : INK0, letterSpacing: "0.06em", userSelect: "none" }}>
                      Bulk
                    </span>
                  </label>
                </div>
              </aside>

              {/* ── Grid area ── */}
              <div className="inv-grid-area">
                {!allCardsLoaded ? (
                  <div className="inv-card-grid">
                    {Array.from({ length: Math.min(totalCards, 18) }).map((_, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ aspectRatio: "2/3", borderRadius: "8px", background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%)", backgroundSize: "200% 100%", animation: "inv-shimmer 1.4s ease-in-out infinite" }} />
                        <div style={{ height: "14px", borderRadius: "4px", background: "rgba(255,255,255,0.04)" }} />
                        <div style={{ height: "28px", borderRadius: "6px", background: "rgba(255,255,255,0.03)" }} />
                      </div>
                    ))}
                  </div>
                ) : filteredCards.length === 0 ? (
                  <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "60px 40px", textAlign: "center" }}>
                    {hasFilters ? (
                      <>
                        <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>Ningún resultado</p>
                        <button onClick={clearFilters} style={{ fontFamily: MONO, fontSize: "10px", color: COURT, background: "none", border: `1px solid ${COURT}44`, borderRadius: "6px", padding: "6px 16px", cursor: "pointer" }}>Limpiar filtros</button>
                      </>
                    ) : (
                      <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>No hay cartas en el inventario</p>
                    )}
                  </div>
                ) : (
                  <div className="inv-card-grid">
                    {visibleCards.map(({ card, setId }) => {
                      const isFeat   = featuredCards.some(f => (Number(f.card_id) === card.card_number || String(f.card_id) === String(card.id)) && f.set_id === setId);
                      const isListed = listings.some(l => String(l.card_id) === String(card.card_number) && l.set_id === setId && l.version === card.version);
                      const qty      = inventory[invKey(card.id, card.version)] ?? 0;

                      // Scrydex price
                      const sc = SCRYDEX_SET_CODES[setId];
                      const pricesForSet = sc ? (setCardPrices[setId] ?? {}) : {};
                      const cardPriceMap = pricesForSet[`${sc}-${card.card_number}`];
                      const vk = card.version.toLowerCase().replace(/\s+/g, "");
                      const cardPrice: number | null = cardPriceMap
                        ? (cardPriceMap[vk] ?? cardPriceMap[card.version] ?? cardPriceMap["normal"] ?? null)
                        : null;

                      const numStr = `#${String(card.card_number).padStart(3, "0")}`;

                      return (
                        <div key={`${setId}-${card.id}-${card.version}`} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>

                          {/* Card image area */}
                          <div style={{ position: "relative" }}>
                            <InvTiltCard card={card} onClick={() => setModalCard({ card, setId })} />

                            {/* En venta badge */}
                            {isListed && (
                              <div title="En venta" style={{
                                position: "absolute", top: 6, right: 6,
                                width: 30, height: 30, borderRadius: "50%",
                                background: "rgba(5,7,13,0.85)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                animation: "inv-salePulse 2s ease-in-out infinite",
                                zIndex: 10, pointerEvents: "none",
                              }}>
                                <BadgeDollarSign size={18} color="#d6ff3d" strokeWidth={1.8} />
                              </div>
                            )}

                            {/* Estrella + vender (top-left) */}
                            {userId && (
                              <div style={{ position: "absolute", top: 6, left: 6, display: "flex", flexDirection: "column", gap: "4px", zIndex: 10 }}>
                                <button
                                  className={`inv-icon-btn${isFeat ? " active" : ""}`}
                                  onClick={e => { e.stopPropagation(); toggleFeatured(card, setId); }}
                                  title={isFeat ? "Quitar de destacadas" : "Destacar en perfil"}
                                >
                                  <Star size={13} color={isFeat ? COURT : INK2} strokeWidth={isFeat ? 2.2 : 1.7} fill={isFeat ? COURT : "none"} />
                                </button>
                                <button
                                  className={`inv-icon-btn${isListed ? " active" : ""}`}
                                  onClick={e => { e.stopPropagation(); setSellTarget({ card, setId }); }}
                                  title="Poner en venta"
                                >
                                  <BadgeDollarSign size={13} color={isListed ? "#d6ff3d" : INK2} strokeWidth={1.8} />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Line 1: #090 Rowlet */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", overflow: "hidden", textAlign: "center" }}>
                            <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2, flexShrink: 0, letterSpacing: "0.04em" }}>
                              {numStr}
                            </span>
                            <span style={{ fontFamily: MONO, fontSize: "11px", color: INK0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {card.name}
                            </span>
                          </div>

                          {/* Line 2: precio + qty controls */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                            <span style={{ fontFamily: MONO, fontSize: "11px", color: cardPrice !== null ? COURT : INK2, fontWeight: 700, flexShrink: 0 }}>
                              {cardPrice !== null ? `$${cardPrice.toFixed(2)}` : "—"}
                            </span>

                            {userId && (
                              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                <button
                                  className="inv-qty-btn"
                                  onClick={() => decrementQty(card, setId)}
                                  style={{ color: INK0 }}
                                  title="Quitar uno"
                                >
                                  −
                                </button>
                                <span className="inv-qty-num">{qty}</span>
                                <button
                                  className="inv-qty-btn"
                                  onClick={() => incrementQty(card, setId)}
                                  style={{ color: COURT, borderColor: `${COURT}44` }}
                                  title="Agregar uno"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sentinel para infinite scroll */}
                {visibleCount < filteredCards.length && (
                  <>
                    <div ref={sentinelRef} style={{ height: 1 }} />
                    <div style={{ textAlign: "center", padding: "24px 0", fontFamily: MONO, fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: INK2 }}>
                      Cargando más cartas…
                    </div>
                  </>
                )}
                {allCardsLoaded && visibleCount >= filteredCards.length && filteredCards.length > 0 && (
                  <div style={{ textAlign: "center", padding: "24px 0", fontFamily: MONO, fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: INK2 }}>
                    {filteredCards.length} cartas en total
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
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

      {sellTarget && userId && (
        <SellPopup
          card={sellTarget.card} setId={sellTarget.setId} userId={userId}
          onPublished={listing => setListings(prev => [...prev, listing])}
          onClose={() => setSellTarget(null)}
        />
      )}

      {drawerOpen && userId && (
        <AgregarDrawer
          userId={userId}
          onClose={async () => {
            setDrawerOpen(false);
            if (userIdRef.current) {
              setAllCardsLoaded(false);
              const { newSets } = await loadData(userIdRef.current);
              await loadAllSetsData(newSets.map(s => s.setId));
            }
          }}
        />
      )}

      {buscarOpen && userId && (
        <BuscarCartaDrawer
          userId={userId}
          onClose={() => setBuscarOpen(false)}
        />
      )}
    </div>
  );
}
