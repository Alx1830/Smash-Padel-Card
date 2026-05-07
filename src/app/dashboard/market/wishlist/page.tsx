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

  const [fNombre,   setFNombre]   = useState("");
  const [fSet,      setFSet]      = useState("");
  const [fVariante, setFVariante] = useState("");

  const resolved = useMemo(() =>
    wishlistRows.map(w => {
      const cards = setCards[w.set_id];
      const card  = cards?.find((c: any) => c.id === w.card_id);
      const set   = ALL_SETS.find(s => s.id === w.set_id);
      return card && set ? { card, set, row: w } : null;
    }).filter(Boolean) as { card: any; set: any; row: WishlistRow }[]
  , [wishlistRows, setCards]);

  const setVersions = useMemo(() => {
    const vs = new Set<string>();
    resolved.forEach(r => vs.add(r.card.version));
    return [...vs].sort();
  }, [resolved]);

  const filtered = useMemo(() => resolved.filter(r => {
    if (fNombre.trim() && !r.card.name.toLowerCase().includes(fNombre.trim().toLowerCase())) return false;
    if (fSet && r.row.set_id !== fSet) return false;
    if (fVariante && r.card.version !== fVariante) return false;
    return true;
  }), [resolved, fNombre, fSet, fVariante]);

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

      // Mostrar grid inmediatamente — sets cargan en background
      setLoading(false);

      const setIds = [...new Set(wishRows.map(w => w.set_id))];
      for (const setId of setIds) {
        await loadManySets([setId]);
        setSetCards(prev => ({ ...prev, [setId]: SET_CARDS[setId] ?? [] }));
      }
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
        @keyframes dwish-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
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

      <style>{`
        .dwish-layout { display: flex; gap: 32px; align-items: flex-start; }
        .dwish-sidebar { width: 220px; flex-shrink: 0; }
        .dwish-grid-area { flex: 1; min-width: 0; }
        @media (max-width: 1023px) { .dwish-layout { flex-direction: column; } .dwish-sidebar { display: none; } }
      `}</style>

      <div className="dwish-body">
        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em" }}>
            Cargando...
          </div>
        ) : (
          <div className="dwish-layout" style={{ marginTop: "28px" }}>

            {/* ── Sidebar filtros ── */}
            <aside className="dwish-sidebar">
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
                    {ALL_SETS.filter(s => resolved.some(r => r.row.set_id === s.id)).map(s => (
                      <option key={s.id} value={s.id} style={{ background: "#0a0e1a", color: INK0 }}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </aside>

            {/* ── Grid ── */}
            <div className="dwish-grid-area">
              {wishlistRows.length === 0 ? (
                <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "80px 40px", textAlign: "center" }}>
                  <div style={{ marginBottom: "16px", opacity: 0.3 }}><BookSearch size={40} color={INK2} /></div>
                  <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Tu wishlist está vacía</p>
                  <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.08em", margin: "10px 0 0", opacity: 0.7 }}>Agrega cartas desde el inventario para hacer seguimiento</p>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "60px 40px", textAlign: "center" }}>
                  <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>Ningún resultado</p>
                  <button onClick={clearFilters} style={{ fontFamily: MONO, fontSize: "10px", color: COURT, background: "none", border: `1px solid ${COURT}44`, borderRadius: "6px", padding: "6px 16px", cursor: "pointer" }}>Limpiar filtros</button>
                </div>
              ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }} className="dwish-cards-grid">
                <style>{`@media (max-width: 767px) { .dwish-cards-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; } }`}</style>
                {filtered.map(({ card, set, row }) => {
                  const version = card?.version ?? "normal";
                  const verColor = getVersionColor(version);
                  const verFull  = getVersionLabel(version);
                  const busyKey  = `${row.card_id}::${row.set_id}`;
                  const busy     = removing === busyKey;

              return (
                <div key={busyKey} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div onClick={() => openModal(row)} style={{ position: "relative", width: "100%", aspectRatio: "5/7", cursor: card ? "pointer" : "default", background: "rgba(255,255,255,0.03)", flexShrink: 0 }}>
                    {card ? (
                      <Image src={card.image} alt={card.name} fill style={{ objectFit: "cover" }} sizes="220px" loading="lazy" />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)", backgroundSize: "200% 100%", animation: "dwish-shimmer 1.4s ease-in-out infinite" }} />
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
                        {set ? (
                          <div style={{ position: "relative", width: "56px", height: "18px" }}>
                            <Image src={set.logo} alt={set.name} fill style={{ objectFit: "contain", objectPosition: "left center" }} />
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
