"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { getVersionLabel, getVersionEffect, getVersionColor, type PokemonCard } from "@/data/pokemon-cards-meta";
import { getCurrencyForCountry, formatPrice, CURRENCY_SYMBOL } from "@/lib/currency";
import { CARD_LANGUAGES, INVENTORY_LANGUAGES, DEFAULT_CARD_LANGUAGE } from "@/lib/languages";
import { FlagIcon } from "@/components/FlagIcon";
import { useScrydexPrice, SCRYDEX_SET_CODES } from "@/hooks/useScrydexPrice";
import { tcgCardLink } from "@/lib/tcg-link";
import { X, ExternalLink, Star, Search, Check, Tag, Info } from "lucide-react";

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
export type UserListing   = { id: string; card_id: number | string; set_id: string; price_cop: number; version: string; currency?: string; language?: string | null };

/**
 * Llave de una carta dentro del inventario en memoria.
 *
 * Lleva el set porque el id de carta se repite entre expansiones: la #002 de
 * Mega Evolution y la de Shining Legends son ambas "002:Ivysaur:Normal". Sin el
 * set, tener una hacía aparecer las dos, y los botones de cantidad movían la
 * que no era. En la base de datos la llave siempre fue (card_id, set_id, version).
 */
export function invKey(cardId: number | string, version: string, setId: string): string {
  return `${setId}:${cardId}:${version}`;
}

/**
 * Llave de una carta EN UN IDIOMA concreto.
 *
 * En la base de datos la fila es (card_id, set_id, version, language): tener 2
 * Pikachu en ingles y 1 en japones son dos filas, no una. `invKey` sigue siendo
 * el total sumado de todos los idiomas — eso es lo que quieren el progreso de
 * los sets, destacar y la wishlist, a las que no les importa el idioma. Esta
 * llave es la que usan los botones de cantidad, que si tienen que saber a que
 * fila le estan sumando.
 */
export function invLangKey(
  cardId: number | string, version: string, setId: string, language: string,
): string {
  return `${setId}:${cardId}:${version}:${language || DEFAULT_CARD_LANGUAGE}`;
}

/* ── Inventory controls ─────────────────────────────────────── */
export function QtyControl({
  cardId, setId, version, qty, userId, onChange, dark,
  language = DEFAULT_CARD_LANGUAGE, showFlag = false,
}: {
  /** `qty` es la cantidad de este idioma, no el total de la carta. */
  cardId: number | string; setId: string; version: string; qty: number;
  userId: string;
  /** Recibe la llave por idioma, la nueva cantidad, el delta y la llave del total. */
  onChange: (langKey: string, qty: number, delta: number, aggKey: string) => void;
  dark?: boolean;
  language?: string;
  /** Muestra la bandera dentro del control: sirve para apilar uno por idioma. */
  showFlag?: boolean;
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
        .eq("user_id", userId).eq("card_id", cardId).eq("set_id", setId)
        .eq("version", version).eq("language", language);
    } else {
      await supabase.from("card_inventory")
        .upsert({ user_id: userId, card_id: cardId, set_id: setId, version, language, quantity: next },
          { onConflict: "user_id,card_id,set_id,version,language" });
    }
    onChange(
      invLangKey(cardId, version, setId, language),
      next,
      next - qty,
      invKey(cardId, version, setId),
    );
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
    <div style={{ display: "flex", alignItems: "center", gap: showFlag ? "6px" : "10px" }}>
      <button style={btnStyle(qty === 0 || loading)} onClick={() => update(-1)} disabled={qty === 0 || loading}>−</button>
      {showFlag && (
        <span style={{ display: "inline-flex", opacity: qty > 0 ? 1 : 0.45, flexShrink: 0 }}>
          <FlagIcon code={language} width={22} />
        </span>
      )}
      <span style={{ fontFamily: MONO, fontSize: "14px", color: qty > 0 ? activeQtyColor : (dark ? "#aab0c2" : INK2), minWidth: "20px", textAlign: "center", fontWeight: 600 }}>
        {qty}
      </span>
      <button style={btnStyle(loading)} onClick={() => update(1)} disabled={loading}>+</button>
    </div>
  );
}

