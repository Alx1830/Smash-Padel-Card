"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Search, X, Heart, ChevronLeft, Check, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES, STANDALONE_SETS, type PokemonSet } from "@/data/pokemon-sets";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { VERSION_LABEL, getVersionLabel, getVersionEffect, getVersionColor, type PokemonCard, type CardVersion } from "@/data/pokemon-cards-meta";
import { SET_CARD_COUNT, loadSetCards } from "@/data/pokemon-cards";
import {
  COURT, INK0, INK2, BG0, MONO, DISP,
  VERSION_COLOR, VERSION_FULL,
  QtyControl, CardDetailModal, invKey, invLangKey,
  type InventoryMap, type FeaturedCard, type WishlistCard, type UserListing,
} from "@/components/CardDetailModal";
import { INVENTORY_LANGUAGES, DEFAULT_CARD_LANGUAGE } from "@/lib/languages";
import { fotoChica } from "@/lib/foto-carta";

/* Lazy-load card data only when a set is opened */
async function fetchSetCards(setId: string): Promise<PokemonCard[]> {
  return loadSetCards(setId);
}


/* ── Card (sin efecto 3D, conserva holo/gold/RH en hover) ───── */
function TiltCard({
  card, userId, setId, inventory, onQtyChange, onCardClick,
  wishlistCards, onWishlistChange,
}: {
  card: PokemonCard;
  userId?: string;
  setId: string;
  inventory: InventoryMap;
  onQtyChange: (langKey: string, qty: number, delta: number, aggKey: string) => void;
  onCardClick?: () => void;
  wishlistCards: WishlistCard[];
  onWishlistChange: (cards: WishlistCard[]) => void;
}) {
  const [hovered, setHovered] = useState(false);

  /** Total de la carta (todos los idiomas) — decide si sale a color o en gris. */
  const qty = inventory[invKey(card.id, card.version, setId)] ?? 0;

  const label = getVersionLabel(card.version);
  const effect = getVersionEffect(card.version);
  const isH    = effect === "holofoil";
  const isGold = effect === "goldBorder";
  const isRH   = effect === "reverseHolofoil" || effect === "metal";
  const labelColor = getVersionColor(card.version);
  const isGray = userId ? (qty === 0) : false;
  const isWanted = wishlistCards.some(w => w.card_id === card.id && w.set_id === setId);
  const [togglingWish, setTogglingWish] = useState(false);

  async function handleWishlistToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!userId || togglingWish) return;
    setTogglingWish(true);
    const supabase = createClient();
    if (isWanted) {
      await supabase.from("card_wishlist").delete().eq("user_id", userId).eq("card_id", card.id).eq("set_id", setId);
      onWishlistChange(wishlistCards.filter(w => !(w.card_id === card.id && w.set_id === setId)));
    } else {
      await supabase.from("card_wishlist").insert({ user_id: userId, card_id: card.id, set_id: setId });
      onWishlistChange([...wishlistCards, { card_id: card.id, set_id: setId }]);
    }
    setTogglingWish(false);
  }

  const shadowStyle = isGray
    ? "0 8px 24px rgba(0,0,0,0.5)"
    : isH
    ? "0 16px 48px rgba(255,160,80,0.35), 0 4px 16px rgba(0,0,0,0.6)"
    : isGold
    ? "0 16px 48px rgba(255,200,50,0.45), 0 4px 16px rgba(0,0,0,0.6)"
    : isRH
    ? "0 16px 48px rgba(180,180,220,0.25), 0 4px 16px rgba(0,0,0,0.6)"
    : "0 12px 40px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.4)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>

      <div
        className="tcg-card-wrap"
        style={{ cursor: "pointer", position: "relative" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onCardClick}
        title={VERSION_FULL[label] ?? label}
      >
        <div className="tcg-card-body" style={{
          borderRadius: "12px",
          overflow: "hidden",
          position: "relative",
          opacity: isGray ? 0.45 : 1,
          boxShadow: shadowStyle,
          transition: "opacity 0.3s ease",
        }}>
          <img src={fotoChica(card.image)} alt={card.name} loading="lazy" decoding="async" style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />

          {isRH && !isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(220,220,240,0.3) 0%, transparent 60%), linear-gradient(105deg, transparent 20%, rgba(200,200,230,0.1) 45%, transparent 70%)`,
              mixBlendMode: "screen",
            }} />
          )}

          {(isH || isGold) && !isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: isGold
                ? `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,220,80,0.35) 0%, rgba(255,160,0,0.2) 50%, transparent 90%)`
                : `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(255,100,100,0.2) 0%, rgba(80,255,120,0.15) 50%, transparent 90%)`,
              mixBlendMode: "color-dodge",
              animation: isGold ? "goldShift 4s ease-in-out infinite" : "holoShift 4s ease-in-out infinite",
            }} />
          )}

          {(isH || isGold) && !isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: isGold
                ? `linear-gradient(120deg, transparent 0%, rgba(255,200,50,0.15) 35%, transparent 70%)`
                : `linear-gradient(120deg, transparent 0%, rgba(255,100,150,0.1) 35%, transparent 70%)`,
              mixBlendMode: "screen",
            }} />
          )}

          {!isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)`,
              mixBlendMode: "screen",
            }} />
          )}

          <div style={{
            position: "absolute", bottom: "10px", right: "10px", zIndex: 10,
            fontFamily: MONO, fontSize: "10px", letterSpacing: "0.12em",
            color: labelColor, border: `1px solid ${labelColor}60`,
            borderRadius: "5px", padding: "3px 8px",
            background: "rgba(5,7,13,0.88)",
            pointerEvents: "none",
          }}>
            {VERSION_FULL[label] ?? label}
          </div>
        </div>
      </div>

      <span style={{
        fontFamily: MONO, fontSize: "12px", letterSpacing: "0.06em",
        color: INK0, textAlign: "center", lineHeight: 1.3, maxWidth: "100%",
      }}>
        #{String(card.card_number).padStart(3, "0")} {card.name}
      </span>

      {userId && (
        <>
          {/* Un contador por idioma: agregar en volumen no deberia obligar a
              entrar carta por carta solo para decir en que idioma esta. */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {INVENTORY_LANGUAGES.map(lang => (
              <QtyControl
                key={lang.code}
                cardId={card.id} setId={setId} version={card.version}
                qty={inventory[invLangKey(card.id, card.version, setId, lang.code)] ?? 0}
                language={lang.code} showFlag
                userId={userId} onChange={onQtyChange}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleWishlistToggle}
            disabled={togglingWish}
            title={isWanted ? "Quitar de wishlist" : "Agregar a wishlist"}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              fontFamily: MONO, fontSize: "10px", letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: isWanted ? "#e05580" : INK2,
              background: isWanted ? "rgba(224,85,128,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${isWanted ? "rgba(224,85,128,0.45)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "6px", padding: "5px 12px",
              cursor: togglingWish ? "wait" : "pointer",
              transition: "all 0.15s", width: "100%", justifyContent: "center",
            }}
          >
            <Heart size={12} fill={isWanted ? "currentColor" : "none"} />
            {isWanted ? "En wishlist" : "Wishlist"}
          </button>
        </>
      )}
    </div>
  );
}

