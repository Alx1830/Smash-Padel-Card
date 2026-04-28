"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES, type PokemonSet } from "@/data/pokemon-sets";
import { VERSION_LABEL, SET_CARD_COUNT, type PokemonCard } from "@/data/pokemon-cards";

/* Lazy-load card data only when a set is opened */
async function fetchSetCards(setId: string): Promise<PokemonCard[]> {
  const mod = await import("@/data/pokemon-cards");
  return mod.SET_CARDS[setId] ?? [];
}

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const BG0   = "#05070d";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const VERSION_COLOR: Record<string, string> = {
  N:  "#7a8298",
  RH: "#2ee6c1",
  H:  "#ffd24f",
};

const VERSION_FULL: Record<string, string> = {
  N:  "Normal",
  RH: "Reverse Holo",
  H:  "Holofoil",
};

const ALL_SETS_FLAT = POKEMON_SERIES.flatMap(s => s.sets);

type InventoryMap = Record<number, number>; // card_id → quantity
type FeaturedCard = { card_id: number; set_id: string };

/* ── Inventory controls ─────────────────────────────────────── */
function QtyControl({
  cardId, setId, qty, userId, onChange, dark,
}: {
  cardId: number; setId: string; qty: number;
  userId: string; onChange: (cardId: number, qty: number) => void;
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
        .eq("user_id", userId).eq("card_id", cardId).eq("set_id", setId);
    } else {
      await supabase.from("card_inventory")
        .upsert({ user_id: userId, card_id: cardId, set_id: setId, quantity: next },
          { onConflict: "user_id,card_id,set_id" });
    }
    onChange(cardId, next);
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

/* ── Card image with 3D tilt (reusable) ─────────────────────── */
function TiltCard({
  card, userId, setId, inventory, onInventoryChange, onCardClick,
}: {
  card: PokemonCard;
  userId?: string;
  setId: string;
  inventory: InventoryMap;
  onInventoryChange: (cardId: number, qty: number) => void;
  onCardClick?: () => void;
}) {
  const ref   = useRef<HTMLDivElement>(null);
  const [tilt, setTilt]       = useState({ x: 0, y: 0 });
  const [mouse, setMouse]     = useState({ x: 0.5, y: 0.5 });
  const [hovered, setHovered] = useState(false);

  const qty = inventory[card.id] ?? 0;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top)  / r.height;
    setMouse({ x: nx, y: ny });
    setTilt({ x: (-(ny - 0.5)) * 24, y: ((nx - 0.5)) * 24 });
  };
  const onLeave = () => {
    setTilt({ x: 0, y: 0 });
    setMouse({ x: 0.5, y: 0.5 });
    setHovered(false);
  };

  const label = VERSION_LABEL[card.version];
  const labelColor = VERSION_COLOR[label] ?? INK2;
  const isRH = label === "RH";
  const isH  = label === "H";
  const isGray = userId ? (qty === 0 && !hovered) : false;

  const mx = mouse.x * 100;
  const my = mouse.y * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>

      {/* Card with 3D tilt */}
      <div
        ref={ref}
        className="tcg-card-wrap"
        style={{ perspective: "800px", cursor: "pointer" }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onMouseEnter={() => setHovered(true)}
        onClick={onCardClick}
        title={VERSION_FULL[label] ?? label}
      >
        <div className="tcg-card-body" style={{
          borderRadius: "12px",
          overflow: "hidden",
          position: "relative",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: tilt.x === 0
            ? "transform 0.6s cubic-bezier(0.2,0.8,0.2,1), filter 0.3s ease"
            : "transform 0.05s linear, filter 0.3s ease",
          willChange: "transform",
          filter: isGray ? "grayscale(1) brightness(0.5)" : "none",
          boxShadow: isGray
            ? "0 8px 24px rgba(0,0,0,0.5)"
            : isH
            ? "0 16px 48px rgba(255,160,80,0.35), 0 4px 16px rgba(0,0,0,0.6)"
            : isRH
            ? "0 16px 48px rgba(180,180,220,0.25), 0 4px 16px rgba(0,0,0,0.6)"
            : "0 12px 40px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.4)",
        }}>
          <Image
            src={card.image}
            alt={card.name}
            fill
            style={{ objectFit: "cover" }}
            sizes="(max-width: 767px) 45vw, 240px"
            loading="lazy"
            unoptimized
          />

          {isRH && !isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `
                radial-gradient(ellipse 80% 60% at ${mx}% ${my}%,
                  rgba(220,220,240,0.55) 0%, rgba(180,180,210,0.25) 30%, transparent 60%),
                linear-gradient(${105 + tilt.y * 2}deg,
                  transparent 20%, rgba(200,200,230,0.18) 35%, rgba(255,255,255,0.28) 45%,
                  rgba(200,200,230,0.18) 55%, transparent 70%)
              `,
              mixBlendMode: "screen",
            }} />
          )}

          {isH && !isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `
                radial-gradient(ellipse 90% 70% at ${mx}% ${my}%,
                  rgba(255,100,100,0.5) 0%, rgba(255,200,50,0.4) 15%,
                  rgba(80,255,120,0.4) 30%, rgba(50,180,255,0.4) 45%,
                  rgba(180,80,255,0.4) 60%, rgba(255,80,200,0.35) 75%, transparent 90%)
              `,
              mixBlendMode: "color-dodge",
              animation: "holoShift 4s ease-in-out infinite",
            }} />
          )}

          {isH && !isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `linear-gradient(${120 + tilt.y * 3}deg,
                transparent 0%, rgba(255,100,150,0.15) 20%, rgba(80,200,255,0.2) 35%,
                rgba(200,80,255,0.15) 50%, rgba(255,200,80,0.15) 65%, transparent 80%)`,
              mixBlendMode: "screen",
            }} />
          )}

          {!isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `linear-gradient(${110 + tilt.y}deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)`,
              mixBlendMode: "screen",
            }} />
          )}

          <div style={{
            position: "absolute", bottom: "10px", right: "10px",
            fontFamily: MONO, fontSize: "11px", letterSpacing: "0.15em",
            color: labelColor, border: `1px solid ${labelColor}80`,
            borderRadius: "5px", padding: "3px 9px",
            background: "rgba(5,7,13,0.75)", backdropFilter: "blur(4px)",
            pointerEvents: "none",
          }}>
            {label}
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
        <QtyControl
          cardId={card.id} setId={setId} qty={qty}
          userId={userId} onChange={onInventoryChange}
        />
      )}
    </div>
  );
}

