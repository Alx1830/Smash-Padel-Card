"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { getVersionColor, getVersionLabel } from "@/data/pokemon-cards-meta";
import { invKey, type InventoryMap, type FeaturedCard, type WishlistCard, type UserListing } from "@/components/CardDetailModal";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";

const CardDetailModal = dynamic(
  () => import("@/components/CardDetailModal").then(m => ({ default: m.CardDetailModal })),
  { ssr: false }
);

import type { PokemonCard } from "@/data/pokemon-cards-meta";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const ALL_SET_IDS = POKEMON_SERIES.flatMap(s => s.sets).map(s => s.id);
const ALL_SETS    = POKEMON_SERIES.flatMap(s => s.sets);
const BATCH_SIZE  = 12;

interface CardResult {
  card:   PokemonCard;
  setId:  string;
  setName: string;
}

export default function CardSearchPage() {
  const [query,        setQuery]        = useState("");
  const [loadedSets,   setLoadedSets]   = useState<Set<string>>(new Set());
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoading,    setIsLoading]    = useState(false);
  const [userId,       setUserId]       = useState<string | null>(null);

  /* Modal state */
  const [modalTarget,     setModalTarget]     = useState<{ card: PokemonCard; setId: string } | null>(null);
  const [modalInventory,  setModalInventory]  = useState<InventoryMap>({});
  const [featuredCards,   setFeaturedCards]   = useState<FeaturedCard[]>([]);
  const [wishlistCards,   setWishlistCards]   = useState<WishlistCard[]>([]);
  const [userListings,    setUserListings]    = useState<UserListing[]>([]);

  const loadingRef = useRef(false);

  /* Fetch userId + modal data once */
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const [{ data: featured }, { data: wishlist }, { data: listings }] = await Promise.all([
        supabase.from("featured_cards").select("card_id, set_id").eq("user_id", user.id),
        supabase.from("card_wishlist").select("card_id, set_id").eq("user_id", user.id),
        supabase.from("market_listings").select("id, card_id, set_id, price_cop, version").eq("user_id", user.id).eq("status", "active"),
      ]);
      if (featured)  setFeaturedCards(featured as FeaturedCard[]);
      if (wishlist)  setWishlistCards(wishlist as WishlistCard[]);
      if (listings)  setUserListings(listings as UserListing[]);
    })();
  }, []);

  /* Load all sets progressively in background */
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
        if (card.name.toLowerCase().includes(q)) {
          out.push({ card: card as PokemonCard, setId, setName: setInfo?.name ?? setId });
        }
      }
    }
    return out.sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [query, loadedSets]);

  const openModal = useCallback(async (result: CardResult) => {
    if (!userId) return;
    const supabase = createClient();
    const { data: invData } = await supabase
      .from("card_inventory").select("card_id, version, quantity")
      .eq("user_id", userId).eq("set_id", result.setId);
    const invMap: InventoryMap = {};
    (invData ?? []).forEach((r: any) => { invMap[invKey(r.card_id, r.version ?? "normal")] = r.quantity; });
    setModalInventory(invMap);
    setModalTarget({ card: result.card, setId: result.setId });
  }, [userId]);

  const handleInventoryChange = useCallback((key: string, qty: number) => {
    setModalInventory(prev => ({ ...prev, [key]: qty }));
  }, []);

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        .cards-header { padding: 24px 20px 0; }
        .cards-body   { padding: 24px 20px 80px; }
        @media (min-width: 768px) {
          .cards-header { padding: 48px 48px 0; }
          .cards-body   { padding: 32px 48px 80px; }
        }
        .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
        @media (max-width: 767px) { .cards-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; } }
      `}</style>

      <div className="cards-header">
        <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
          Inventario
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
          <Search size={26} color={COURT} />
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(24px, 3vw, 36px)", color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            Buscar Carta
          </h1>
        </div>
        <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, margin: 0, letterSpacing: "0.08em" }}>
          Busca cualquier carta del Pokémon TCG
        </p>
      </div>

      <div className="cards-body">

        {/* Search input */}
        <div style={{ position: "relative", maxWidth: "480px", marginBottom: "12px" }}>
          <Search size={16} color={INK2} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ej: Charizard, Pikachu, Eevee..."
            style={{
              width: "100%", padding: "12px 16px 12px 40px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: INK0, fontFamily: MONO, fontSize: "13px",
              outline: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.target.style.borderColor = `${COURT}66`)}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            autoFocus
          />
        </div>

        {/* Progress bar */}
        {isLoading && (
          <div style={{ maxWidth: "480px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
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

        {/* Results */}
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
            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.08em", marginBottom: "20px" }}>
              {results.length} resultado{results.length !== 1 ? "s" : ""}
              {isLoading && <span style={{ color: COURT }}> · cargando más...</span>}
            </p>
            <div className="cards-grid">
              {results.map((r, i) => {
                const verColor = getVersionColor(r.card.version);
                const verLabel = getVersionLabel(r.card.version);
                const setInfo  = ALL_SETS.find(s => s.id === r.setId);
                return (
                  <div
                    key={`${r.setId}-${r.card.id}-${i}`}
                    onClick={() => openModal(r)}
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden", display: "flex", flexDirection: "column", cursor: "pointer" }}
                  >
                    <div style={{ position: "relative", width: "100%", aspectRatio: "5/7", background: "rgba(255,255,255,0.03)", flexShrink: 0 }}>
                      <img src={r.card.image} alt={r.card.name} style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />
                      <div style={{ position: "absolute", bottom: "8px", right: "8px", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.12em", color: verColor, border: `1px solid ${verColor}55`, borderRadius: "4px", padding: "2px 7px", background: "rgba(5,7,13,0.85)" }}>
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

      {modalTarget && userId && (
        <CardDetailModal
          card={modalTarget.card}
          setId={modalTarget.setId}
          userId={userId}
          inventory={modalInventory}
          onInventoryChange={handleInventoryChange}
          featuredCards={featuredCards}
          onFeaturedChange={setFeaturedCards}
          wishlistCards={wishlistCards}
          onWishlistChange={setWishlistCards}
          userListings={userListings}
          onListingsChange={setUserListings}
          onClose={() => setModalTarget(null)}
        />
      )}
    </div>
  );
}