/* ── Tap real vs. scroll ───────────────────────────────────────
   En móvil un touchend crudo dispara aunque el dedo venga deslizando.
   Solo contamos como tap si el dedo casi no se movió y el contacto fue breve. */
const TAP_SLOP_PX = 12;
const TAP_MAX_MS  = 700;

function useTapProps(onTap: () => void, enabled: boolean) {
  const start   = useRef<{ x: number; y: number; t: number } | null>(null);
  const moved   = useRef(false);
  const lastTouchEnd = useRef(0);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
      moved.current = false;
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (!start.current || moved.current) return;
      const t = e.touches[0];
      if (Math.hypot(t.clientX - start.current.x, t.clientY - start.current.y) > TAP_SLOP_PX) {
        moved.current = true;
      }
    },
    onTouchCancel: () => { start.current = null; moved.current = true; },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = start.current;
      start.current = null;
      /* Marca el gesto táctil para descartar el click sintético que viene después */
      lastTouchEnd.current = Date.now();
      if (!enabled || !s || moved.current) return;
      if (Date.now() - s.t > TAP_MAX_MS) return;
      e.preventDefault();
      onTap();
    },
    onClick: () => {
      /* En táctil ya lo resolvió onTouchEnd; aquí solo pasan mouse y teclado */
      if (Date.now() - lastTouchEnd.current < 600) return;
      if (enabled) onTap();
    },
  };
}