/* ── Card Detail Modal ──────────────────────────────────────── */
function CardDetailModal({
  card, setId, userId, inventory, onInventoryChange,
  featuredCards, onFeaturedChange, onClose,
}: {
  card: PokemonCard; setId: string;
  userId?: string; inventory: InventoryMap;
  onInventoryChange: (cardId: number, qty: number) => void;
  featuredCards: FeaturedCard[];
  onFeaturedChange: (cards: FeaturedCard[]) => void;
  onClose: () => void;
}) {
  const setInfo    = ALL_SETS_FLAT.find(s => s.id === setId);
  const label      = VERSION_LABEL[card.version];
  const versionFull = VERSION_FULL[label] ?? label;
  const qty        = inventory[card.id] ?? 0;
  const isFeatured  = featuredCards.some(f => f.card_id === card.id && f.set_id === setId);
  const featCount   = featuredCards.length;
  const hasInInv    = qty > 0;
  const [featuring, setFeaturing] = useState(false);
  const canFeature  = hasInInv && (isFeatured || featCount < 10);

  const handleToggleFeatured = async () => {
    if (!userId || featuring) return;
    setFeaturing(true);
    const supabase = createClient();
    if (isFeatured) {
      await supabase.from("featured_cards")
        .delete()
        .eq("user_id", userId).eq("card_id", card.id).eq("set_id", setId);
      onFeaturedChange(featuredCards.filter(f => !(f.card_id === card.id && f.set_id === setId)));
    } else {
      if (featCount >= 10) { setFeaturing(false); return; }
      await supabase.from("featured_cards")
        .insert({ user_id: userId, card_id: card.id, set_id: setId });
      onFeaturedChange([...featuredCards, { card_id: card.id, set_id: setId }]);
    }
    setFeaturing(false);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const MODAL_BG   = "rgba(245,247,251,0.97)";
  const DARK       = "#05070d";
  const DARK2      = "#4a5268";
  const BORDER_CLR = "rgba(5,7,13,0.1)";

  const tableRows = [
    { label: "Número", value: `#${String(card.card_number).padStart(3, "0")}` },
    { label: "Tipo",   value: versionFull },
    {
      label: "Set",
      value: setInfo
        ? <div style={{ position: "relative", width: "90px", height: "32px" }}>
            <Image src={setInfo.logo} alt={setInfo.name} fill style={{ objectFit: "contain", objectPosition: "left center" }} unoptimized />
          </div>
        : setId,
    },
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
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "14px", right: "16px",
            background: "none", border: "none", cursor: "pointer",
            color: DARK2, fontSize: "18px", lineHeight: 1, padding: "6px 8px",
            borderRadius: "6px",
          }}
        >✕</button>

        {/* Left: Card image with tilt */}
        <div className="modal-card-col" style={{ flexShrink: 0, width: "200px" }}>
          <ModalTiltCard card={card} />
        </div>

        {/* Right: Details */}
        <div className="modal-details-col" style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontFamily: DISP, fontSize: "20px", letterSpacing: "-0.01em",
            margin: "0 0 20px", color: DARK, lineHeight: 1.1,
          }}>
            {card.name}
          </h2>

          {/* Table rows */}
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

          {/* Inventory controls */}
          {userId && (
            <>
              <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: DARK2 }}>
                  Inventario
                </span>
                <QtyControl
                  cardId={card.id} setId={setId} qty={qty}
                  userId={userId} onChange={onInventoryChange}
                  dark
                />
              </div>

              {/* Destacar */}
              <button
                onClick={handleToggleFeatured}
                disabled={featuring || !canFeature}
                style={{
                  width: "100%", padding: "12px 16px",
                  fontFamily: MONO, fontSize: "11px", letterSpacing: "0.16em",
                  textTransform: "uppercase", borderRadius: "10px",
                  cursor: featuring || !canFeature ? "default" : "pointer",
                  transition: "all 0.2s",
                  opacity: featuring ? 0.6 : 1,
                  background: isFeatured ? COURT : canFeature ? "transparent" : "transparent",
                  color: isFeatured ? BG0 : canFeature ? COURT : "#aab0c2",
                  border: `1.5px solid ${isFeatured ? COURT : canFeature ? COURT : "rgba(170,176,194,0.4)"}`,
                }}
              >
                {isFeatured ? "✓ Destacada" : "Destacar"}
              </button>

              {!canFeature && !hasInInv && (
                <p style={{
                  fontFamily: MONO, fontSize: "10px", color: "#d95555",
                  margin: "8px 0 0", letterSpacing: "0.08em", textAlign: "center",
                }}>
                  Necesitas tener esta carta en tu inventario para destacarla.
                </p>
              )}
              {!canFeature && hasInInv && featCount >= 10 && (
                <p style={{
                  fontFamily: MONO, fontSize: "10px", color: "#d95555",
                  margin: "8px 0 0", letterSpacing: "0.08em", textAlign: "center",
                }}>
                  Máximo 10 cartas destacadas — quita una para agregar esta.
                </p>
              )}

              <p style={{
                fontFamily: MONO, fontSize: "10px", color: DARK2,
                margin: "10px 0 0", letterSpacing: "0.08em", textAlign: "center",
              }}>
                {featCount}/10 cartas destacadas
              </p>
            </>
          )}
        </div>
      </div>

      <style>{`
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

/* Static tilt card for inside the modal */
function ModalTiltCard({ card }: { card: PokemonCard }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt]   = useState({ x: 0, y: 0 });
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  const label = VERSION_LABEL[card.version];
  const labelColor = VERSION_COLOR[label] ?? INK2;
  const isRH = label === "RH";
  const isH  = label === "H";
  const mx = mouse.x * 100;
  const my = mouse.y * 100;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top)  / r.height;
    setMouse({ x: nx, y: ny });
    setTilt({ x: (-(ny - 0.5)) * 20, y: ((nx - 0.5)) * 20 });
  };
  const onLeave = () => { setTilt({ x: 0, y: 0 }); setMouse({ x: 0.5, y: 0.5 }); };

  return (
    <div
      ref={ref}
      style={{ perspective: "800px", cursor: "pointer" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div style={{
        width: "100%", aspectRatio: "5 / 7",
        borderRadius: "12px", overflow: "hidden", position: "relative",
        transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: tilt.x === 0 ? "transform 0.6s cubic-bezier(0.2,0.8,0.2,1)" : "transform 0.05s linear",
        willChange: "transform",
        boxShadow: isH
          ? "0 16px 48px rgba(255,160,80,0.45), 0 4px 16px rgba(0,0,0,0.5)"
          : isRH
          ? "0 16px 48px rgba(180,180,220,0.3), 0 4px 16px rgba(0,0,0,0.5)"
          : "0 12px 40px rgba(0,0,0,0.6)",
      }}>
        <Image src={card.image} alt={card.name} fill style={{ objectFit: "cover" }} sizes="220px" unoptimized />

        {isRH && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
            background: `radial-gradient(ellipse 80% 60% at ${mx}% ${my}%, rgba(220,220,240,0.55) 0%, rgba(180,180,210,0.25) 30%, transparent 60%),
              linear-gradient(${105 + tilt.y * 2}deg, transparent 20%, rgba(200,200,230,0.18) 35%, rgba(255,255,255,0.28) 45%, rgba(200,200,230,0.18) 55%, transparent 70%)`,
          }} />
        )}
        {isH && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "color-dodge",
            background: `radial-gradient(ellipse 90% 70% at ${mx}% ${my}%, rgba(255,100,100,0.5) 0%, rgba(255,200,50,0.4) 15%, rgba(80,255,120,0.4) 30%, rgba(50,180,255,0.4) 45%, rgba(180,80,255,0.4) 60%, rgba(255,80,200,0.35) 75%, transparent 90%)`,
            animation: "holoShift 4s ease-in-out infinite",
          }} />
        )}
        {isH && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
            background: `linear-gradient(${120 + tilt.y * 3}deg, transparent 0%, rgba(255,100,150,0.15) 20%, rgba(80,200,255,0.2) 35%, rgba(200,80,255,0.15) 50%, rgba(255,200,80,0.15) 65%, transparent 80%)`,
          }} />
        )}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
          background: `linear-gradient(${110 + tilt.y}deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)`,
        }} />

        <div style={{
          position: "absolute", bottom: "10px", right: "10px",
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.15em",
          color: labelColor, border: `1px solid ${labelColor}80`,
          borderRadius: "5px", padding: "3px 8px",
          background: "rgba(5,7,13,0.8)", backdropFilter: "blur(4px)",
          pointerEvents: "none",
        }}>
          {label}
        </div>
      </div>
    </div>
  );
}

/* ── Thumb base ────────────────────────────────────────────── */
function Thumb({
  imgSrc, imgW, imgH, label, sublabel, isOpen, isGray, onClick, badgeText,
}: {
  imgSrc: string; imgW: number; imgH: number;
  label: string; sublabel?: string;
  isOpen: boolean; isGray?: boolean;
  onClick: () => void; badgeText?: string;
}) {
  const clickable = !isGray;
  return (
    <button
      onClick={onClick}
      style={{
        background: isOpen ? "rgba(46,230,193,0.08)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isOpen ? `${COURT}55` : "rgba(255,255,255,0.07)"}`,
        cursor: clickable ? "pointer" : "default",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
        padding: "18px 14px", borderRadius: "14px",
        transition: "background 0.2s, border-color 0.2s",
        outline: "none",
      }}
      onMouseEnter={e => {
        if (clickable && !isOpen) (e.currentTarget as HTMLButtonElement).style.background = "rgba(46,230,193,0.05)";
      }}
      onMouseLeave={e => {
        if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.02)";
      }}
    >
      <div style={{
        position: "relative", width: `${imgW}px`, height: `${imgH}px`, flexShrink: 0,
        filter: isGray ? "grayscale(1) brightness(0.45)" : "none",
        transition: "filter 0.3s",
      }}>
        <Image src={imgSrc} alt={label} fill style={{ objectFit: "contain" }} loading="lazy" sizes="130px" />
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

