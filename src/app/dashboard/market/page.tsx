"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { invKey, type InventoryMap, type FeaturedCard, type WishlistCard, type UserListing } from "@/components/CardDetailModal";
import dynamic from "next/dynamic";
const CardDetailModal = dynamic(
  () => import("@/components/CardDetailModal").then(m => ({ default: m.CardDetailModal })),
  { ssr: false }
);
import type { PokemonCard } from "@/data/pokemon-cards-meta";
import { getVersionColor, getVersionLabel } from "@/data/pokemon-cards-meta";
import { BookSearch } from "lucide-react";

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

interface WishlistRow {
  card_id: number | string;
  set_id: string;
  version?: string;
}

function formatCOP(n: number) {
  return n.toLocaleString("es-CO");
}

/* Shared card tile image + info layout */
function CardTile({
  card, setInfo, version, topRight, children, onClick,
}: {
  card: any;
  setInfo: any;
  version: string;
  topRight?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const verColor = getVersionColor(version);
  const verFull  = getVersionLabel(version);
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div onClick={onClick} style={{ position: "relative", width: "100%", aspectRatio: "5/7", cursor: card ? "pointer" : "default", background: "rgba(255,255,255,0.03)", flexShrink: 0 }}>
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
        {topRight}
      </div>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", alignItems: "center" }}>
          <div style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.08em" }}>
            #{String(card?.card_number ?? "???").padStart(3, "0")}
          </div>
          <div style={{ fontFamily: MONO, fontSize: "11px", color: INK0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {card?.name ?? "Carta desconocida"}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            {setInfo ? (
              <div style={{ position: "relative", width: "56px", height: "18px" }}>
                <Image src={setInfo.logo} alt={setInfo.name} fill style={{ objectFit: "contain", objectPosition: "left center" }} />
              </div>
            ) : (
              <span style={{ fontFamily: MONO, fontSize: "9px", color: INK2 }}>—</span>
            )}
          </div>
          <div />
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "80px 40px", textAlign: "center", marginTop: "32px" }}>
      <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.3 }}>{icon}</div>
      <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>{title}</p>
      <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.08em", margin: "10px 0 0", opacity: 0.7 }}>{sub}</p>
    </div>
  );
}

