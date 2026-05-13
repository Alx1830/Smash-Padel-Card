"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { loadManySets, SET_CARDS } from "@/data/pokemon-cards";
import { invKey, type InventoryMap, type FeaturedCard, type WishlistCard, type UserListing } from "@/components/CardDetailModal";
import dynamic from "next/dynamic";
const CardDetailModal = dynamic(
  () => import("@/components/CardDetailModal").then(m => ({ default: m.CardDetailModal })),
  { ssr: false }
);
import type { PokemonCard } from "@/data/pokemon-cards-meta";
import { getVersionColor, getVersionLabel } from "@/data/pokemon-cards-meta";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const ALL_SETS = POKEMON_SERIES.flatMap(s => s.sets);

import { formatPrice, CURRENCY_SYMBOL } from "@/lib/currency";

interface Listing {
  id: string;
  card_id: number | string;
  set_id: string;
  price_cop: number;
  currency: string;
  version: string;
  created_at: string;
}

export default function DashboardMarketPage() {
  const [listings, setListings]   = useState<Listing[]>([]);
  const [loading, setLoading]     = useState(true);
  const [setCards, setSetCards]   = useState<Record<string, any[]>>({});
  const [removing, setRemoving]   = useState<string | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);

  const [fNombre,   setFNombre]   = useState("");
  const [fSet,      setFSet]      = useState("");
  const [fVariante, setFVariante] = useState("");

  const setVersions = useMemo(() => {
    const vs = new Set<string>();
    listings.forEach(l => vs.add(l.version));
    return [...vs].sort();
  }, [listings]);

  const filtered = useMemo(() => listings.filter(l => {
    const cards = setCards[l.set_id];
    const card  = cards?.find((c: any) => c.card_number === l.card_id && c.version === l.version);
    if (fNombre.trim() && !card?.name?.toLowerCase().includes(fNombre.trim().toLowerCase())) return false;
    if (fSet && l.set_id !== fSet) return false;
    if (fVariante && l.version !== fVariante) return false;
    return true;
  }), [listings, setCards, fNombre, fSet, fVariante]);

  const hasFilters = fNombre || fSet || fVariante;
  function clearFilters() { setFNombre(""); setFSet(""); setFVariante(""); }

  /* Modal state */
  const [modalTarget, setModalTarget]       = useState<{ card: PokemonCard; setId: string } | null>(null);
  const [modalInventory, setModalInventory] = useState<InventoryMap>({});
  const [featuredCards, setFeaturedCards]   = useState<FeaturedCard[]>([]);
  const [wishlistCards, setWishlistCards]   = useState<WishlistCard[]>([]);
  const [userListings, setUserListings]     = useState<UserListing[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: rows }, { data: featured }, { data: wishlist }] = await Promise.all([
        supabase
          .from("market_listings")
          .select("id, card_id, set_id, price_cop, currency, version, created_at")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        supabase.from("featured_cards").select("card_id, set_id").eq("user_id", user.id),
        supabase.from("card_wishlist").select("card_id, set_id").eq("user_id", user.id),
      ]);

      const listingRows = (rows ?? []) as Listing[];
      setListings(listingRows);
      setUserListings(listingRows.map(l => ({ id: l.id, card_id: l.card_id, set_id: l.set_id, price_cop: l.price_cop, currency: l.currency, version: l.version })));
      if (featured) setFeaturedCards(featured as FeaturedCard[]);
      if (wishlist) setWishlistCards(wishlist as WishlistCard[]);

      // Mostrar grid inmediatamente — sets cargan en background
      setLoading(false);

      const setIds = [...new Set(listingRows.map(l => l.set_id))];
      for (const setId of setIds) {
        await loadManySets([setId]);
        setSetCards(prev => ({ ...prev, [setId]: SET_CARDS[setId] ?? [] }));
      }
    })();
  }, []);

  const handleRemove = async (id: string) => {
    setRemoving(id);
    const supabase = createClient();
    await supabase.from("market_listings").update({ status: "removed" }).eq("id", id);
    setListings(prev => prev.filter(l => l.id !== id));
    setUserListings(prev => prev.filter(l => l.id !== id));
    setRemoving(null);
  };

  const handleSold = async (listing: Listing, uid: string) => {
    setRemoving(listing.id);
    const supabase = createClient();
    await supabase.from("market_listings").update({ status: "sold" }).eq("id", listing.id);
    const { data: inv } = await supabase
      .from("card_inventory").select("quantity")
      .eq("user_id", uid).eq("card_id", listing.card_id).eq("set_id", listing.set_id)
      .single();
    if (inv) {
      const next = inv.quantity - 1;
      if (next <= 0) {
        await supabase.from("card_inventory").delete()
          .eq("user_id", uid).eq("card_id", listing.card_id).eq("set_id", listing.set_id);
      } else {
        await supabase.from("card_inventory").update({ quantity: next })
          .eq("user_id", uid).eq("card_id", listing.card_id).eq("set_id", listing.set_id);
      }
    }
    setListings(prev => prev.filter(l => l.id !== listing.id));
    setUserListings(prev => prev.filter(l => l.id !== listing.id));
    setRemoving(null);
  };

  const openModal = async (listing: Listing) => {
    if (!userId) return;
    const cards = setCards[listing.set_id];
    const card  = cards?.find((c: any) => c.card_number === listing.card_id && c.version === listing.version);
    if (!card) return;

    const supabase = createClient();
    const { data: invData } = await supabase
      .from("card_inventory").select("card_id, version, quantity")
      .eq("user_id", userId).eq("set_id", listing.set_id);

    const invMap: InventoryMap = {};
    (invData ?? []).forEach((r: any) => { invMap[invKey(r.card_id, r.version ?? "normal")] = r.quantity; });
    setModalInventory(invMap);
    setModalTarget({ card, setId: listing.set_id });
  };

  const handleInventoryChange = useCallback((key: string, qty: number) => {
    setModalInventory(prev => ({ ...prev, [key]: qty }));
  }, []);

  const handleListingsChange = useCallback((updated: UserListing[]) => {
    setUserListings(updated);
    setListings(prev =>
      prev.filter(l => updated.some(u => u.id === l.id))
        .map(l => { const u = updated.find(u => u.id === l.id); return u ? { ...l, price_cop: u.price_cop } : l; })
        .concat(updated.filter(u => !prev.some(l => l.id === u.id))
          .map(u => ({ id: u.id, card_id: u.card_id, set_id: u.set_id, price_cop: u.price_cop, currency: (u as Listing).currency ?? "COP", version: u.version, created_at: new Date().toISOString() })))
    );
  }, []);

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        .dmkt-header { padding: 24px 20px 0; }
        .dmkt-body   { padding: 24px 20px 64px; }
        @media (min-width: 768px) {
          .dmkt-header { padding: 48px 48px 0; }
          .dmkt-body   { padding: 32px 48px 80px; }
        }
        @keyframes dmkt-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      <div className="dmkt-header">
        <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
          Market
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "clamp(24px, 3vw, 36px)", color: INK0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
          Mi Stock
        </h1>
        <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, margin: 0, letterSpacing: "0.08em" }}>
          {loading ? "—" : listings.length} carta{listings.length !== 1 ? "s" : ""} en venta
        </p>
      </div>

      <style>{`
        .dmkt-layout { display: flex; gap: 32px; align-items: flex-start; }
        .dmkt-sidebar { width: 220px; flex-shrink: 0; }
        .dmkt-grid-area { flex: 1; min-width: 0; }
        @media (max-width: 1023px) { .dmkt-layout { flex-direction: column; } .dmkt-sidebar { display: none; } }
      `}</style>

      <div className="dmkt-body">
        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em" }}>
            Cargando...
          </div>
        ) : (
          <div className="dmkt-layout" style={{ marginTop: "28px" }}>

            {/* ── Sidebar filtros ── */}
            <aside className="dmkt-sidebar">
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "20px", position: "sticky", top: "80px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                  <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: COURT }}>Filtros</span>
                  {hasFilters && (
                    <button onClick={clearFilters} style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#d95555", background: "none", border: "1px solid rgba(209,53,53,0.3)", borderRadius: "5px", padding: "3px 10px", cursor: "pointer" }}>
                      Limpiar
                    </button>
                  )}
                </div>
                <div>
                  <label style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, display: "block", marginBottom: "8px" }}>Nombre de carta</label>
                  <input value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder="Ej: Pikachu..." style={{ width: "100%", padding: "8px 10px", borderRadius: "7px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: INK0, fontFamily: MONO, fontSize: "12px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "18px 0" }} />
                <div>
                  <label style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, display: "block", marginBottom: "8px" }}>Variante</label>
                  <select value={fVariante} onChange={e => setFVariante(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: "7px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: INK0, fontFamily: MONO, fontSize: "12px", outline: "none", boxSizing: "border-box", cursor: "pointer", appearance: "none" }}>
                    <option value="" style={{ background: "#0a0e1a" }}>Todas las variantes</option>
                    {setVersions.map(v => <option key={v} value={v} style={{ background: "#0a0e1a", color: INK0 }}>{getVersionLabel(v)}</option>)}
                  </select>
                </div>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "18px 0" }} />
                <div>
                  <label style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, display: "block", marginBottom: "8px" }}>Set</label>
                  <select value={fSet} onChange={e => setFSet(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: "7px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: INK0, fontFamily: MONO, fontSize: "12px", outline: "none", boxSizing: "border-box", cursor: "pointer", appearance: "none" }}>
                    <option value="" style={{ background: "#0a0e1a" }}>Todos los sets</option>
                    {ALL_SETS.filter(s => listings.some(l => l.set_id === s.id)).map(s => (
                      <option key={s.id} value={s.id} style={{ background: "#0a0e1a", color: INK0 }}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </aside>

            {/* ── Grid ── */}
            <div className="dmkt-grid-area">
              {listings.length === 0 ? (
                <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "80px 40px", textAlign: "center" }}>
                  <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.3 }}>◬</div>
                  <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>No tienes cartas publicadas</p>
                  <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.08em", margin: "10px 0 0", opacity: 0.7 }}>Abre una carta en tu inventario y usa el botón Vender</p>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "60px 40px", textAlign: "center" }}>
                  <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>Ningún resultado</p>
                  <button onClick={clearFilters} style={{ fontFamily: MONO, fontSize: "10px", color: COURT, background: "none", border: `1px solid ${COURT}44`, borderRadius: "6px", padding: "6px 16px", cursor: "pointer" }}>Limpiar filtros</button>
                </div>
              ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }} className="dmkt-cards-grid">
                <style>{`@media (max-width: 767px) { .dmkt-cards-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; } }`}</style>
                {filtered.map(listing => {
              const cards   = setCards[listing.set_id];
              const card    = cards?.find((c: any) => c.card_number === listing.card_id && c.version === listing.version);
              const setInfo = ALL_SETS.find(s => s.id === listing.set_id);
              const verColor = getVersionColor(listing.version);
              const verFull  = getVersionLabel(listing.version);
              const busy     = removing === listing.id;

              return (
                <div key={listing.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div onClick={() => openModal(listing)} style={{ position: "relative", width: "100%", aspectRatio: "5/7", cursor: card ? "pointer" : "default", background: "rgba(255,255,255,0.03)", flexShrink: 0 }}>
                    {card ? (
                      <img src={card.image} alt={card.name} loading="lazy" style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)", backgroundSize: "200% 100%", animation: "dmkt-shimmer 1.4s ease-in-out infinite" }} />
                    )}
                    <div style={{ position: "absolute", bottom: "8px", right: "8px", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.12em", color: verColor, border: `1px solid ${verColor}55`, borderRadius: "4px", padding: "2px 7px", background: "rgba(5,7,13,0.85)" }}>
                      {verFull}
                    </div>
                  </div>

                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", alignItems: "center" }}>
                      <div style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.08em" }}>
                        #{String(card?.card_number ?? listing.card_id).padStart(3, "0")}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: "11px", color: INK0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {card?.name ?? `Carta #${listing.card_id}`}
                      </div>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {setInfo ? (
                          <div style={{ position: "relative", width: "56px", height: "18px" }}>
                            <Image src={setInfo.logo} alt={setInfo.name} fill style={{ objectFit: "contain", objectPosition: "left center" }} />
                          </div>
                        ) : (
                          <span style={{ fontFamily: MONO, fontSize: "9px", color: INK2 }}>{listing.set_id}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                        <span style={{ fontFamily: MONO, fontSize: "13px", color: COURT, fontWeight: 700 }}>{CURRENCY_SYMBOL[listing.currency] ?? "$"}{formatPrice(listing.price_cop, listing.currency)}</span>
                        <span style={{ fontFamily: MONO, fontSize: "8px", color: INK2, letterSpacing: "0.08em" }}>{listing.currency}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                      <button
                        onClick={() => userId && handleSold(listing, userId)}
                        disabled={busy}
                        style={{ flex: 1, fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#0a0a0a", background: "#2ee696", border: "none", borderRadius: "7px", padding: "8px 4px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1, fontWeight: 700 }}
                      >
                        {busy ? "..." : "Vendido"}
                      </button>
                      <button
                        onClick={() => handleRemove(listing.id)}
                        disabled={busy}
                        style={{ flex: 1, fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#d95555", border: "1px solid rgba(209,53,53,0.3)", borderRadius: "7px", padding: "8px 4px", background: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}
                      >
                        {busy ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
              </div>
              )}
            </div>
          </div>
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
          onListingsChange={handleListingsChange}
          onClose={() => setModalTarget(null)}
        />
      )}
    </div>
  );
}
