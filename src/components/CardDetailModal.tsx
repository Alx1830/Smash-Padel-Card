"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { getVersionLabel, getVersionEffect, getVersionColor, type PokemonCard } from "@/data/pokemon-cards-meta";
import { getCurrencyForCountry, formatPrice, CURRENCY_SYMBOL } from "@/lib/currency";
import { useScrydexPrice, SCRYDEX_SET_CODES } from "@/hooks/useScrydexPrice";

export const COURT = "#2ee6c1";
export const INK0  = "#f5f7fb";
export const INK2  = "#7a8298";
export const BG0   = "#05070d";
export const MONO  = "var(--font-jetbrains)";
export const DISP  = "var(--font-archivo)";

export const VERSION_COLOR: Record<string, string> = {
  N:   "#f5f7fb",
  RH:  "#2ee6c1",
  H:   "#ffd24f",
  ESP: "#2ee6c1",
  PB:  "#2ee6c1",
};

export const VERSION_FULL: Record<string, string> = {
  N:   "Normal",
  RH:  "Reverse Holo",
  H:   "Holofoil",
  ESP: "Energy Symbol",
  PB:  "Poke Ball",
};

export const ALL_SETS_FLAT = POKEMON_SERIES.flatMap(s => s.sets);

export type InventoryMap = Record<string, number>;
export type FeaturedCard  = { card_id: number | string; set_id: string };
export type WishlistCard  = { card_id: number | string; set_id: string };
export type UserListing   = { id: string; card_id: number | string; set_id: string; price_cop: number; version: string; currency?: string };

export function invKey(cardId: number | string, version: string): string {
  return `${cardId}:${version}`;
}

/* ── Inventory controls ─────────────────────────────────────── */
export function QtyControl({
  cardId, setId, version, qty, userId, onChange, dark,
}: {
  cardId: number | string; setId: string; version: string; qty: number;
  userId: string; onChange: (key: string, qty: number) => void;
  dark?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const update = async (delta: number) => {
    const next = Math.max(0, qty + delta);
    if (next === qty) return;
    setLoading(true);
    const supabase = createClient();
    if (next === 0) {
      await supabase.from("card_inventory")
        .delete()
        .eq("user_id", userId).eq("card_id", cardId).eq("set_id", setId).eq("version", version);
    } else {
      await supabase.from("card_inventory")
        .upsert({ user_id: userId, card_id: cardId, set_id: setId, version, quantity: next },
          { onConflict: "user_id,card_id,set_id,version" });
    }
    onChange(invKey(cardId, version), next);
    setLoading(false);
  };

  const textColor   = dark ? BG0 : INK0;
  const borderBase  = dark ? "rgba(5,7,13,0.18)" : "rgba(255,255,255,0.2)";
  const borderDim   = dark ? "rgba(5,7,13,0.08)" : "rgba(255,255,255,0.1)";
  const activeQtyColor = dark ? "#15a98e" : COURT;

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    background: "none",
    border: `1px solid ${disabled ? borderDim : borderBase}`,
    color: disabled ? (dark ? "#aab0c2" : INK2) : textColor,
    borderRadius: "4px",
    width: "28px", height: "28px", cursor: disabled ? "default" : "pointer",
    fontFamily: MONO, fontSize: "16px", lineHeight: 1,
    display: "flex", alignItems: "center", justifyContent: "center",
    opacity: loading ? 0.5 : 1, transition: "border-color 0.15s, color 0.15s",
    flexShrink: 0,
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <button style={btnStyle(qty === 0 || loading)} onClick={() => update(-1)} disabled={qty === 0 || loading}>−</button>
      <span style={{ fontFamily: MONO, fontSize: "14px", color: qty > 0 ? activeQtyColor : (dark ? "#aab0c2" : INK2), minWidth: "20px", textAlign: "center", fontWeight: 600 }}>
        {qty}
      </span>
      <button style={btnStyle(loading)} onClick={() => update(1)} disabled={loading}>+</button>
    </div>
  );
}