/* ── Thumb base ────────────────────────────────────────────── */
function Thumb({
  imgSrc, imgW, imgH, label, sublabel, isOpen, isGray, onClick, badgeText, showPronto,
}: {
  imgSrc: string; imgW: number; imgH: number;
  label: string; sublabel?: string;
  isOpen: boolean; isGray?: boolean;
  onClick: () => void; badgeText?: string; showPronto?: boolean;
}) {
  const clickable = !isGray;
  const tapProps = useTapProps(onClick, clickable);
  return (
    <button
      type="button"
      {...tapProps}
      className={`pks-thumb${isOpen ? " pks-thumb--open" : ""}${!clickable ? " pks-thumb--gray" : ""}`}
      style={{
        background: isOpen ? "rgba(46,230,193,0.08)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isOpen ? `${COURT}55` : "rgba(255,255,255,0.07)"}`,
        cursor: clickable ? "pointer" : "default",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
        padding: "18px 14px", borderRadius: "14px",
        transition: "background 0.2s, border-color 0.2s",
        outline: "none", width: "158px", minWidth: "158px",
      }}
    >
      <div style={{
        position: "relative", width: `${imgW}px`, height: `${imgH}px`, flexShrink: 0,
        filter: isGray ? "grayscale(1) opacity(0.9)" : "none",
        transition: "filter 0.3s",
      }}>
        <Image src={imgSrc} alt={label} fill style={{ objectFit: "contain" }} loading="lazy" sizes="130px" />
        {showPronto && (
          <div style={{
            position: "absolute", top: "-6px", right: "-6px",
            fontFamily: MONO, fontSize: "8px", letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#fff",
            background: "#e03535", borderRadius: "4px",
            padding: "2px 6px", pointerEvents: "none",
            boxShadow: "0 2px 6px rgba(224,53,53,0.5)",
          }}>
            Pronto
          </div>
        )}
      </div>
      <span style={{
        fontFamily: MONO, fontSize: "10px", letterSpacing: "0.08em",
        color: isGray ? INK2 : INK0, textAlign: "center", lineHeight: 1.4,
        maxWidth: "130px",
      }}>
        {label}
      </span>
      {sublabel && !isGray && (
        <span style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em", color: INK2 }}>
          {sublabel}
        </span>
      )}
      {badgeText && !isGray && (
        <span style={{
          fontFamily: MONO, fontSize: "9px", letterSpacing: "0.12em",
          color: COURT, textTransform: "uppercase",
        }}>
          {badgeText}
        </span>
      )}
    </button>
  );
}

/* ── Sub-label helper ──────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: MONO, fontSize: "11px", letterSpacing: "0.2em",
      textTransform: "uppercase", color: COURT, marginBottom: "20px",
      display: "flex", alignItems: "center", gap: "10px",
    }}>
      <span style={{ width: "16px", height: "1px", background: COURT, display: "inline-block" }} />
      {children}
    </div>
  );
}

/* ── Franja del set: volver, logo, nombre y progreso en una sola pieza ── */
function SetHeader({
  set, seriesName, cards, inventory, userId, loading, onBack,
}: {
  set: PokemonSet; seriesName?: string; cards: PokemonCard[];
  inventory: InventoryMap; userId?: string; loading: boolean;
  onBack: () => void;
}) {
  const total    = cards.length;
  const unique   = cards.filter(c => (inventory[invKey(c.id, c.version, set.id)] ?? 0) > 0).length;
  const totalQty = cards.reduce((s, c) => s + (inventory[invKey(c.id, c.version, set.id)] ?? 0), 0);
  const pct      = total > 0 ? Math.round((unique / total) * 100) : 0;

  return (
    <HeadStrip
      logo={set.logo}
      eyebrow={seriesName}
      title={set.name}
      subtitle={loading ? "Cargando…" : `${total} cartas`}
      onBack={onBack}
    >
      {userId && total > 0 && (
        <div className="pks-progress" style={{ flex: "0 1 340px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", marginBottom: "7px" }}>
            <span style={{ fontFamily: DISP, fontSize: "18px", color: INK0, lineHeight: 1 }}>
              {pct}<span style={{ fontSize: "12px", color: INK2 }}>%</span>
            </span>
            <span style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.06em", color: INK2, whiteSpace: "nowrap" }}>
              <span style={{ color: COURT, fontWeight: 600 }}>{unique}</span>/{total} únicas · {totalQty} copias
            </span>
          </div>
          <div style={{ height: "6px", background: "rgba(255,255,255,0.07)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`, minWidth: pct > 0 ? "6px" : 0,
              background: `linear-gradient(90deg, ${COURT}, #d6ff3d)`,
              borderRadius: "999px", transition: "width 0.4s ease",
            }} />
          </div>
        </div>
      )}
    </HeadStrip>
  );
}

/**
 * Franja de cabecera con botón de volver. La usan la vista de una serie y la de
 * un set, para que "volver" esté siempre en el mismo lugar.
 */
