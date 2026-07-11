"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { X, Search, Star, BadgeDollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { SCRYDEX_SET_CODES } from "@/hooks/useScrydexPrice";
import { InvTiltCard, SellPopup, INV_CARD_KEYFRAMES } from "@/components/InventoryCard";
import { invKey, type InventoryMap, type FeaturedCard, type WishlistCard, type UserListing } from "@/components/CardDetailModal";
import type { PokemonCard } from "@/data/pokemon-cards-meta";

const CardDetailModal = dynamic(
  () => import("@/components/CardDetailModal").then(m => ({ default: m.CardDetailModal })),
  { ssr: false }
);

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const ALL_SETS = POKEMON_SERIES.flatMap(s => s.sets);
// Posición del set en POKEMON_SERIES = recencia (más reciente primero)
const SET_RANK: Record<string, number> = Object.fromEntries(ALL_SETS.map((s, i) => [s.id, i]));

interface CardResult {
  card:    PokemonCard;
  setId:   string;
  setName: string;
}

interface BuscarCartaDrawerProps {
  userId: string;
  onClose: () => void;
}

export function BuscarCartaDrawer({ userId, onClose }: BuscarCartaDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<CardResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [modalTarget,   setModalTarget]   = useState<{ card: PokemonCard; setId: string } | null>(null);
  const [sellTarget,    setSellTarget]    = useState<{ card: PokemonCard; setId: string } | null>(null);
  const [inventory,     setInventory]     = useState<InventoryMap>({});
  const [featuredCards, setFeaturedCards] = useState<FeaturedCard[]>([]);
  const [wishlistCards, setWishlistCards] = useState<WishlistCard[]>([]);
  const [userListings,  setUserListings]  = useState<UserListing[]>([]);
  const [cardPrices,    setCardPrices]    = useState<Record<string, Record<string, number>>>({});

  const searchTokenRef = useRef(0);

  /* Lock body scroll */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* Slide-in animation */
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    el.style.transform = "translateY(100%)";
    el.style.transition = "none";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform  = "translateY(0%)";
        setTimeout(() => inputRef.current?.focus(), 380);
      });
    });
  }, []);

  /* Load user data once */
  useEffect(() => {
    (async () => {
      const [{ data: featured }, { data: wishlist }, { data: listings }, { data: inv }] = await Promise.all([
        supabase.from("featured_cards").select("card_id, set_id").eq("user_id", userId),
        supabase.from("card_wishlist").select("card_id, set_id").eq("user_id", userId),
        supabase.from("market_listings").select("id, card_id, set_id, price_cop, version").eq("user_id", userId).eq("status", "active"),
        supabase.from("card_inventory").select("card_id, version, quantity").eq("user_id", userId).gt("quantity", 0),
      ]);
      if (featured) setFeaturedCards(featured as FeaturedCard[]);
      if (wishlist) setWishlistCards(wishlist as WishlistCard[]);
      if (listings) setUserListings(listings as UserListing[]);
      if (inv) {
        const invMap: InventoryMap = {};
        for (const row of inv as { card_id: string; version: string | null; quantity: number }[]) {
          invMap[invKey(row.card_id, row.version ?? "normal")] = row.quantity;
        }
        setInventory(invMap);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Búsqueda bajo demanda: el índice de nombres dice en qué sets buscar,
     y solo esos sets se cargan */
  useEffect(() => {
    const q = query.trim().toLowerCase();
    const token = ++searchTokenRef.current;
    // Con menos de 2 letras el render muestra el estado vacío (los resultados
    // viejos quedan ocultos), así que no hace falta setState síncrono aquí
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      const { SET_NAME_INDEX } = await import("@/data/card-name-index");
      const matchingSetIds = Object.keys(SET_NAME_INDEX)
        .filter(setId => SET_NAME_INDEX[setId].includes(q));
      await loadManySets(matchingSetIds);
      if (token !== searchTokenRef.current) return;

      const out: CardResult[] = [];
      for (const setId of matchingSetIds) {
        const cards = SET_CARDS[setId];
        if (!cards.length) continue;
        const setInfo = ALL_SETS.find(s => s.id === setId);
        for (const card of cards) {
          if (card.name.toLowerCase().includes(q))
            out.push({ card: card as PokemonCard, setId, setName: setInfo?.name ?? setId });
        }
      }
      out.sort((a, b) => {
        const rank = (SET_RANK[a.setId] ?? 9999) - (SET_RANK[b.setId] ?? 9999);
        if (rank !== 0) return rank;
        return a.card.card_number - b.card.card_number;
      });
      setResults(out);
      setIsLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  /* Precios Scrydex de los resultados (solo ids exactos, en lotes) */
  useEffect(() => {
    if (results.length === 0) return;
    const ids = [...new Set(
      results
        .map(r => {
          const sc = SCRYDEX_SET_CODES[r.setId];
          return sc ? `${sc}-${r.card.card_number}` : null;
        })
        .filter((id): id is string => !!id && !(id in cardPrices))
    )];
    if (ids.length === 0) return;
    (async () => {
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 200) chunks.push(ids.slice(i, i + 200));
      const rows = (await Promise.all(chunks.map(chunk =>
        supabase.from("card_prices").select("card_id, prices").in("card_id", chunk)
      ))).flatMap(res => res.data ?? []);
      if (rows.length === 0) return;
      setCardPrices(prev => {
        const next = { ...prev };
        for (const row of rows) next[row.card_id] = row.prices as Record<string, number>;
        return next;
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  async function toggleFeatured(card: PokemonCard, setId: string) {
    const isFeat = featuredCards.some(f => (Number(f.card_id) === card.card_number || String(f.card_id) === String(card.id)) && f.set_id === setId);
    if (isFeat) {
      await Promise.all([
        supabase.from("featured_cards").delete().eq("user_id", userId).eq("card_id", card.card_number).eq("set_id", setId),
        supabase.from("featured_cards").delete().eq("user_id", userId).eq("card_id", card.id).eq("set_id", setId),
      ]);
      setFeaturedCards(prev => prev.filter(f => !((Number(f.card_id) === card.card_number || String(f.card_id) === String(card.id)) && f.set_id === setId)));
    } else {
      if (featuredCards.length >= 10) return;
      await supabase.from("featured_cards").insert({ user_id: userId, card_id: card.card_number, set_id: setId });
      setFeaturedCards(prev => [...prev, { card_id: card.card_number, set_id: setId }]);
    }
  }

  async function incrementQty(card: PokemonCard, setId: string) {
    const key = invKey(card.id, card.version);
    const next = (inventory[key] ?? 0) + 1;
    await supabase.from("card_inventory").upsert({
      user_id: userId, card_id: card.id, set_id: setId,
      version: card.version, quantity: next,
    }, { onConflict: "user_id,card_id,set_id,version" });
    setInventory(prev => ({ ...prev, [key]: next }));
  }

  async function decrementQty(card: PokemonCard, setId: string) {
    const key = invKey(card.id, card.version);
    const current = inventory[key] ?? 0;
    if (current <= 0) return;
    const next = current - 1;
    if (next === 0) {
      await supabase.from("card_inventory")
        .delete()
        .eq("user_id", userId).eq("card_id", card.id).eq("set_id", setId).eq("version", card.version);
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

  const openModal = useCallback((result: CardResult) => {
    setModalTarget({ card: result.card, setId: result.setId });
  }, []);

  function handleClose() {
    const el = panelRef.current;
    if (!el) { onClose(); return; }
    el.style.transition = "transform 0.28s cubic-bezier(0.4, 0, 1, 1)";
    el.style.transform  = "translateY(100%)";
    setTimeout(onClose, 280);
  }

  return (
    <>
      <style>{`
        .buscar-backdrop { animation: buscar-fadeIn 0.22s ease forwards; }
        @keyframes buscar-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .buscar-close {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: ${INK2}; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          width: 40px; height: 40px;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          flex-shrink: 0;
        }
        .buscar-close:hover {
          background: rgba(255,255,255,0.11);
          border-color: rgba(255,255,255,0.2);
          color: ${INK0};
        }
        .buscar-pill {
          width: 40px; height: 4px; border-radius: 2px;
          background: rgba(255,255,255,0.18);
          margin: 0 auto;
        }
        .buscar-input {
          width: 100%; padding: 13px 16px 13px 44px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: ${INK0}; font-family: ${MONO}; font-size: 14px;
          outline: none; box-sizing: border-box;
          transition: border-color 0.15s, background 0.15s;
        }
        .buscar-input:focus {
          border-color: rgba(46,230,193,0.45);
          background: rgba(255,255,255,0.06);
        }
        .buscar-input::placeholder { color: rgba(122,130,152,0.7); }
        .buscar-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px)  { .buscar-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; } }
        @media (min-width: 1280px) { .buscar-grid { grid-template-columns: repeat(6, 1fr); gap: 12px; } }
        ${INV_CARD_KEYFRAMES}
        .buscar-spinner {
          width: 28px; height: 28px; border-radius: 50%;
          border: 2px solid rgba(46,230,193,0.15);
          border-top-color: ${COURT};
          animation: buscar-spin 0.7s linear infinite;
        }
        @keyframes buscar-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Backdrop */}
      <div
        className="buscar-backdrop"
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(5,7,13,0.72)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          zIndex: 1101,
          height: "92dvh",
          background: "#080f18",
          borderRadius: "20px 20px 0 0",
          borderTop: "1px solid rgba(46,230,193,0.18)",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 -24px 80px rgba(0,0,0,0.6), 0 -1px 0 rgba(46,230,193,0.08)",
          willChange: "transform",
        }}
      >
        {/* Drag pill */}
        <div style={{ padding: "14px 0 0", flexShrink: 0, cursor: "grab" }} onClick={handleClose}>
          <div className="buscar-pill" />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <div>
            <p style={{
              fontFamily: MONO, fontSize: "10px", letterSpacing: "0.22em",
              textTransform: "uppercase", color: COURT,
              display: "flex", alignItems: "center", gap: "8px",
              margin: "0 0 6px",
            }}>
              <span style={{ width: "16px", height: "1px", background: COURT, display: "inline-block" }} />
              Inventario
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Search size={20} color={COURT} strokeWidth={2} />
              <h2 style={{
                fontFamily: DISP, fontSize: "22px", color: INK0,
                fontWeight: 900, margin: 0, letterSpacing: "-0.01em",
              }}>
                Buscar Carta
              </h2>
            </div>
          </div>

          <button className="buscar-close" onClick={handleClose} aria-label="Cerrar">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Search bar — sticky */}
        <div style={{
          padding: "16px 24px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          flexShrink: 0,
          background: "#080f18",
        }}>
          <div style={{ position: "relative", maxWidth: "560px" }}>
            <Search
              size={16} color={INK2}
              style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            />
            <input
              ref={inputRef}
              className="buscar-input"
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ej: Charizard, Pikachu, Eevee..."
            />
          </div>

        </div>

        {/* Scrollable results */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 24px 40px" }}>
          {query.trim().length < 2 ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.2 }}>🔍</div>
              <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
                Escribe al menos 2 letras para buscar
              </p>
            </div>
          ) : isLoading ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <div className="buscar-spinner" style={{ margin: "0 auto 16px" }} />
              <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
                Buscando cartas...
              </p>
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
                Sin resultados
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.08em", marginBottom: "16px" }}>
                {results.length} resultado{results.length !== 1 ? "s" : ""}
              </p>
              <div className="buscar-grid">
                {results.map((r, i) => {
                  const { card, setId } = r;
                  const setInfo  = ALL_SETS.find(s => s.id === setId);
                  const isFeat   = featuredCards.some(f => (Number(f.card_id) === card.card_number || String(f.card_id) === String(card.id)) && f.set_id === setId);
                  const isListed = userListings.some(l => String(l.card_id) === String(card.card_number) && l.set_id === setId && l.version === card.version);
                  const qty      = inventory[invKey(card.id, card.version)] ?? 0;

                  const sc = SCRYDEX_SET_CODES[setId];
                  const cardPriceMap = sc ? cardPrices[`${sc}-${card.card_number}`] : undefined;
                  const vk = card.version.toLowerCase().replace(/\s+/g, "");
                  const cardPrice: number | null = cardPriceMap
                    ? (cardPriceMap[vk] ?? cardPriceMap[card.version] ?? cardPriceMap["normal"] ?? null)
                    : null;

                  return (
                    <div key={`${setId}-${card.id}-${i}`} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>

                      {/* Card image area */}
                      <div style={{ position: "relative" }}>
                        <InvTiltCard card={card} onClick={() => openModal(r)} />

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
                      </div>

                      {/* Line 1: #090 Rowlet */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", overflow: "hidden", textAlign: "center" }}>
                        <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2, flexShrink: 0, letterSpacing: "0.04em" }}>
                          #{String(card.card_number).padStart(3, "0")}
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
                      </div>

                      {/* Set logo */}
                      {setInfo && (
                        <div style={{ position: "relative", width: "56px", height: "16px", margin: "0 auto" }}>
                          <Image src={setInfo.logo} alt={setInfo.name} fill style={{ objectFit: "contain" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Card detail modal — renders above the drawer */}
      {modalTarget && (
        <CardDetailModal
          card={modalTarget.card}
          setId={modalTarget.setId}
          userId={userId}
          inventory={inventory}
          onInventoryChange={(key, qty) => setInventory(prev => ({ ...prev, [key]: qty }))}
          featuredCards={featuredCards}
          onFeaturedChange={setFeaturedCards}
          wishlistCards={wishlistCards}
          onWishlistChange={setWishlistCards}
          userListings={userListings}
          onListingsChange={setUserListings}
          onClose={() => setModalTarget(null)}
        />
      )}

      {/* Popup de venta */}
      {sellTarget && (
        <SellPopup
          card={sellTarget.card} setId={sellTarget.setId} userId={userId}
          onPublished={listing => setUserListings(prev => [...prev, listing])}
          onClose={() => setSellTarget(null)}
        />
      )}
    </>
  );
}