/* ── Progress bar ──────────────────────────────────────────── */
function SetProgress({ cards, inventory }: { cards: PokemonCard[]; inventory: InventoryMap }) {
  if (!cards.length) return null;
  const total    = cards.length;
  const unique   = cards.filter(c => (inventory[c.id] ?? 0) > 0).length;
  const totalQty = cards.reduce((s, c) => s + (inventory[c.id] ?? 0), 0);
  const pct = total > 0 ? Math.round((unique / total) * 100) : 0;

  return (
    <div style={{ marginBottom: "32px", padding: "20px 24px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: INK2 }}>
          Progreso Master Set
        </span>
        <div style={{ display: "flex", gap: "24px" }}>
          <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", color: COURT }}>{unique}/{total} únicas</span>
          <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", color: INK2 }}>{totalQty} total</span>
          <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", color: INK0 }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${COURT}, #4ff0ff)`,
          borderRadius: "2px", transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

/* ── Main section ───────────────────────────────────────────── */
type CardFilter = "todas" | "tengo" | "faltan" | "normal" | "holofoil" | "reverseHolofoil";

const FILTERS: { id: CardFilter; label: string; authOnly?: boolean }[] = [
  { id: "todas",           label: "Todas" },
  { id: "tengo",           label: "Cartas en inventario", authOnly: true },
  { id: "faltan",          label: "Cartas restantes",     authOnly: true },
  { id: "normal",          label: "Normales" },
  { id: "reverseHolofoil", label: "Reverse Holo" },
  { id: "holofoil",        label: "Holofoil" },
];

/* ── Breadcrumb ─────────────────────────────────────────────── */
function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      fontFamily: MONO, fontSize: "11px", letterSpacing: "0.12em",
      marginBottom: "28px", flexWrap: "wrap",
    }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {i > 0 && <span style={{ color: INK2 }}>›</span>}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: COURT, fontFamily: MONO, fontSize: "11px",
                letterSpacing: "0.12em", textTransform: "uppercase", padding: 0,
                textDecoration: "underline", textDecorationColor: `${COURT}55`,
                textUnderlineOffset: "3px",
              }}
            >
              {item.label}
            </button>
          ) : (
            <span style={{ color: INK0, textTransform: "uppercase" }}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

type DrillView = "series" | "sets" | "cards";

/* Cache loaded card arrays in memory so re-opening a set is instant */
const cardCache: Record<string, PokemonCard[]> = {};

export function PokemonSetsSection({ userId }: { userId?: string }) {
  const [view,         setView]        = useState<DrillView>("series");
  const [openSeriesId, setOpenSeriesId] = useState<string | null>(null);
  const [openSetId,    setOpenSetId]    = useState<string | null>(null);
  const [setCards,     setSetCards]     = useState<PokemonCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [inventory,    setInventory]    = useState<InventoryMap>({});
  const [loadingInv,   setLoadingInv]   = useState(false);
  const [activeFilter, setActiveFilter] = useState<CardFilter>("todas");
  const [selectedCard, setSelectedCard] = useState<{ card: PokemonCard; setId: string } | null>(null);
  const [featuredCards, setFeaturedCards] = useState<FeaturedCard[]>([]);

  const openSeries = POKEMON_SERIES.find(s => s.id === openSeriesId);
  const openSet    = openSeries?.sets.find(s => s.id === openSetId);

  useEffect(() => { setActiveFilter("todas"); }, [openSetId]);

  /* Fetch featured cards for logged-in user */
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
  }, [userId]);

  /* Lazy-load card data when a set is opened */
  useEffect(() => {
    if (!openSetId) return;
    if (cardCache[openSetId]) { setSetCards(cardCache[openSetId]); return; }
    setLoadingCards(true);
    fetchSetCards(openSetId).then(cards => {
      cardCache[openSetId] = cards;
      setSetCards(cards);
      setLoadingCards(false);
    });
  }, [openSetId]);

  useEffect(() => {
    if (!userId || !openSetId) return;
    setLoadingInv(true);
    const supabase = createClient();
    supabase
      .from("card_inventory")
      .select("card_id, quantity")
      .eq("user_id", userId)
      .eq("set_id", openSetId)
      .then(({ data }) => {
        if (data) {
          const map: InventoryMap = {};
          data.forEach(r => { map[r.card_id] = r.quantity; });
          setInventory(prev => ({ ...prev, ...map }));
        }
        setLoadingInv(false);
      });
  }, [userId, openSetId]);

  const handleInventoryChange = useCallback((cardId: number, qty: number) => {
    setInventory(prev => ({ ...prev, [cardId]: qty }));
  }, []);

  function goToSeries() {
    setView("series");
    setOpenSeriesId(null);
    setOpenSetId(null);
  }

  function goToSets(seriesId: string) {
    setOpenSeriesId(seriesId);
    setOpenSetId(null);
    setView("sets");
  }

  function goToCards(setId: string) {
    setOpenSetId(setId);
    setView("cards");
  }

  return (
    <section style={{ background: BG0, padding: "0 0 80px" }}>
      {/* Header */}
      <div className="pks-header" style={{ padding: "64px 80px 48px" }}>
        <div style={{
          fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em",
          textTransform: "uppercase", color: COURT,
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
        }}>
          <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
          Colección
        </div>
        <h2 style={{
          fontFamily: DISP, fontSize: "clamp(28px, 3vw, 42px)",
          letterSpacing: "-0.02em", margin: 0, color: INK0,
        }}>
          Pokémon TCG Sets
        </h2>
        <p style={{
          fontFamily: MONO, fontSize: "12px", letterSpacing: "0.1em",
          color: INK2, marginTop: "10px", textTransform: "uppercase",
        }}>
          {POKEMON_SERIES.length} series · {POKEMON_SERIES.reduce((a, s) => a + s.sets.length, 0)} sets
        </p>
      </div>

      <div className="pks-body" style={{ padding: "0 80px" }}>

        {/* ── VISTA: Series ── */}
        {view === "series" && (
          <>
            <SectionLabel>Series</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "40px" }}>
              {POKEMON_SERIES.map(series => (
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
            </div>
          </>
        )}

        {/* ── VISTA: Sets ── */}
        {view === "sets" && openSeries && (
          <>
            <Breadcrumb items={[
              { label: "Series", onClick: goToSeries },
              { label: openSeries.name },
            ]} />
            <SectionLabel>{openSeries.name} — {openSeries.sets.length} sets</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "40px" }}>
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
          const visibleCards = allCards.filter(card => {
            if (activeFilter === "tengo")           return (inventory[card.id] ?? 0) > 0;
            if (activeFilter === "faltan")          return (inventory[card.id] ?? 0) === 0;
            if (activeFilter === "normal")          return card.version === "normal";
            if (activeFilter === "holofoil")        return card.version === "holofoil";
            if (activeFilter === "reverseHolofoil") return card.version === "reverseHolofoil";
            return true;
          });
          return (
            <>
              <Breadcrumb items={[
                { label: "Series", onClick: goToSeries },
                { label: openSeries!.name, onClick: () => goToSets(openSeries!.id) },
                { label: openSet.name },
              ]} />

              <SectionLabel>
                {openSet.name} — {allCards.length} cartas
                {(loadingCards || loadingInv) && <span style={{ color: INK2, fontSize: "10px", marginLeft: "8px" }}>cargando...</span>}
              </SectionLabel>

              {userId && <SetProgress cards={allCards} inventory={inventory} />}

              {/* Filter buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "28px" }}>
                {FILTERS.filter(f => !f.authOnly || userId).map(f => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    style={{
                      fontFamily: MONO, fontSize: "10px", letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: activeFilter === f.id ? BG0 : INK2,
                      background: activeFilter === f.id ? COURT : "rgba(255,255,255,0.04)",
                      border: `1px solid ${activeFilter === f.id ? COURT : "rgba(255,255,255,0.1)"}`,
                      borderRadius: "6px", padding: "5px 12px",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {f.label}
                    {f.id === "tengo"  && userId ? ` (${allCards.filter(c => (inventory[c.id] ?? 0) > 0).length})` : ""}
                    {f.id === "faltan" && userId ? ` (${allCards.filter(c => (inventory[c.id] ?? 0) === 0).length})` : ""}
                  </button>
                ))}
              </div>

              <div className="pks-cards-grid" style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "32px 24px",
                justifyItems: "center",
              }}>
                {visibleCards.map(card => (
                  <TiltCard
                    key={card.id}
                    card={card}
                    userId={userId}
                    setId={openSet.id}
                    inventory={inventory}
                    onInventoryChange={handleInventoryChange}
                    onCardClick={() => setSelectedCard({ card, setId: openSet.id })}
                  />
                ))}
                {visibleCards.length === 0 && (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 0", color: INK2, fontFamily: MONO, fontSize: "12px", letterSpacing: "0.1em" }}>
                    No hay cartas en este filtro
                  </div>
                )}
              </div>
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
          onClose={() => setSelectedCard(null)}
        />
      )}

      <style>{`
        @keyframes holoShift {
          0%   { opacity: 0.7; filter: hue-rotate(0deg); }
          50%  { opacity: 1;   filter: hue-rotate(180deg); }
          100% { opacity: 0.7; filter: hue-rotate(360deg); }
        }
        .tcg-card-wrap { width: 240px; }
        .tcg-card-body { width: 240px; height: 336px; overflow: hidden; position: relative; }
        @media (max-width: 767px) {
          .pks-header { padding: 48px 12px 32px !important; }
          .pks-body   { padding: 0 12px !important; }
          .pks-cards-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 28px 10px !important;
            align-items: start !important;
          }
          .tcg-card-wrap { width: 100% !important; max-width: 100% !important; }
          .tcg-card-body { width: 100% !important; height: auto !important; aspect-ratio: 5 / 7 !important; }
        }
      `}</style>
    </section>
  );
}
