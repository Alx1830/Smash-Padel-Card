"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { X, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { getVersionColor, getVersionLabel } from "@/data/pokemon-cards-meta";
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

const ALL_SET_IDS = POKEMON_SERIES.flatMap(s => s.sets).map(s => s.id);
const ALL_SETS    = POKEMON_SERIES.flatMap(s => s.sets);
const BATCH_SIZE  = 12;

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

  const [query,        setQuery]        = useState("");
  const [loadedSets,   setLoadedSets]   = useState<Set<string>>(new Set());
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoading,    setIsLoading]    = useState(false);

  const [modalTarget,    setModalTarget]    = useState<{ card: PokemonCard; setId: string } | null>(null);
  const [modalInventory, setModalInventory] = useState<InventoryMap>({});
  const [featuredCards,  setFeaturedCards]  = useState<FeaturedCard[]>([]);
  const [wishlistCards,  setWishlistCards]  = useState<WishlistCard[]>([]);
  const [userListings,   setUserListings]   = useState<UserListing[]>([]);

  const loadingRef = useRef(false);

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
      const [{ data: featured }, { data: wishlist }, { data: listings }] = await Promise.all([
        supabase.from("featured_cards").select("card_id, set_id").eq("user_id", userId),
        supabase.from("card_wishlist").select("card_id, set_id").eq("user_id", userId),
        supabase.from("market_listings").select("id, card_id, set_id, price_cop, version").eq("user_id", userId).eq("status", "active"),
      ]);
      if (featured) setFeaturedCards(featured as FeaturedCard[]);
      if (wishlist) setWishlistCards(wishlist as WishlistCard[]);
      if (listings) setUserListings(listings as UserListing[]);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Load all sets progressively */
  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    (async () => {
      const total = ALL_SET_IDS.length;
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = ALL_SET_IDS.slice(i, i + BATCH_SIZE);
        await loadManySets(batch);
        setLoadedSets(prev => {
          const next = new Set(prev);
          batch.forEach(id => next.add(id));
          return next;
        });
        setLoadProgress(Math.min(100, Math.round(((i + BATCH_SIZE) / total) * 100)));
      }
      setIsLoading(false);
    })();
  }, []);

  const results = useMemo((): CardResult[] => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: CardResult[] = [];
    for (const setId of loadedSets) {
      const cards = SET_CARDS[setId];
      if (!cards) continue;
      const setInfo = ALL_SETS.find(s => s.id === setId);
      for (const card of cards) {
        if (card.name.toLowerCase().includes(q))
          out.push({ card: card as PokemonCard, setId, setName: setInfo?.name ?? setId });
      }
    }
    return out.sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [query, loadedSets]);

  const openModal = useCallback(async (result: CardResult) => {
    const { data: invData } = await supabase
      .from("card_inventory").select("card_id, version, quantity")
      .eq("user_id", userId).eq("set_id", result.setId);
    const invMap: InventoryMap = {};
    (invData ?? []).forEach((r: { card_id: string; version: string | null; quantity: number }) => {
      invMap[invKey(r.card_id, r.version ?? "normal")] = r.quantity;
    });
    setModalInventory(invMap);
    setModalTarget({ card: result.card, setId: result.setId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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
        @media (min-width: 480px)  { .buscar-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 768px)  { .buscar-grid { grid-template-columns: repeat(4, 1fr); gap: 14px; } }
        @media (min-width: 1024px) { .buscar-grid { grid-template-columns: repeat(5, 1fr); } }
        .buscar-card-item {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; overflow: hidden;
          display: flex; flex-direction: column;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, transform 0.15s;
        }
        .buscar-card-item:hover {
          border-color: rgba(46,230,193,0.25);
          background: rgba(46,230,193,0.04);
          transform: translateY(-2px);
        }
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

          {/* Progress bar */}
          {isLoading && (
            <div style={{ maxWidth: "560px", marginTop: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                <span style={{ fontFamily: MONO, fontSize: "9px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Cargando sets...
                </span>
                <span style={{ fontFamily: MONO, fontSize: "9px", color: COURT }}>{loadProgress}%</span>
              </div>
              <div style={{ height: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${loadProgress}%`, background: COURT, borderRadius: "2px", transition: "width 0.3s ease" }} />
              </div>
            </div>
          )}
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
          ) : results.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px" }}>
                {isLoading ? "Buscando en sets cargados..." : "Sin resultados"}
              </p>
              {isLoading && (
                <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, opacity: 0.6, margin: 0 }}>
                  Puede aparecer más resultados mientras cargan los sets
                </p>
              )}
            </div>
          ) : (
            <>
              <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.08em", marginBottom: "16px" }}>
                {results.length} resultado{results.length !== 1 ? "s" : ""}
                {isLoading && <span style={{ color: COURT }}> · cargando más...</span>}
              </p>
              <div className="buscar-grid">
                {results.map((r, i) => {
                  const verColor = getVersionColor(r.card.version);
                  const verLabel = getVersionLabel(r.card.version);
                  const setInfo  = ALL_SETS.find(s => s.id === r.setId);
                  return (
                    <div
                      key={`${r.setId}-${r.card.id}-${i}`}
                      className="buscar-card-item"
                      onClick={() => openModal(r)}
                    >
                      <div style={{ position: "relative", width: "100%", aspectRatio: "5/7", background: "rgba(255,255,255,0.03)", flexShrink: 0 }}>
                        <img src={r.card.image} alt={r.card.name} style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />
                        <div style={{
                          position: "absolute", bottom: "8px", right: "8px",
                          fontFamily: MONO, fontSize: "9px", letterSpacing: "0.12em",
                          color: verColor, border: `1px solid ${verColor}55`,
                          borderRadius: "4px", padding: "2px 7px",
                          background: "rgba(5,7,13,0.85)",
                        }}>
                          {verLabel}
                        </div>
                      </div>
                      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontFamily: MONO, fontSize: "11px", color: INK0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.card.name}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: "9px", color: INK2, letterSpacing: "0.06em" }}>
                          #{String(r.card.card_number).padStart(3, "0")}
                        </span>
                        {setInfo && (
                          <div style={{ position: "relative", width: "56px", height: "16px", marginTop: "2px" }}>
                            <Image src={setInfo.logo} alt={setInfo.name} fill style={{ objectFit: "contain", objectPosition: "left center" }} />
                          </div>
                        )}
                      </div>
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
          inventory={modalInventory}
          onInventoryChange={(key, qty) => setModalInventory(prev => ({ ...prev, [key]: qty }))}
          featuredCards={featuredCards}
          onFeaturedChange={setFeaturedCards}
          wishlistCards={wishlistCards}
          onWishlistChange={setWishlistCards}
          userListings={userListings}
          onListingsChange={setUserListings}
          onClose={() => setModalTarget(null)}
        />
      )}
    </>
  );
}