export default function DashboardMarketPage() {
  const [listings, setListings]       = useState<Listing[]>([]);
  const [wishlistRows, setWishlistRows] = useState<WishlistRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [setCards, setSetCards]       = useState<Record<string, any[]>>({});
  const [removing, setRemoving]       = useState<string | null>(null);
  const [userId, setUserId]           = useState<string | null>(null);

  /* Modal state */
  const [modalTarget, setModalTarget]     = useState<{ card: PokemonCard; setId: string } | null>(null);
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
          .select("card_id, set_id, version")
          .eq("user_id", user.id),
      ]);

      const listingRows = (rows ?? []) as Listing[];
      const wishRows    = (wishlist ?? []) as WishlistRow[];

      setListings(listingRows);
      setUserListings(listingRows.map(l => ({ id: l.id, card_id: l.card_id, set_id: l.set_id, price_cop: l.price_cop, version: l.version })));
      setWishlistRows(wishRows);
      if (featured) setFeaturedCards(featured as FeaturedCard[]);
      if (wishlist) setWishlistCards(wishlist as WishlistCard[]);

      /* Load card data for all needed sets (listings + wishlist) */
      const mod = await import("@/data/pokemon-cards");
      const allSetIds = [
        ...new Set([
          ...listingRows.map(l => l.set_id),
          ...wishRows.map(w => w.set_id),
        ]),
      ];
      await mod.loadManySets(allSetIds);
      const needed: Record<string, any[]> = {};
      allSetIds.forEach(id => { needed[id] = mod.SET_CARDS[id] ?? []; });
      setSetCards(needed);
      setLoading(false);
    })();
  }, []);

  /* ── Mi Stock handlers ── */
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

  /* ── Mi Wishlist handlers ── */
  const handleWishlistBought = async (row: WishlistRow) => {
    if (!userId) return;
    const key = `${row.card_id}::${row.set_id}`;
    setRemoving(key);
    const supabase = createClient();

    /* +1 in inventory (upsert) */
    const { data: inv } = await supabase
      .from("card_inventory")
      .select("quantity")
      .eq("user_id", userId).eq("card_id", row.card_id).eq("set_id", row.set_id)
      .single();
    if (inv) {
      await supabase.from("card_inventory")
        .update({ quantity: inv.quantity + 1 })
        .eq("user_id", userId).eq("card_id", row.card_id).eq("set_id", row.set_id);
    } else {
      await supabase.from("card_inventory")
        .insert({ user_id: userId, card_id: row.card_id, set_id: row.set_id, quantity: 1 });
    }

    /* Remove from wishlist */
    await supabase.from("card_wishlist")
      .delete()
      .eq("user_id", userId).eq("card_id", row.card_id).eq("set_id", row.set_id);

    setWishlistRows(prev => prev.filter(w => !(w.card_id === row.card_id && w.set_id === row.set_id)));
    setWishlistCards(prev => prev.filter(w => !(w.card_id === row.card_id && w.set_id === row.set_id)));
    setRemoving(null);
  };

  const handleWishlistRemove = async (row: WishlistRow) => {
    if (!userId) return;
    const key = `${row.card_id}::${row.set_id}`;
    setRemoving(key);
    const supabase = createClient();
    await supabase.from("card_wishlist")
      .delete()
      .eq("user_id", userId).eq("card_id", row.card_id).eq("set_id", row.set_id);
    setWishlistRows(prev => prev.filter(w => !(w.card_id === row.card_id && w.set_id === row.set_id)));
    setWishlistCards(prev => prev.filter(w => !(w.card_id === row.card_id && w.set_id === row.set_id)));
    setRemoving(null);
  };

  /* ── Modal ── */
  const openModal = async (cardId: number | string, setId: string, version: string) => {
    if (!userId) return;
    const cards = setCards[setId];
    const card  = cards?.find((c: any) => c.card_number === cardId && c.version === version);
    if (!card) return;

    const supabase = createClient();
    const { data: invData } = await supabase
      .from("card_inventory")
      .select("card_id, version, quantity")
      .eq("user_id", userId).eq("set_id", setId);

    const invMap: InventoryMap = {};
    (invData ?? []).forEach((r: any) => { invMap[invKey(r.card_id, r.version ?? "normal")] = r.quantity; });
    setModalInventory(invMap);
    setModalTarget({ card, setId });
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

  const sectionTitle = (icon: React.ReactNode, title: string, count: number, unit = "carta") => (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
      <div style={{ color: COURT }}>{icon}</div>
      <div>
        <h2 style={{ fontFamily: DISP, fontSize: "clamp(20px, 2.5vw, 28px)", color: INK0, margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>
        <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, margin: 0, letterSpacing: "0.08em" }}>
          {loading ? "—" : count} {unit}{count !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );

  const cardGrid = (children: React.ReactNode) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginTop: "28px" }}>
      {children}
    </div>
  );

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
      </div>

      <div className="dmkt-body" style={{ display: "flex", flexDirection: "column", gap: "64px" }}>
        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em" }}>
            Cargando...
          </div>
        ) : (
          <>
            {/* ══ MI WISHLIST ══ */}
            <section>
              {sectionTitle(<BookSearch size={22} />, "Mi Wishlist", wishlistRows.length)}
              <div style={{ width: "100%", height: "1px", background: "rgba(255,255,255,0.06)", margin: "16px 0 0" }} />

              {wishlistRows.length === 0 ? (
                <EmptyState icon="◉" title="Tu wishlist está vacía" sub="Agrega cartas desde el inventario para hacer seguimiento" />
              ) : cardGrid(
                wishlistRows.map(row => {
                  const cards   = setCards[row.set_id];
                  const card    = cards?.find((c: any) => c.card_number === row.card_id);
                  const setInfo = ALL_SETS.find(s => s.id === row.set_id);
                  const version = row.version ?? card?.version ?? "normal";
                  const busyKey = `${row.card_id}::${row.set_id}`;
                  const busy    = removing === busyKey;

                  return (
                    <CardTile
                      key={busyKey}
                      card={card}
                      setInfo={setInfo}
                      version={version}
                      onClick={() => openModal(row.card_id, row.set_id, version)}
                    >
                      <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                        <button
                          onClick={() => handleWishlistBought(row)}
                          disabled={busy}
                          style={{ flex: 1, fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#0a0a0a", background: "#2ee696", border: "none", borderRadius: "7px", padding: "8px 4px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1, fontWeight: 700 }}
                        >
                          {busy ? "..." : "Comprada"}
                        </button>
                        <button
                          onClick={() => handleWishlistRemove(row)}
                          disabled={busy}
                          style={{ flex: 1, fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#d95555", border: "1px solid rgba(209,53,53,0.3)", borderRadius: "7px", padding: "8px 4px", background: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}
                        >
                          {busy ? "..." : "Eliminar"}
                        </button>
                      </div>
                    </CardTile>
                  );
                })
              )}
            </section>

            {/* ══ MI STOCK ══ */}
            <section>
              {sectionTitle(<span style={{ fontSize: "20px" }}>◬</span>, "Mi Stock", listings.length)}
              <div style={{ width: "100%", height: "1px", background: "rgba(255,255,255,0.06)", margin: "16px 0 0" }} />

              {listings.length === 0 ? (
                <EmptyState icon="◬" title="No tienes cartas publicadas" sub="Abre una carta en tu inventario y usa el botón Vender" />
              ) : cardGrid(
                listings.map(listing => {
                  const cards   = setCards[listing.set_id];
                  const card    = cards?.find((c: any) => c.card_number === listing.card_id && c.version === listing.version);
                  const setInfo = ALL_SETS.find(s => s.id === listing.set_id);
                  const busy    = removing === listing.id;

                  return (
                    <CardTile
                      key={listing.id}
                      card={card}
                      setInfo={setInfo}
                      version={listing.version}
                      onClick={() => openModal(listing.card_id, listing.set_id, listing.version)}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", gap: "3px", marginTop: "2px" }}>
                        <span style={{ fontFamily: MONO, fontSize: "13px", color: COURT, fontWeight: 700 }}>${formatCOP(listing.price_cop)}</span>
                        <span style={{ fontFamily: MONO, fontSize: "8px", color: INK2, letterSpacing: "0.08em" }}>COP</span>
                      </div>
                      <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
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
                    </CardTile>
                  );
                })
              )}
            </section>
          </>
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
