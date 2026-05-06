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

interface WishlistRow {
  card_id: number | string;
  set_id: string;
}

export default function DashboardWishlistPage() {
  const [wishlistRows, setWishlistRows] = useState<WishlistRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [setCards, setSetCards]         = useState<Record<string, any[]>>({});
  const [removing, setRemoving]         = useState<string | null>(null);
  const [userId, setUserId]             = useState<string | null>(null);

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

      const [{ data: wishlist }, { data: featured }, { data: listings }] = await Promise.all([
        supabase.from("card_wishlist").select("card_id, set_id").eq("user_id", user.id),
        supabase.from("featured_cards").select("card_id, set_id").eq("user_id", user.id),
        supabase.from("market_listings").select("id, card_id, set_id, price_cop, version").eq("user_id", user.id).eq("status", "active"),
      ]);

      const wishRows = (wishlist ?? []) as WishlistRow[];
      setWishlistRows(wishRows);
      setWishlistCards(wishRows as WishlistCard[]);
      if (featured) setFeaturedCards(featured as FeaturedCard[]);
      if (listings) setUserListings(listings as UserListing[]);

      const mod = await import("@/data/pokemon-cards");
      const setIds = [...new Set(wishRows.map(w => w.set_id))];
      await mod.loadManySets(setIds);
      const needed: Record<string, any[]> = {};
      setIds.forEach(id => { needed[id] = mod.SET_CARDS[id] ?? []; });
      setSetCards(needed);
      setLoading(false);
    })();
  }, []);

  const handleBought = async (row: WishlistRow) => {
    if (!userId) return;
    const key = `${row.card_id}::${row.set_id}`;
    setRemoving(key);
    const supabase = createClient();

    const cards      = setCards[row.set_id] ?? [];
    const card       = cards.find((c: any) => c.id === row.card_id);
    const cardNumber = card?.card_number ?? row.card_id;

    const { data: inv } = await supabase
      .from("card_inventory").select("quantity")
      .eq("user_id", userId).eq("card_id", cardNumber).eq("set_id", row.set_id)
      .single();
    if (inv) {
      await supabase.from("card_inventory").update({ quantity: inv.quantity + 1 })
        .eq("user_id", userId).eq("card_id", cardNumber).eq("set_id", row.set_id);
    } else {
      await supabase.from("card_inventory")
        .insert({ user_id: userId, card_id: cardNumber, set_id: row.set_id, quantity: 1 });
    }

    await supabase.from("card_wishlist").delete()
      .eq("user_id", userId).eq("card_id", row.card_id).eq("set_id", row.set_id);

    setWishlistRows(prev => prev.filter(w => !(w.card_id === row.card_id && w.set_id === row.set_id)));
    setWishlistCards(prev => prev.filter(w => !(w.card_id === row.card_id && w.set_id === row.set_id)));
    setRemoving(null);
  };

  const handleRemove = async (row: WishlistRow) => {
    if (!userId) return;
    const key = `${row.card_id}::${row.set_id}`;
    setRemoving(key);
    const supabase = createClient();
    await supabase.from("card_wishlist").delete()
      .eq("user_id", userId).eq("card_id", row.card_id).eq("set_id", row.set_id);
    setWishlistRows(prev => prev.filter(w => !(w.card_id === row.card_id && w.set_id === row.set_id)));
    setWishlistCards(prev => prev.filter(w => !(w.card_id === row.card_id && w.set_id === row.set_id)));
    setRemoving(null);
  };

  const openModal = async (row: WishlistRow) => {
    if (!userId) return;
    const cards = setCards[row.set_id];
    const card  = cards?.find((c: any) => c.id === row.card_id);
    if (!card) return;

    const supabase = createClient();
    const { data: invData } = await supabase
      .from("card_inventory").select("card_id, version, quantity")
      .eq("user_id", userId).eq("set_id", row.set_id);

    const invMap: InventoryMap = {};
    (invData ?? []).forEach((r: any) => { invMap[invKey(r.card_id, r.version ?? "normal")] = r.quantity; });
    setModalInventory(invMap);
    setModalTarget({ card, setId: row.set_id });
  };

  const handleInventoryChange = useCallback((key: string, qty: number) => {
    setModalInventory(prev => ({ ...prev, [key]: qty }));
  }, []);

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        .dwish-header { padding: 24px 20px 0; }
        .dwish-body   { padding: 24px 20px 64px; }
        @media (min-width: 768px) {
          .dwish-header { padding: 48px 48px 0; }
          .dwish-body   { padding: 32px 48px 80px; }
        }
      `}</style>

      <div className="dwish-header">
        <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
          Market
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
          <BookSearch size={26} color={COURT} />
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(24px, 3vw, 36px)", color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            Mi Wishlist
          </h1>
        </div>
        <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, margin: 0, letterSpacing: "0.08em" }}>
          {loading ? "—" : wishlistRows.length} carta{wishlistRows.length !== 1 ? "s" : ""} en tu wishlist
        </p>
      </div>

      <div className="dwish-body">
        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em" }}>
            Cargando...
          </div>
        ) : wishlistRows.length === 0 ? (
          <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "80px 40px", textAlign: "center", marginTop: "32px" }}>
            <div style={{ marginBottom: "16px", opacity: 0.3 }}><BookSearch size={40} color={INK2} /></div>
            <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              Tu wishlist está vacía
            </p>
            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.08em", margin: "10px 0 0", opacity: 0.7 }}>
              Agrega cartas desde el inventario para hacer seguimiento
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginTop: "28px" }}>
            {wishlistRows.map(row => {
              const cards   = setCards[row.set_id];
              const card    = cards?.find((c: any) => c.id === row.card_id);
              const setInfo = ALL_SETS.find(s => s.id === row.set_id);
              const version = card?.version ?? "normal";
              const verColor = getVersionColor(version);
              const verFull  = getVersionLabel(version);
              const busyKey  = `${row.card_id}::${row.set_id}`;
              const busy     = removing === busyKey;

              return (
                <div key={busyKey} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div onClick={() => openModal(row)} style={{ position: "relative", width: "100%", aspectRatio: "5/7", cursor: card ? "pointer" : "default", background: "rgba(255,255,255,0.03)", flexShrink: 0 }}>
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

                    <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                      <button
                        onClick={() => handleBought(row)}
                        disabled={busy}
                        style={{ flex: 1, fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#0a0a0a", background: "#2ee696", border: "none", borderRadius: "7px", padding: "8px 4px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1, fontWeight: 700 }}
                      >
                        {busy ? "..." : "Comprada"}
                      </button>
                      <button
                        onClick={() => handleRemove(row)}
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