/* ── Static tilt card for inside the modal ─────────────────── */
export function ModalTiltCard({ card }: { card: PokemonCard }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const rhRef   = useRef<HTMLDivElement>(null);
  const hRef1   = useRef<HTMLDivElement>(null);
  const hRef2   = useRef<HTMLDivElement>(null);
  const glRef   = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const rafId   = useRef(0);

  const label = getVersionLabel(card.version);
  const effect = getVersionEffect(card.version);
  const isH    = effect === "holofoil";
  const isGold = effect === "goldBorder";
  const isRH   = effect === "reverseHolofoil" || effect === "metal";
  const labelColor = getVersionColor(card.version);

  const onEnter = () => { rectRef.current = wrapRef.current?.getBoundingClientRect() ?? null; };

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    cancelAnimationFrame(rafId.current);
    const r = rectRef.current; if (!r) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    rafId.current = requestAnimationFrame(() => {
      const nx = (clientX - r.left) / r.width;
      const ny = (clientY - r.top)  / r.height;
      const tx = (-(ny - 0.5)) * 20;
      const ty = ((nx - 0.5)) * 20;
      const mx = nx * 100;
      const my = ny * 100;

      if (bodyRef.current) {
        bodyRef.current.style.transition = "transform 0.08s ease-out";
        bodyRef.current.style.transform  = `rotateX(${tx}deg) rotateY(${ty}deg)`;
      }
      if (rhRef.current) {
        rhRef.current.style.background = `
          radial-gradient(ellipse 80% 60% at ${mx}% ${my}%,
            rgba(220,220,240,0.55) 0%, rgba(180,180,210,0.25) 30%, transparent 60%),
          linear-gradient(${105 + ty * 2}deg,
            transparent 20%, rgba(200,200,230,0.18) 35%, rgba(255,255,255,0.28) 45%,
            rgba(200,200,230,0.18) 55%, transparent 70%)`;
      }
      if (hRef1.current) {
        hRef1.current.style.background = isGold
          ? `radial-gradient(ellipse 90% 70% at ${mx}% ${my}%,
              rgba(255,220,80,0.6) 0%, rgba(255,180,30,0.45) 20%,
              rgba(220,140,0,0.35) 45%, rgba(255,200,80,0.2) 65%, transparent 90%)`
          : `radial-gradient(ellipse 90% 70% at ${mx}% ${my}%,
              rgba(255,100,100,0.5) 0%, rgba(255,200,50,0.4) 15%,
              rgba(80,255,120,0.4) 30%, rgba(50,180,255,0.4) 45%,
              rgba(180,80,255,0.4) 60%, rgba(255,80,200,0.35) 75%, transparent 90%)`;
      }
      if (hRef2.current) {
        hRef2.current.style.background = isGold
          ? `linear-gradient(${120 + ty * 3}deg,
              transparent 0%, rgba(255,200,50,0.2) 25%, rgba(255,160,0,0.25) 45%,
              rgba(255,220,80,0.2) 65%, transparent 85%)`
          : `linear-gradient(${120 + ty * 3}deg,
              transparent 0%, rgba(255,100,150,0.15) 20%, rgba(80,200,255,0.2) 35%,
              rgba(200,80,255,0.15) 50%, rgba(255,200,80,0.15) 65%, transparent 80%)`;
      }
      if (glRef.current) {
        glRef.current.style.background = `linear-gradient(${110 + ty}deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)`;
      }
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(rafId.current);
    rectRef.current = null;
    if (bodyRef.current) {
      bodyRef.current.style.transition = "transform 0.6s cubic-bezier(0.2,0.8,0.2,1)";
      bodyRef.current.style.transform  = "rotateX(0deg) rotateY(0deg)";
    }
    if (rhRef.current) {
      rhRef.current.style.background = `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(220,220,240,0.3) 0%, transparent 60%)`;
    }
    if (hRef1.current) {
      hRef1.current.style.background = `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,100,100,0.2) 0%, rgba(80,255,120,0.15) 50%, transparent 90%)`;
    }
  };

  return (
    <div
      ref={wrapRef}
      style={{ perspective: "800px", cursor: "pointer" }}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div ref={bodyRef} style={{
        width: "100%", aspectRatio: "5 / 7",
        borderRadius: "12px", overflow: "hidden", position: "relative",
        transform: "rotateX(0deg) rotateY(0deg)",
        transition: "transform 0.6s cubic-bezier(0.2,0.8,0.2,1)",
        willChange: "transform",
        boxShadow: isH
          ? "0 16px 48px rgba(255,160,80,0.45), 0 4px 16px rgba(0,0,0,0.5)"
          : isGold
          ? "0 16px 48px rgba(255,200,50,0.5), 0 4px 16px rgba(0,0,0,0.5)"
          : isRH
          ? "0 16px 48px rgba(180,180,220,0.3), 0 4px 16px rgba(0,0,0,0.5)"
          : "0 12px 40px rgba(0,0,0,0.6)",
      }}>
        <img src={card.image} alt={card.name} style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />

        {isRH && (
          <div ref={rhRef} style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
            background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(220,220,240,0.3) 0%, transparent 60%)`,
          }} />
        )}
        {(isH || isGold) && (
          <div ref={hRef1} style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "color-dodge",
            background: isGold
              ? `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,220,80,0.35) 0%, rgba(255,160,0,0.2) 50%, transparent 90%)`
              : `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,100,100,0.2) 0%, rgba(80,255,120,0.15) 50%, transparent 90%)`,
            animation: isGold ? "goldShift 4s ease-in-out infinite" : "holoShift 4s ease-in-out infinite",
          }} />
        )}
        {(isH || isGold) && (
          <div ref={hRef2} style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
            background: isGold
              ? `linear-gradient(120deg, transparent 0%, rgba(255,200,50,0.15) 35%, transparent 70%)`
              : `linear-gradient(120deg, transparent 0%, rgba(255,100,150,0.1) 35%, transparent 70%)`,
          }} />
        )}
        <div ref={glRef} style={{
          position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
          background: `linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)`,
        }} />

        <div style={{
          position: "absolute", bottom: "10px", right: "10px", zIndex: 10,
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.12em",
          color: labelColor, border: `1px solid ${labelColor}60`,
          borderRadius: "5px", padding: "3px 8px",
          background: "rgba(5,7,13,0.82)", backdropFilter: "blur(4px)",
          pointerEvents: "none",
        }}>
          {VERSION_FULL[label] ?? label}
        </div>
      </div>
    </div>
  );
}

/* ── Card Detail Modal ──────────────────────────────────────── */
export function CardDetailModal({
  card, setId, userId, inventory, onInventoryChange,
  featuredCards, onFeaturedChange,
  wishlistCards, onWishlistChange,
  userListings, onListingsChange,
  onClose,
}: {
  card: PokemonCard; setId: string;
  userId?: string; inventory: InventoryMap;
  onInventoryChange: (key: string, qty: number) => void;
  featuredCards: FeaturedCard[];
  onFeaturedChange: (cards: FeaturedCard[]) => void;
  wishlistCards: WishlistCard[];
  onWishlistChange: (cards: WishlistCard[]) => void;
  userListings: UserListing[];
  onListingsChange: (listings: UserListing[]) => void;
  onClose: () => void;
}) {
  const setInfo    = ALL_SETS_FLAT.find(s => s.id === setId);
  const label      = getVersionLabel(card.version);
  const versionFull = label;
  const qty        = inventory[invKey(card.id, card.version)] ?? 0;

  const scrydexCode = SCRYDEX_SET_CODES[setId];
  const { prices: scrydexPrices, loading: pricesLoading } = useScrydexPrice({
    setSlug:    setId,
    setCode:    scrydexCode ?? "",
    cardName:   card.name,
    cardNumber: card.card_number,
    enabled:    !!scrydexCode,
  });

  // Normaliza la versión de nuestra carta al key que devuelve la API
  const versionKey = card.version.toLowerCase().replace(/\s+/g, "");
  const scrydexPrice: number | null = scrydexPrices
    ? (scrydexPrices[versionKey] ??
       scrydexPrices[card.version] ??
       scrydexPrices[card.version.charAt(0).toUpperCase() + card.version.slice(1)] ??
       null)
    : null;
  const isFeatured  = featuredCards.some(f => Number(f.card_id) === card.card_number && f.set_id === setId);
  const featCount   = featuredCards.length;
  const isWanted    = wishlistCards.some(w => w.card_id === card.id && w.set_id === setId);
  const hasInInv    = qty > 0;
  const [featuring,  setFeaturing]  = useState(false);
  const [toggling,   setToggling]   = useState(false);
  const canFeature  = hasInInv && (isFeatured || featCount < 10);

  const cardListings = userListings.filter(l => l.card_id === card.card_number && l.set_id === setId && l.version === card.version);
  const existingListing = cardListings[0];
  const canSell         = hasInInv && cardListings.length < qty;

  const [sellingMode, setSellingMode] = useState(false);
  const [priceInput, setPriceInput]   = useState("");
  const [savingListing, setSavingListing] = useState(false);
  const [userCurrency, setUserCurrency] = useState("COP");
  const [profileComplete, setProfileComplete] = useState(true);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    createClient()
      .from("players")
      .select("pais, photo_url, username, first_name, ciudad, whatsapp_numero")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data?.pais) setUserCurrency(getCurrencyForCountry(data.pais));
        const missing: string[] = [];
        if (!data?.photo_url)               missing.push("foto de perfil");
        if (!data?.username?.trim())        missing.push("nombre de usuario");
        if (!data?.first_name?.trim())      missing.push("nombre");
        if (!data?.pais?.trim())            missing.push("país");
        if (!data?.ciudad?.trim())          missing.push("ciudad");
        if (!data?.whatsapp_numero?.trim()) missing.push("WhatsApp");
        setMissingFields(missing);
        setProfileComplete(missing.length === 0);
      });
  }, [userId]);

  function formatInput(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("es-CO");
  }

  const handleSellSubmit = async () => {
    if (!userId || savingListing) return;
    const price = Number(priceInput.replace(/\D/g, ""));
    if (!price || price <= 0) return;
    setSavingListing(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("market_listings").insert({
      user_id: userId,
      card_id: card.card_number,
      set_id: setId,
      price_cop: price,
      currency: userCurrency,
      version: card.version,
      status: "active",
    }).select("id, card_id, set_id, price_cop, version, currency").single();
    if (error) {
      console.error("[sell] insert error:", error.message);
      setSavingListing(false);
      return;
    }
    const newListing: UserListing = data ?? {
      id: crypto.randomUUID(),
      card_id: card.card_number,
      set_id: setId,
      price_cop: price,
      version: card.version,
    };
    onListingsChange([...userListings, newListing]);
    setSavingListing(false);
    setSellingMode(false);
    setPriceInput("");
  };

  const handleToggleFeatured = async () => {
    if (!userId || featuring) return;
    setFeaturing(true);
    const supabase = createClient();
    if (isFeatured) {
      await supabase.from("featured_cards")
        .delete()
        .eq("user_id", userId).eq("card_id", card.card_number).eq("set_id", setId);
      onFeaturedChange(featuredCards.filter(f => !(Number(f.card_id) === card.card_number && f.set_id === setId)));
    } else {
      if (featCount >= 10) { setFeaturing(false); return; }
      await supabase.from("featured_cards")
        .insert({ user_id: userId, card_id: card.card_number, set_id: setId });
      onFeaturedChange([...featuredCards, { card_id: card.card_number, set_id: setId }]);
    }
    setFeaturing(false);
  };

  const handleToggleWishlist = async () => {
    if (!userId || toggling) return;
    setToggling(true);
    const supabase = createClient();
    if (isWanted) {
      await supabase.from("card_wishlist")
        .delete()
        .eq("user_id", userId).eq("card_id", card.id).eq("set_id", setId);
      onWishlistChange(wishlistCards.filter(w => !(w.card_id === card.id && w.set_id === setId)));
    } else {
      await supabase.from("card_wishlist")
        .insert({ user_id: userId, card_id: card.id, set_id: setId });
      onWishlistChange([...wishlistCards, { card_id: card.id, set_id: setId }]);
    }
    setToggling(false);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const MODAL_BG   = "rgba(245,247,251,0.97)";
  const DARK       = "#05070d";
  const DARK2      = "#4a5268";
  const BORDER_CLR = "rgba(5,7,13,0.1)";

  const priceDisplay = scrydexCode
    ? pricesLoading
      ? "Cargando..."
      : scrydexPrice !== null
        ? `$${scrydexPrice.toFixed(2)} USD`
        : "—"
    : null;

  const tableRows: { label: string; value: React.ReactNode }[] = [
    { label: "Número", value: `#${String(card.card_number).padStart(3, "0")}` },
    { label: "Tipo",   value: versionFull },
    {
      label: "Set",
      value: setInfo
        ? <div style={{ position: "relative", width: "90px", height: "32px" }}>
            <Image src={setInfo.logo} alt={setInfo.name} fill style={{ objectFit: "contain", objectPosition: "left center" }} />
          </div>
        : setId,
    },
    ...(priceDisplay !== null ? [{
      label: "Precio",
      value: (
        <span style={{ color: pricesLoading ? DARK2 : scrydexPrice !== null ? "#15a98e" : DARK2 }}>
          {priceDisplay}
        </span>
      ),
    }] : []),
  ];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(5,7,13,0.88)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="card-modal-inner"
        style={{
          background: MODAL_BG,
          borderRadius: "20px",
          padding: "36px",
          maxWidth: "680px", width: "100%",
          display: "flex", gap: "32px", alignItems: "flex-start",
          position: "relative",
          boxShadow: "0 40px 100px rgba(0,0,0,0.9)",
          maxHeight: "90vh", overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "14px", right: "16px",
            background: "none", border: "none", cursor: "pointer",
            color: DARK2, fontSize: "18px", lineHeight: 1, padding: "6px 8px",
            borderRadius: "6px",
          }}
        >✕</button>

        <div className="modal-card-col" style={{ flexShrink: 0, width: "200px" }}>
          <ModalTiltCard card={card} />
        </div>

        <div className="modal-details-col" style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontFamily: DISP, fontSize: "20px", letterSpacing: "-0.01em",
            margin: "0 0 20px", color: DARK, lineHeight: 1.1,
          }}>
            {card.name}
          </h2>

          <div style={{ marginBottom: "28px" }}>
            {tableRows.map((row, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: `1px solid ${BORDER_CLR}`,
                borderTop: i === 0 ? `1px solid ${BORDER_CLR}` : undefined,
                gap: "8px",
              }}>
                <span style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: DARK2, flexShrink: 0 }}>
                  {row.label}
                </span>
                <span style={{ fontFamily: MONO, fontSize: "13px", color: DARK, fontWeight: 600 }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {userId && (
            <>
              <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: DARK2 }}>
                  Inventario
                </span>
                <QtyControl
                  cardId={card.id} setId={setId} version={card.version} qty={qty}
                  userId={userId} onChange={onInventoryChange}
                  dark
                />
              </div>

              {/* Fila 1: Ver precios | Destacar */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                {/* Ver precios — TCGPlayer */}
                {(() => {
                  const tcgQuery = [card.name, setInfo?.name ?? "", VERSION_FULL[label] ?? label].filter(Boolean).join(" ");
                  const tcgUrl   = `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(tcgQuery)}`;
                  return (
                    <button
                      onClick={() => {
                        const w = 430, h = 600;
                        const left = screen.availWidth - w - 16;
                        const top  = screen.availHeight - h - 16;
                        window.open(tcgUrl, "tcgplayer", `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
                      }}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                        padding: "12px 8px",
                        fontFamily: MONO, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase",
                        borderRadius: "10px", fontWeight: 700, cursor: "pointer",
                        background: "rgba(5,7,13,0.05)", color: "#05070d",
                        border: "1.5px solid rgba(5,7,13,0.2)",
                        transition: "all 0.2s",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://www.tcgplayer.com/favicon.ico" alt="" width={12} height={12} style={{ flexShrink: 0 }} />
                      Ver precios
                    </button>
                  );
                })()}
                <button
                  onClick={handleToggleFeatured}
                  disabled={featuring || !canFeature || !profileComplete}
                  style={{
                    flex: 1, padding: "12px 8px",
                    fontFamily: MONO, fontSize: "11px", letterSpacing: "0.16em",
                    textTransform: "uppercase", borderRadius: "10px",
                    cursor: featuring || !canFeature || !profileComplete ? "default" : "pointer",
                    transition: "all 0.2s",
                    opacity: featuring ? 0.6 : (!canFeature || !profileComplete) ? 0.4 : 1,
                    background: isFeatured ? "#2ee6c1" : "rgba(46,230,193,0.1)",
                    color: isFeatured ? "#05070d" : "#0d6b5e",
                    border: "1.5px solid #2ee6c1",
                  }}
                >
                  {isFeatured ? "✓ Destacada" : "Destacar"}
                </button>
              </div>

              {/* Fila 2: Buscando | Vender */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => profileComplete && handleToggleWishlist()}
                  disabled={toggling || !profileComplete}
                  style={{
                    flex: 1, padding: "12px 8px",
                    fontFamily: MONO, fontSize: "11px", letterSpacing: "0.16em",
                    textTransform: "uppercase", borderRadius: "10px",
                    cursor: toggling || !profileComplete ? "default" : "pointer",
                    transition: "all 0.2s",
                    opacity: toggling ? 0.6 : !profileComplete ? 0.4 : 1,
                    background: isWanted ? "#ffd24f" : "rgba(255,210,79,0.12)",
                    color: isWanted ? "#2a2a2a" : "#7a5c00",
                    border: "1.5px solid #ffd24f",
                  }}
                >
                  {isWanted ? "✓ Buscando" : "Buscando"}
                </button>
                <button
                  onClick={() => canSell && profileComplete && setSellingMode(true)}
                  disabled={!canSell || !profileComplete}
                  style={{
                    flex: 1, padding: "12px 8px",
                    fontFamily: MONO, fontSize: "11px", letterSpacing: "0.16em",
                    textTransform: "uppercase", borderRadius: "10px",
                    cursor: canSell && profileComplete ? "pointer" : "default",
                    transition: "all 0.2s",
                    opacity: canSell && profileComplete ? 1 : 0.4,
                    background: canSell && profileComplete ? "#2ee696" : "rgba(46,230,150,0.1)",
                    color: canSell && profileComplete ? "#0a0a0a" : "#0a5c30",
                    border: "1.5px solid #2ee696",
                  }}
                >
                  Vender
                </button>
              </div>

              {!profileComplete && missingFields.length > 0 && (
                <p style={{ fontFamily: MONO, fontSize: "10px", color: "#f59e0b", margin: "8px 0 0", letterSpacing: "0.08em", textAlign: "center", lineHeight: 1.6 }}>
                  Completa tu perfil para usar estas funciones: <b>{missingFields.join(", ")}</b>.{" "}
                  <a href="/dashboard/perfil" style={{ color: "#f59e0b", textDecoration: "underline" }}>Ir al perfil →</a>
                </p>
              )}
              {!canFeature && !hasInInv && (
                <p style={{ fontFamily: MONO, fontSize: "10px", color: "#d95555", margin: "8px 0 0", letterSpacing: "0.08em", textAlign: "center" }}>
                  Necesitas tener esta carta en tu inventario para destacarla.
                </p>
              )}
              {!canFeature && hasInInv && featCount >= 10 && (
                <p style={{ fontFamily: MONO, fontSize: "10px", color: "#d95555", margin: "8px 0 0", letterSpacing: "0.08em", textAlign: "center" }}>
                  Máximo 10 cartas destacadas — quita una para agregar esta.
                </p>
              )}

              <p style={{ fontFamily: MONO, fontSize: "10px", color: DARK2, margin: "10px 0 0", letterSpacing: "0.08em", textAlign: "center" }}>
                {featCount}/10 cartas destacadas
              </p>

              <div style={{ marginTop: "16px" }}>
                {sellingMode ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <label style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: DARK2 }}>
                      Precio en {userCurrency}
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(5,7,13,0.06)", border: `1px solid ${BORDER_CLR}`, borderRadius: "8px", padding: "8px 12px" }}>
                      <span style={{ fontFamily: MONO, fontSize: "12px", color: DARK2, flexShrink: 0 }}>{CURRENCY_SYMBOL[userCurrency] ?? "$"}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={priceInput}
                        onChange={e => setPriceInput(formatInput(e.target.value))}
                        placeholder="0"
                        style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: MONO, fontSize: "14px", color: DARK, fontWeight: 600 }}
                      />
                      <span style={{ fontFamily: MONO, fontSize: "10px", color: DARK2, flexShrink: 0 }}>{userCurrency}</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => { setSellingMode(false); setPriceInput(""); }}
                        style={{ flex: 1, padding: "10px", fontFamily: MONO, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", background: "transparent", border: `1px solid ${BORDER_CLR}`, borderRadius: "8px", cursor: "pointer", color: DARK2 }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSellSubmit}
                        disabled={savingListing || !priceInput}
                        style={{ flex: 2, padding: "10px", fontFamily: MONO, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", background: "#2ee696", border: "none", borderRadius: "8px", cursor: savingListing || !priceInput ? "default" : "pointer", color: "#0a0a0a", fontWeight: 700, opacity: savingListing || !priceInput ? 0.5 : 1 }}
                      >
                        {savingListing ? "Publicando..." : "Publicar"}
                      </button>
                    </div>
                  </div>
                ) : (
                  hasInInv && !canSell && (
                    <p style={{ fontFamily: MONO, fontSize: "10px", color: "#d95555", margin: "8px 0 0", letterSpacing: "0.08em", textAlign: "center" }}>
                      Tienes {qty} en inventario y {cardListings.length} publicada{cardListings.length > 1 ? "s" : ""} — retira una para vender otra.
                    </p>
                  )
                )}

                {(() => {
                  const activeListings = userListings.filter(l => l.card_id === card.card_number && l.set_id === setId && l.version === card.version);
                  if (activeListings.length === 0) return null;
                  return (
                    <div style={{ marginTop: "14px" }}>
                      <span style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: DARK2, display: "block", marginBottom: "8px" }}>
                        Publicaciones activas
                      </span>
                      <div style={{ border: "1px solid rgba(46,230,193,0.15)", borderRadius: "8px", overflow: "hidden" }}>
                        {/* Header */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px", padding: "6px 10px", background: "rgba(46,230,193,0.08)", borderBottom: "1px solid rgba(46,230,193,0.12)" }}>
                          <span style={{ fontFamily: MONO, fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: DARK2 }}>Nombre</span>
                          <span style={{ fontFamily: MONO, fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: DARK2 }}>Precio</span>
                          <span style={{ fontFamily: MONO, fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: DARK2 }}></span>
                        </div>
                        {/* Rows */}
                        {activeListings.map((listing, i) => (
                          <div key={listing.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px", alignItems: "center", padding: "8px 10px", background: i % 2 === 0 ? "rgba(46,230,193,0.03)" : "transparent", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
                            <span style={{ fontFamily: MONO, fontSize: "10px", color: DARK, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {card.name}
                            </span>
                            <span style={{ fontFamily: MONO, fontSize: "11px", color: "#15a98e", fontWeight: 700, whiteSpace: "nowrap" }}>
                              {CURRENCY_SYMBOL[listing.currency ?? userCurrency] ?? "$"}{formatPrice(listing.price_cop, listing.currency ?? userCurrency)} {listing.currency ?? userCurrency}
                            </span>
                            <button
                              onClick={async () => {
                                const supabase = createClient();
                                await supabase.from("market_listings").update({ status: "removed" }).eq("id", listing.id);
                                onListingsChange(userListings.filter(l => l.id !== listing.id));
                              }}
                              style={{ background: "none", border: "1px solid rgba(209,53,53,0.35)", borderRadius: "5px", color: "#d95555", fontFamily: MONO, fontSize: "8px", letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 8px", cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                              Eliminar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </div>

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
        @media (max-width: 540px) {
          .card-modal-inner {
            flex-direction: column !important;
            align-items: center !important;
            padding: 24px 20px !important;
          }
          .modal-card-col { width: 160px !important; }
          .modal-details-col { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
