"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { CardDetailModal, invKey, type InventoryMap, type FeaturedCard, type WishlistCard, type UserListing } from "@/components/CardDetailModal";
import type { PokemonCard } from "@/data/pokemon-cards-meta";
import { getVersionColor, getVersionLabel } from "@/data/pokemon-cards-meta";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const ALL_SETS = POKEMON_SERIES.flatMap(s => s.sets);


interface Listing {
  id: string;
  card_id: number | string;
  set_id: string;
  price_cop: number;
  version: string;
  created_at: string;
}

function formatCOP(n: number) {
  return n.toLocaleString("es-CO");
}

export default function DashboardMarketPage() {
  const [listings, setListings]   = useState<Listing[]>([]);
  const [loading, setLoading]     = useState(true);
  const [setCards, setSetCards]   = useState<Record<string, any[]>>({});
  const [removing, setRemoving]   = useState<string | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);

  /* Modal state */
  const [modalTarget, setModalTarget] = useState<{ card: PokemonCard; setId: string } | null>(null);
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
          .select("id, card_id, set_id, price_cop, version, created_at")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        supabase
          .from("featured_cards")
          .select("card_id, set_id")
          .eq("user_id", user.id),
        supabase
          .from("card_wishlist")
          .select("card_id, set_id")
          .eq("user_id", user.id),
      ]);

      const listingRows = (rows ?? []) as Listing[];
      setListings(listingRows);
      setUserListings(listingRows.map(l => ({ id: l.id, card_id: l.card_id, set_id: l.set_id, price_cop: l.price_cop, version: l.version })));
      if (featured) setFeaturedCards(featured as FeaturedCard[]);
      if (wishlist) setWishlistCards(wishlist as WishlistCard[]);

      const mod = await import("@/data/pokemon-cards");
      const needed: Record<string, any[]> = {};
      listingRows.forEach(l => { if (!needed[l.set_id]) needed[l.set_id] = mod.SET_CARDS[l.set_id] ?? []; });
      setSetCards(needed);
      setLoading(false);
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
      .from("card_inventory")
      .select("quantity")
      .eq("user_id", uid)
      .eq("card_id", listing.card_id)
      .eq("set_id", listing.set_id)
      .single();
    if (inv) {
      const next = inv.quantity - 1;
      if (next <= 0) {
        await supabase.from("card_inventory")
          .delete()
          .eq("user_id", uid).eq("card_id", listing.card_id).eq("set_id", listing.set_id);
      } else {
        await supabase.from("card_inventory")
          .update({ quantity: next })
          .eq("user_id", uid).eq("card_id", listing.card_id).eq("set_id", listing.set_id);
      }
    }
    setListings(prev => prev.filter(l => l.id !== listing.id));
    setUserListings(prev => prev.filter(l => l.id !== listing.id));
    setRemoving(null);
  };

  const openModal = async (listing: Listing) => {
    const cards = setCards[listing.set_id];
    const card = cards?.find((c: any) => c.card_number === listing.card_id && c.version === listing.version);
    if (!card || !userId) return;

    const supabase = createClient();
    const { data: invData } = await supabase
      .from("card_inventory")
      .select("card_id, version, quantity")
      .eq("user_id", userId)
      .eq("set_id", listing.set_id);

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
        .map(l => {
          const u = updated.find(u => u.id === l.id);
          return u ? { ...l, price_cop: u.price_cop } : l;
        })
        .concat(
          updated
            .filter(u => !prev.some(l => l.id === u.id))
            .map(u => ({ id: u.id, card_id: u.card_id, set_id: u.set_id, price_cop: u.price_cop, version: u.version, created_at: new Date().toISOString() }))
        )
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
      `}</style>

      <div className="dmkt-header">
        <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
          Market
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "clamp(24px, 3vw, 36px)", color: INK0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
          Mis publicaciones
        </h1>
        <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, margin: 0, letterSpacing: "0.08em" }}>
          {loading ? "—" : listings.length} carta{listings.length !== 1 ? "s" : ""} en venta
        </p>
      </div>

      <div className="dmkt-body">
        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em" }}>
            Cargando...
          </div>
        ) : listings.length === 0 ? (
          <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "80px 40px", textAlign: "center", marginTop: "32px" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.3 }}>◬</div>
            <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              No tienes cartas publicadas
            </p>
            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.08em", margin: "10px 0 0", opacity: 0.7 }}>
              Abre una carta en tu inventario y usa el botón Vender
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "16px",
            marginTop: "28px",
          }}>
            {listings.map(listing => {
              const cards    = setCards[listing.set_id];
              const card     = cards?.find((c: any) => c.card_number === listing.card_id && c.version === listing.version);
              const setInfo  = ALL_SETS.find(s => s.id === listing.set_id);
              const verColor = getVersionColor(listing.version);
              const verFull  = getVersionLabel(listing.version);
              const busy     = removing === listing.id;

              return (
                <div
                  key={listing.id}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "14px", overflow: "hidden",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  {/* Imagen clickeable → abre CardDetailModal */}
                  <div
                    onClick={() => openModal(listing)}
                    style={{ position: "relative", width: "100%", aspectRatio: "5/7", cursor: card ? "pointer" : "default", background: "rgba(255,255,255,0.03)", flexShrink: 0 }}
                  >
                    {card ? (
                      <Image src={card.image} alt={card.name} fill style={{ objectFit: "cover" }} sizes="220px" />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: INK2, fontSize: "24px" }}>?</span>
                      </div>
                    )}
                    <div style={{ position: "absolute", bottom: "8px", right: "8px", fontFamily: MONO, fontSize: "9px", letterSpacing: "0.12em", color: verColor, border: `1px solid ${verColor}55`, borderRadius: "4px", padding: "2px 7px", background: "rgba(5,7,13,0.85)" }}>
                      {verFull}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                    {/* Grid 2x2 */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", alignItems: "center" }}>
                      {/* Fila 1: número | nombre */}
                      <div style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.08em" }}>
                        #{String(card?.card_number ?? listing.card_id).padStart(3, "0")}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: "11px", color: INK0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {card?.name ?? `Carta #${listing.card_id}`}
                      </div>
                      {/* Fila 2: set | precio */}
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
                        <span style={{ fontFamily: MONO, fontSize: "13px", color: COURT, fontWeight: 700 }}>${formatCOP(listing.price_cop)}</span>
                        <span style={{ fontFamily: MONO, fontSize: "8px", color: INK2, letterSpacing: "0.08em" }}>COP</span>
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

      {/* Full card detail modal */}
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