/* ── Card con efectos holo (sin tilt 3D) ────────────────────── */
export function ModalTiltCard({ card }: { card: PokemonCard }) {
  const label = getVersionLabel(card.version);
  const effect = getVersionEffect(card.version);
  const isH    = effect === "holofoil";
  const isGold = effect === "goldBorder";
  const isRH   = effect === "reverseHolofoil" || effect === "metal";
  const labelColor = getVersionColor(card.version);

  return (
    <div style={{ cursor: "pointer" }}>
      <div style={{
        width: "100%", aspectRatio: "5 / 7",
        borderRadius: "12px", overflow: "hidden", position: "relative",
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
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
            background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(220,220,240,0.3) 0%, transparent 60%)`,
          }} />
        )}
        {(isH || isGold) && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "color-dodge",
            background: isGold
              ? `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,220,80,0.35) 0%, rgba(255,160,0,0.2) 50%, transparent 90%)`
              : `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,100,100,0.2) 0%, rgba(80,255,120,0.15) 50%, transparent 90%)`,
            animation: isGold ? "goldShift 4s ease-in-out infinite" : "holoShift 4s ease-in-out infinite",
          }} />
        )}
        {(isH || isGold) && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
            background: isGold
              ? `linear-gradient(120deg, transparent 0%, rgba(255,200,50,0.15) 35%, transparent 70%)`
              : `linear-gradient(120deg, transparent 0%, rgba(255,100,150,0.1) 35%, transparent 70%)`,
          }} />
        )}
        <div style={{
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
  const qty        = inventory[invKey(card.id, card.version, setId)] ?? 0;

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

  /** Desglose por idioma, para mostrar de qué está compuesto el total. */
  const langBreakdown = CARD_LANGUAGES
    .map(l => ({ ...l, n: inventory[invLangKey(card.id, card.version, setId, l.code)] ?? 0 }))
    .filter(l => l.n > 0);

  const [sellingMode, setSellingMode] = useState(false);
  const [priceInput, setPriceInput]   = useState("");
  const [sellLanguage, setSellLanguage] = useState<string>("es");
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
      language: sellLanguage,
      status: "pending",
    }).select("id, card_id, set_id, price_cop, version, currency, language").single();
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
      language: sellLanguage,
    };
    onListingsChange([...userListings, newListing]);
    setSavingListing(false);
    setSellingMode(false);
    setPriceInput("");
    setSellLanguage("es");
  };

  const handleToggleFeatured = async () => {
    if (!userId || featuring) return;
    setFeaturing(true);
    const supabase = createClient();
    // La estrella cambia solo si la base aceptó: antes un insert rechazado
    // (p. ej. otra versión del mismo número ya destacada) quedaba marcado igual.
    if (isFeatured) {
      const { error } = await supabase.from("featured_cards")
        .delete()
        .eq("user_id", userId).eq("card_id", card.card_number).eq("set_id", setId);
      if (error) window.alert(`No se pudo quitar de destacadas: ${error.message}`);
      else onFeaturedChange(featuredCards.filter(f => !(Number(f.card_id) === card.card_number && f.set_id === setId)));
    } else {
      if (featCount >= 10) { setFeaturing(false); return; }
      const { error } = await supabase.from("featured_cards")
        .insert({ user_id: userId, card_id: card.card_number, set_id: setId });
      if (error) {
        window.alert(error.code === "23505"
          ? "Ya tienes destacada otra versión de esta carta."
          : `No se pudo destacar: ${error.message}`);
      } else onFeaturedChange([...featuredCards, { card_id: card.card_number, set_id: setId }]);
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

  const versionColor = getVersionColor(card.version);

  /** Un solo aviso bajo los botones, en vez de tres párrafos sueltos. */
  const hint =
    !canFeature && !hasInInv ? "Agrégala a tu inventario para destacarla o venderla."
    : !canFeature && hasInInv && featCount >= 10 ? "Máximo 10 destacadas: quita una para sumar esta."
    : null;

  const chip: React.CSSProperties = {
    fontFamily: MONO, fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase",
    padding: "4px 9px", borderRadius: "999px", fontWeight: 600, whiteSpace: "nowrap",
  };

  const actionBtn = (enabled: boolean, extra: React.CSSProperties): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
    padding: "10px 8px", minWidth: 0,
    fontFamily: MONO, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase",
    fontWeight: 700, borderRadius: "10px", whiteSpace: "nowrap",
    cursor: enabled ? "pointer" : "default", opacity: enabled ? 1 : 0.4,
    transition: "all 0.2s",
    ...extra,
  });

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
          padding: "24px",
          maxWidth: "860px", width: "100%",
          display: "flex", gap: "28px", alignItems: "stretch",
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
         aria-label="Cerrar"><X size={18} aria-hidden /></button>

        {/* La carta manda: columna ancha sobre un panel propio */}
        <div className="modal-card-col" style={{
          flexShrink: 0, width: "340px",
          background: "radial-gradient(ellipse 80% 70% at 50% 45%, rgba(46,230,193,0.10), rgba(5,7,13,0.05) 75%)",
          borderRadius: "16px", padding: "22px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: "100%" }}>
            <ModalTiltCard card={card} />
          </div>
        </div>

        <div className="modal-details-col" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", paddingTop: "4px" }}>
          {/* Cabecera: set, nombre y fichas */}
          {setInfo && (
            <div style={{ position: "relative", width: "110px", height: "34px", marginBottom: "10px" }}>
              <Image src={setInfo.logo} alt={setInfo.name} fill sizes="110px" style={{ objectFit: "contain", objectPosition: "left center" }} />
            </div>
          )}
          <h2 style={{
            fontFamily: DISP, fontSize: "clamp(20px, 3vw, 26px)", letterSpacing: "-0.01em",
            margin: "0 36px 10px 0", color: DARK, lineHeight: 1.1,
          }}>
            {card.name}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
            <span style={{ ...chip, background: "rgba(5,7,13,0.06)", color: DARK }}>
              #{String(card.card_number).padStart(3, "0")}
            </span>
            <span style={{ ...chip, background: DARK, color: versionColor }}>
              {VERSION_FULL[versionFull] ?? versionFull}
            </span>
            {setInfo && (
              <span style={{ ...chip, background: "rgba(5,7,13,0.06)", color: DARK2, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                {setInfo.name}
              </span>
            )}
          </div>

          {/* Precio: el único dato grande */}
          {priceDisplay !== null && (
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px",
              padding: "12px 14px", borderRadius: "12px", marginBottom: "18px",
              background: "rgba(46,230,193,0.08)", border: "1px solid rgba(46,230,193,0.25)",
            }}>
              <span style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: DARK2 }}>
                Precio mercado
              </span>
              <span style={{
                fontFamily: DISP, fontSize: "22px", fontWeight: 700,
                color: scrydexPrice !== null && !pricesLoading ? "#15a98e" : DARK2,
              }}>
                {priceDisplay}
              </span>
            </div>
          )}

          {userId && (
            <>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: DARK2 }}>
                    Inventario
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: "10px", color: qty > 0 ? "#15a98e" : DARK2, letterSpacing: "0.06em", fontWeight: 600 }}>
                    {qty} en total
                  </span>
                </div>

                {/* Un contador por idioma, en una sola fila */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", padding: "10px 12px", borderRadius: "12px", border: `1px solid ${BORDER_CLR}` }}>
                  {INVENTORY_LANGUAGES.map(lang => (
                    <QtyControl
                      key={lang.code}
                      cardId={card.id} setId={setId} version={card.version}
                      qty={inventory[invLangKey(card.id, card.version, setId, lang.code)] ?? 0}
                      language={lang.code} showFlag
                      userId={userId}
                      onChange={async (langKey, newQty, delta, aggKey) => {
                        onInventoryChange(langKey, newQty);
                        onInventoryChange(aggKey, Math.max(0, qty + delta));
                        if (qty === 0 && delta > 0 && isWanted && userId) {
                          const supabase = createClient();
                          await supabase.from("card_wishlist").delete()
                            .eq("user_id", userId).eq("card_id", card.id).eq("set_id", setId);
                          onWishlistChange(wishlistCards.filter(w => !(w.card_id === card.id && w.set_id === setId)));
                        }
                      }}
                      dark
                    />
                  ))}
                </div>
                {langBreakdown.length > 1 && (
                  <p style={{ fontFamily: MONO, fontSize: "9px", color: DARK2, margin: "8px 0 0", letterSpacing: "0.06em" }}>
                    {langBreakdown.map(l => `${l.label} ×${l.n}`).join(" · ")}
                  </p>
                )}
              </div>

              {/* Acciones: 2×2, bajas y con icono */}
              <div className="modal-actions" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
                {(() => {
                  const tcgQuery = [card.name, setInfo?.name ?? "", VERSION_FULL[label] ?? label].filter(Boolean).join(" ");
                  const tcgUrl   = tcgCardLink(setId, card.card_number, tcgQuery, card.version);
                  return (
                    <button
                      onClick={() => {
                        const w = 430, h = 600;
                        const left = screen.availWidth - w - 16;
                        const top  = screen.availHeight - h - 16;
                        window.open(tcgUrl, "tcgplayer", `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
                      }}
                      style={actionBtn(true, { background: "rgba(5,7,13,0.05)", color: DARK, border: "1.5px solid rgba(5,7,13,0.18)" })}
                    >
                      <ExternalLink size={13} aria-hidden style={{ flexShrink: 0 }} />
                      Ver precios
                    </button>
                  );
                })()}
                <button
                  onClick={handleToggleFeatured}
                  disabled={featuring || !canFeature || !profileComplete}
                  style={actionBtn(!featuring && canFeature && profileComplete, {
                    background: isFeatured ? COURT : "rgba(46,230,193,0.1)",
                    color: isFeatured ? DARK : "#0d6b5e",
                    border: `1.5px solid ${COURT}`,
                  })}
                >
                  <Star size={13} aria-hidden fill={isFeatured ? "currentColor" : "none"} style={{ flexShrink: 0 }} />
                  {isFeatured ? "Destacada" : "Destacar"}
                  <span style={{ opacity: 0.6, fontWeight: 500 }}>{featCount}/10</span>
                </button>
                <button
                  onClick={() => profileComplete && handleToggleWishlist()}
                  disabled={toggling || !profileComplete}
                  style={actionBtn(!toggling && profileComplete, {
                    background: isWanted ? "#ffd24f" : "rgba(255,210,79,0.12)",
                    color: isWanted ? "#2a2a2a" : "#7a5c00",
                    border: "1.5px solid #ffd24f",
                  })}
                >
                  {isWanted ? <Check size={13} aria-hidden style={{ flexShrink: 0 }} /> : <Search size={13} aria-hidden style={{ flexShrink: 0 }} />}
                  Buscando
                </button>
                <button
                  onClick={() => canSell && profileComplete && setSellingMode(true)}
                  disabled={!canSell || !profileComplete}
                  style={actionBtn(canSell && profileComplete, {
                    background: canSell && profileComplete ? "#2ee696" : "rgba(46,230,150,0.1)",
                    color: canSell && profileComplete ? "#0a0a0a" : "#0a5c30",
                    border: "1.5px solid #2ee696",
                  })}
                >
                  <Tag size={13} aria-hidden style={{ flexShrink: 0 }} />
                  Vender
                </button>
              </div>

              {!profileComplete && missingFields.length > 0 ? (
                <p style={{ fontFamily: MONO, fontSize: "10px", color: "#b45309", margin: "10px 0 0", letterSpacing: "0.06em", lineHeight: 1.6 }}>
                  Completa tu perfil para usar estas funciones: <b>{missingFields.join(", ")}</b>.{" "}
                  <Link href="/dashboard/perfil" style={{ color: "#b45309", textDecoration: "underline" }}>Ir al perfil</Link>
                </p>
              ) : hint && (
                <p style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: MONO, fontSize: "10px", color: DARK2, margin: "10px 0 0", letterSpacing: "0.06em", lineHeight: 1.5 }}>
                  <Info size={12} aria-hidden style={{ flexShrink: 0 }} />
                  {hint}
                </p>
              )}

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

                    {/* Idioma de la carta */}
                    <label style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: DARK2 }}>
                      Idioma de la carta
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {CARD_LANGUAGES.map(lang => {
                        const active = sellLanguage === lang.code;
                        return (
                          <button
                            key={lang.code}
                            onClick={() => setSellLanguage(lang.code)}
                            title={lang.label}
                            style={{
                              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                              padding: "8px 4px", borderRadius: "8px", cursor: "pointer",
                              background: active ? "rgba(46,230,150,0.14)" : "rgba(5,7,13,0.05)",
                              border: active ? "1px solid #2ee696" : `1px solid ${BORDER_CLR}`,
                              transition: "all 0.12s",
                            }}
                          >
                            <FlagIcon code={lang.code} width={26} />
                            <span style={{ fontFamily: MONO, fontSize: "8px", letterSpacing: "0.06em", textTransform: "uppercase", color: active ? "#15a98e" : DARK2, fontWeight: active ? 700 : 400 }}>{lang.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => { setSellingMode(false); setPriceInput(""); setSellLanguage("es"); }}
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
                              {listing.language && <span style={{ marginRight: "5px", display: "inline-flex", verticalAlign: "middle" }}><FlagIcon code={listing.language} width={16} /></span>}{card.name}
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
        @media (max-width: 820px) {
          .modal-card-col { width: 280px !important; }
        }
        @media (max-width: 640px) {
          .card-modal-inner {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 18px !important;
            padding: 18px 16px !important;
          }
          .modal-card-col { width: 100% !important; padding: 18px !important; }
          .modal-card-col > div { width: min(260px, 70vw) !important; }
          .modal-details-col { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