function HeadStrip({
  logo, eyebrow, title, subtitle, onBack, children,
}: {
  logo: string; eyebrow?: string; title: string; subtitle?: string;
  onBack: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="pks-sethead" style={{
      display: "flex", alignItems: "center", gap: "18px",
      padding: "14px 18px", marginBottom: "16px",
      background: "rgba(255,255,255,0.02)", borderRadius: "14px",
      border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flex: "1 1 auto" }}>
        <button type="button" onClick={onBack} aria-label="Volver" className="pks-back">
          <ChevronLeft size={18} aria-hidden />
        </button>
        <div className="pks-head-logo" style={{ position: "relative", width: "96px", height: "40px", flexShrink: 0 }}>
          <Image src={logo} alt="" fill sizes="96px" style={{ objectFit: "contain", objectPosition: "left center" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          {eyebrow && (
            <div style={{
              fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase",
              color: COURT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {eyebrow}
            </div>
          )}
          <h3 style={{
            fontFamily: DISP, fontSize: "clamp(17px, 2.2vw, 21px)", color: INK0, margin: "2px 0 0",
            lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {title}
          </h3>
          {subtitle && (
            <div style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.08em", color: INK2, marginTop: "2px" }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ── Píldora de filtro ─────────────────────────────────────── */
function Pill({ active, onClick, children, count }: {
  active: boolean; onClick: () => void; children: React.ReactNode; count?: number;
}) {
  return (
    <button type="button" onClick={onClick} className={`pks-pill${active ? " pks-pill--on" : ""}`}>
      {children}
      {count !== undefined && <span className="pks-pill-n">{count}</span>}
    </button>
  );
}

/* ── Main section ───────────────────────────────────────────── */
type InvFilter = "todas" | "tengo" | "faltan";

type DrillView = "series" | "sets" | "cards";

/* Cache loaded card arrays in memory so re-opening a set is instant */
const cardCache: Record<string, PokemonCard[]> = {};

const PAGE_SIZE = 40;

function InfiniteScrollSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisible(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);
  return <div ref={ref} style={{ height: "1px", marginTop: "40px" }} />;
}

export function PokemonSetsSection({ userId }: { userId?: string }) {
  const [view,         setView]        = useState<DrillView>("series");
  const [openSeriesId, setOpenSeriesId] = useState<string | null>(null);
  const [openSetId,    setOpenSetId]    = useState<string | null>(null);
  const [setCards,     setSetCards]     = useState<PokemonCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [inventory,    setInventory]    = useState<InventoryMap>({});
  const [loadingInv,   setLoadingInv]   = useState(false);
  const [invFilter,     setInvFilter]     = useState<InvFilter>("todas");
  const [versionFilter, setVersionFilter] = useState<string>("todas");
  const [search,        setSearch]        = useState<string>("");
  const [visibleCount,  setVisibleCount]  = useState<number>(PAGE_SIZE);
  const [selectedCard, setSelectedCard] = useState<{ card: PokemonCard; setId: string } | null>(null);
  const [featuredCards, setFeaturedCards] = useState<FeaturedCard[]>([]);
  const [wishlistCards, setWishlistCards] = useState<WishlistCard[]>([]);
  const [userListings,  setUserListings]  = useState<UserListing[]>([]);
  const [addingWish,    setAddingWish]    = useState<"idle" | "loading" | "done">("idle");

  const openSeries = POKEMON_SERIES.find(s => s.id === openSeriesId);
  // El set se busca en todas las series, no solo en la abierta: a un set suelto
  // se entra directo desde Expansiones, sin pasar por ninguna serie.
  const openSet    = POKEMON_SERIES.flatMap(s => s.sets).find(s => s.id === openSetId);
  const setSeries  = POKEMON_SERIES.find(s => s.sets.some(x => x.id === openSetId));

  useEffect(() => { setInvFilter("todas"); setVersionFilter("todas"); setSearch(""); setAddingWish("idle"); setVisibleCount(PAGE_SIZE); }, [openSetId]);

  /* Fetch featured cards and active listings for logged-in user */
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("featured_cards")
      .select("card_id, set_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) setFeaturedCards(data as FeaturedCard[]);
      });
    fetchAllRows<WishlistCard>(() => supabase
      .from("card_wishlist")
      .select("card_id, set_id")
      .eq("user_id", userId)
    ).then(setWishlistCards)
      // Sin la wishlist cargada, "agregar faltantes" intentaría duplicar filas:
      // queda marcada como no lista y el botón usa upsert igual.
      .catch(e => console.error("No se pudo cargar la wishlist", e));
    supabase
      .from("market_listings")
      .select("id, card_id, set_id, price_cop, version")
      .eq("user_id", userId)
      .eq("status", "active")
      .then(({ data }) => {
        if (data) setUserListings(data as UserListing[]);
      });
  }, [userId]);

  /* Lazy-load card data when a set is opened */
  useEffect(() => {
    if (!openSetId) return;
    if (cardCache[openSetId]) { setSetCards(cardCache[openSetId]); return; }
    // Si se cambia de set antes de que termine, el resultado viejo no debe
    // dibujarse bajo el título del set nuevo.
    let cancelado = false;
    setLoadingCards(true);
    fetchSetCards(openSetId).then(cards => {
      cardCache[openSetId] = cards;
      if (cancelado) return;
      setSetCards(cards);
      setLoadingCards(false);
    });
    return () => { cancelado = true; };
  }, [openSetId]);

  useEffect(() => {
    if (!userId || !openSetId) return;
    setLoadingInv(true);
    const supabase = createClient();
    supabase
      .from("card_inventory")
      .select("card_id, version, quantity, language")
      .eq("user_id", userId)
      .eq("set_id", openSetId)
      .then(({ data }) => {
        if (data) {
          // El mapa guarda dos cosas: la llave por idioma (una fila) y la llave
          // agregada (la suma de todos los idiomas de esa carta).
          const map: InventoryMap = {};
          data.forEach(r => {
            const version = r.version ?? "normal";
            const lang    = r.language ?? DEFAULT_CARD_LANGUAGE;
            map[invLangKey(r.card_id, version, openSetId, lang)] = r.quantity;
            const agg = invKey(r.card_id, version, openSetId);
            map[agg] = (map[agg] ?? 0) + r.quantity;
          });
          setInventory(prev => ({ ...prev, ...map }));
        }
        setLoadingInv(false);
      });
  }, [userId, openSetId]);

  const handleInventoryChange = useCallback((key: string, qty: number) => {
    setInventory(prev => ({ ...prev, [key]: qty }));
  }, []);

  /** QtyControl reporta la fila del idioma y el nuevo total de la carta. */
  const handleQtyChange = useCallback((langKey: string, qty: number, delta: number, aggKey: string) => {
    setInventory(prev => ({
      ...prev,
      [langKey]: qty,
      [aggKey]:  Math.max(0, (prev[aggKey] ?? 0) + delta),
    }));
  }, []);

  async function handleAddAllMissingToWishlist() {
    if (!userId || !openSetId || addingWish === "loading") return;
    setAddingWish("loading");
    const missing = setCards.filter(c => (inventory[invKey(c.id, c.version, openSetId)] ?? 0) === 0);
    const toAdd   = missing.filter(c => !wishlistCards.some(w => w.card_id === c.id && w.set_id === openSetId));
    if (toAdd.length > 0) {
      const supabase = createClient();
      // upsert ignorando las que ya estén: con un insert, una sola repetida
      // hacía fallar el lote entero y la pantalla igual las marcaba agregadas.
      const { error } = await supabase.from("card_wishlist").upsert(
        toAdd.map(c => ({ user_id: userId, card_id: c.id, set_id: openSetId })),
        { onConflict: "user_id,card_id,set_id", ignoreDuplicates: true },
      );
      if (error) {
        window.alert(`No se pudieron agregar a la wishlist: ${error.message}`);
        setAddingWish("idle");
        return;
      }
      setWishlistCards(prev => [...prev, ...toAdd.map(c => ({ card_id: c.id, set_id: openSetId! }))]);
    }
    setAddingWish("done");
    setTimeout(() => setAddingWish("idle"), 2500);
  }

  function goToSeries() {
    setView("series");
    setOpenSeriesId(null);
    setOpenSetId(null);
    setTimeout(() => window.scrollTo(0, 0), 50);
  }

  function goToSets(seriesId: string) {
    setOpenSeriesId(seriesId);
    setOpenSetId(null);
    setView("sets");
    setTimeout(() => window.scrollTo(0, 0), 50);
  }

  function goToCards(setId: string) {
    setOpenSetId(setId);
    setView("cards");
    setTimeout(() => window.scrollTo(0, 0), 50);
  }

  return (
    <section style={{ background: BG0, padding: "0 0 80px" }}>
      {/* Sin cabecera propia: quien la usa ya pone el título ("Agregar al inventario") */}
      <div className="pks-body" style={{ padding: "24px 32px 0" }}>

        {/* ── VISTA: Series ── */}
        {view === "series" && (
          <>
            <SectionLabel>
              Expansiones
              <span style={{ color: INK2, letterSpacing: "0.12em" }}>
                · {POKEMON_SERIES.filter(s => !s.standalone).length} series · {POKEMON_SERIES.reduce((a, s) => a + s.sets.length, 0)} sets
              </span>
            </SectionLabel>
            <div className="pks-thumbs" style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "40px" }}>
              {POKEMON_SERIES.filter(s => !s.standalone).map(series => (
                <Thumb
                  key={series.id}
                  imgSrc={series.icon}
                  imgW={110} imgH={50}
                  label={series.name}
                  sublabel={`${series.sets.length} sets`}
                  isOpen={false}
                  onClick={() => goToSets(series.id)}
                />
              ))}
              {/* Sets sueltos: no tienen expansión que los agrupe, así que van
                  aquí mismo y entran directo a las cartas. */}
              {STANDALONE_SETS.map(set => {
                const cardCount = SET_CARD_COUNT[set.id] ?? 0;
                return (
                  <Thumb
                    key={set.id}
                    imgSrc={set.logo}
                    imgW={110} imgH={50}
                    label={set.name}
                    sublabel={cardCount ? `${cardCount} cartas` : undefined}
                    isOpen={false}
                    isGray={!cardCount}
                    showPronto={!cardCount}
                    onClick={() => { if (cardCount) goToCards(set.id); }}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* ── VISTA: Sets ── */}
        {view === "sets" && openSeries && (
          <>
            <HeadStrip
              logo={openSeries.icon}
              eyebrow="Expansiones"
              title={openSeries.name}
              subtitle={`${openSeries.sets.length} sets`}
              onBack={goToSeries}
            />
            <div className="pks-thumbs" style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "40px" }}>
              {openSeries.sets.map(set => {
                const cardCount = SET_CARD_COUNT[set.id] ?? 0;
                return (
                  <Thumb
                    key={set.id}
                    imgSrc={set.logo}
                    imgW={120} imgH={56}
                    label={set.name}
                    isOpen={false}
                    isGray={!cardCount}
                    badgeText={cardCount ? `${cardCount} cartas` : undefined}
                    showPronto={!cardCount}
                    onClick={() => { if (cardCount) goToCards(set.id); }}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* ── VISTA: Cards ── */}
        {view === "cards" && openSet && (() => {
          const allCards = setCards;

          // Variantes únicas del set, ordenadas
          const setVersions = [...new Set(allCards.map(c => c.version))].sort();

          // El texto busca por nombre y por número (el impreso y el del master set).
          const q = search.trim().toLowerCase();
          const filteredCards = allCards.filter(card => {
            const qty = inventory[invKey(card.id, card.version, openSet.id)] ?? 0;
            if (invFilter === "tengo"  && qty === 0) return false;
            if (invFilter === "faltan" && qty  >  0) return false;
            if (versionFilter !== "todas" && card.version !== versionFilter) return false;
            if (q && !`${card.name} ${card.id} ${card.card_number}`.toLowerCase().includes(q)) return false;
            return true;
          });
          const visibleCards = filteredCards.slice(0, visibleCount);
          const hasMore = filteredCards.length > visibleCount;
          return (
            <>
              <SetHeader
                set={openSet}
                // Un set suelto no tiene expansión: "volver" lleva a Expansiones.
                seriesName={setSeries && !setSeries.standalone ? setSeries.name : undefined}
                cards={allCards}
                inventory={inventory}
                userId={userId}
                loading={loadingCards || loadingInv}
                onBack={() => setSeries && !setSeries.standalone ? goToSets(setSeries.id) : goToSeries()}
              />

              {/* Filtros: buscador + wishlist arriba, píldoras abajo */}
              {(() => {
                const tengoCount  = allCards.filter(c => (inventory[invKey(c.id, c.version, openSet.id)] ?? 0) > 0).length;
                const faltanCount = allCards.length - tengoCount;
                const pasaEstado = (c: PokemonCard) => {
                  const qty = inventory[invKey(c.id, c.version, openSet.id)] ?? 0;
                  if (invFilter === "tengo"  && qty === 0) return false;
                  if (invFilter === "faltan" && qty  >  0) return false;
                  return true;
                };
                const setFiltro = (fn: () => void) => { fn(); setVisibleCount(PAGE_SIZE); };
                return (
                  <div style={{ marginBottom: "24px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                      <div style={{ position: "relative", display: "flex", alignItems: "center", flex: "1 1 auto", minWidth: 0, maxWidth: "420px" }}>
                        <Search size={14} style={{ position: "absolute", left: "14px", color: INK2, pointerEvents: "none" }} />
                        <input
                          type="text"
                          value={search}
                          onChange={e => setFiltro(() => setSearch(e.target.value))}
                          placeholder="Buscar por nombre o número"
                          className="pks-search"
                        />
                        {search && (
                          <button
                            type="button"
                            onClick={() => setFiltro(() => setSearch(""))}
                            aria-label="Limpiar búsqueda"
                            style={{
                              position: "absolute", right: "10px", display: "flex", alignItems: "center",
                              background: "none", border: "none", padding: "2px", cursor: "pointer", color: INK2,
                            }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      {userId && (
                        <button
                          type="button"
                          onClick={handleAddAllMissingToWishlist}
                          disabled={addingWish === "loading" || setCards.length === 0 || faltanCount === 0}
                          title="Agrega a tu wishlist todas las cartas que te faltan de este set"
                          className="pks-wish"
                          style={{
                            color: addingWish === "done" ? BG0 : "#e05580",
                            background: addingWish === "done" ? COURT : "rgba(224,85,128,0.08)",
                            borderColor: addingWish === "done" ? COURT : "rgba(224,85,128,0.4)",
                            opacity: addingWish === "loading" || faltanCount === 0 ? 0.5 : 1,
                            cursor: addingWish === "loading" || faltanCount === 0 ? "default" : "pointer",
                          }}
                        >
                          {addingWish === "done" ? <Check size={13} aria-hidden /> : <Heart size={13} aria-hidden />}
                          <span className="pks-wish-txt">
                            {addingWish === "done" ? "Agregadas" : addingWish === "loading" ? "Agregando…" : "Faltantes a wishlist"}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="pks-pills">
                      {userId && (
                        <div className="pks-pill-group pks-pill-group--estado" role="group" aria-label="Filtrar por inventario">
                          <Pill active={invFilter === "todas"}  onClick={() => setFiltro(() => setInvFilter("todas"))}  count={allCards.length}>Todas</Pill>
                          <Pill active={invFilter === "tengo"}  onClick={() => setFiltro(() => setInvFilter("tengo"))}  count={tengoCount}>Tengo</Pill>
                          <Pill active={invFilter === "faltan"} onClick={() => setFiltro(() => setInvFilter("faltan"))} count={faltanCount}>Faltan</Pill>
                        </div>
                      )}
                      {setVersions.length > 1 && (
                        <>
                          {userId && <span className="pks-pill-sep" aria-hidden />}
                          <div className="pks-pill-group" role="group" aria-label="Filtrar por variante">
                            <Pill active={versionFilter === "todas"} onClick={() => setFiltro(() => setVersionFilter("todas"))}>
                              <Layers size={12} aria-hidden style={{ flexShrink: 0 }} />
                              <span className="pks-hide-sm">Todas las variantes</span>
                              <span className="pks-show-sm">Todas</span>
                            </Pill>
                            {setVersions.map(v => (
                              <Pill
                                key={v}
                                active={versionFilter === v}
                                onClick={() => setFiltro(() => setVersionFilter(v))}
                                count={allCards.filter(c => c.version === v && pasaEstado(c)).length}
                              >
                                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: getVersionColor(v), flexShrink: 0 }} />
                                {VERSION_FULL[getVersionLabel(v)] ?? getVersionLabel(v)}
                              </Pill>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="pks-cards-grid" style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 240px)",
                gap: "32px 24px",
                justifyContent: "center",
                width: "100%",
              }}>
                {visibleCards.map((card, i) => (
                  <TiltCard
                    key={`${card.id}-${card.version}-${i}`}
                    card={card}
                    userId={userId}
                    setId={openSet.id}
                    inventory={inventory}
                    onQtyChange={handleQtyChange}
                    onCardClick={() => setSelectedCard({ card, setId: openSet.id })}
                    wishlistCards={wishlistCards}
                    onWishlistChange={setWishlistCards}
                  />
                ))}
                {filteredCards.length === 0 && (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 0", color: INK2, fontFamily: MONO, fontSize: "12px", letterSpacing: "0.1em" }}>
                    No hay cartas en este filtro
                  </div>
                )}
              </div>
              {hasMore && <InfiniteScrollSentinel onVisible={() => setVisibleCount(c => c + PAGE_SIZE)} />}
            </>
          );
        })()}

      </div>

      {/* Card detail modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard.card}
          setId={selectedCard.setId}
          userId={userId}
          inventory={inventory}
          onInventoryChange={handleInventoryChange}
          featuredCards={featuredCards}
          onFeaturedChange={setFeaturedCards}
          wishlistCards={wishlistCards}
          onWishlistChange={setWishlistCards}
          userListings={userListings}
          onListingsChange={setUserListings}
          onClose={() => setSelectedCard(null)}
        />
      )}

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
        .tcg-card-wrap { width: 240px; }
        .tcg-card-body { width: 240px; height: 336px; overflow: hidden; position: relative; background: linear-gradient(135deg, #0e1420 0%, #161d2e 50%, #0e1420 100%); }
        .pks-thumb:not(.pks-thumb--open):not(.pks-thumb--gray):hover { background: rgba(46,230,193,0.05) !important; }

        .pks-back {
          width: 34px; height: 34px; flex-shrink: 0; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: ${INK0};
          transition: background 0.15s, border-color 0.15s;
        }
        .pks-back:hover { background: rgba(46,230,193,0.1); border-color: ${COURT}66; }

        .pks-search {
          width: 100%; min-width: 0; height: 38px; padding: 0 34px 0 38px;
          font-family: ${MONO}; font-size: 12px; letter-spacing: 0.04em; color: ${INK0};
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 999px; outline: none; transition: border-color 0.15s, background 0.15s;
        }
        .pks-search::placeholder { color: ${INK2}; }
        .pks-search:focus { border-color: ${COURT}88; background: rgba(46,230,193,0.04); }

        .pks-wish {
          display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 16px;
          flex-shrink: 0; white-space: nowrap; border-radius: 999px; border: 1px solid;
          font-family: ${MONO}; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;
          transition: all 0.2s; margin-left: auto;
        }

        .pks-pills {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
        }
        .pks-pill-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0; }
        .pks-show-sm { display: none; }
        .pks-pill {
          display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 12px;
          flex-shrink: 0; white-space: nowrap; cursor: pointer; border-radius: 999px;
          font-family: ${MONO}; font-size: 10.5px; letter-spacing: 0.06em; color: #c9cfdd;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .pks-pill:hover { border-color: rgba(255,255,255,0.2); color: ${INK0}; }
        .pks-pill--on, .pks-pill--on:hover { background: rgba(46,230,193,0.12); border-color: ${COURT}88; color: ${INK0}; }
        .pks-pill-n { font-size: 9.5px; color: ${INK2}; }
        .pks-pill--on .pks-pill-n { color: ${COURT}; }
        .pks-pill-sep { width: 1px; height: 18px; background: rgba(255,255,255,0.1); margin: 0 6px; flex-shrink: 0; }

        @media (max-width: 767px), (pointer: coarse) {
          .pks-body   { padding: 16px 16px 0 !important; }
          .pks-sethead { flex-wrap: wrap; gap: 12px !important; padding: 12px 14px !important; }
          .pks-progress { flex: 1 1 100% !important; }
          .pks-head-logo { width: 72px !important; height: 32px !important; }
          .pks-search { font-size: 16px; height: 40px; }  /* 16px: iOS no hace zoom al tocarlo */
          .pks-wish { width: 40px; height: 40px; padding: 0; justify-content: center; }
          .pks-wish-txt { display: none; }
          /* En el celular: estado como control segmentado a todo el ancho y las
             variantes debajo, partiendo línea. Nada queda cortado en el borde. */
          .pks-pills { flex-direction: column; align-items: stretch; gap: 8px; }
          .pks-pill-sep { display: none; }
          .pks-pill-group--estado {
            display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0;
            padding: 3px; border-radius: 999px;
            background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          }
          .pks-pill-group--estado .pks-pill { justify-content: center; border-color: transparent; background: none; height: 32px; }
          .pks-pill-group--estado .pks-pill--on { background: rgba(46,230,193,0.14); border-color: ${COURT}88; }
          .pks-pill { height: 32px; font-size: 11px; }
          .pks-hide-sm { display: none; }
          .pks-show-sm { display: inline; }
          .pks-cards-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 28px 10px !important;
            align-items: start !important;
          }
          .tcg-card-wrap { width: 100% !important; max-width: 100% !important; }
          .tcg-card-body { width: 100% !important; height: auto !important; aspect-ratio: 5 / 7 !important; }
          .pks-thumbs {
            justify-content: center !important;
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }
          .pks-thumb {
            width: 100% !important;
            min-width: unset !important;
            max-width: unset !important;
          }
        }
      `}</style>
    </section>
  );
}
