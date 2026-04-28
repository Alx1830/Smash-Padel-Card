"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { POKEMON_SERIES, type PokemonSet } from "@/data/pokemon-sets";
import { SET_CARDS, VERSION_LABEL, type PokemonCard } from "@/data/pokemon-cards";

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

type InventoryMap = Record<number, number>; // card_id → quantity

/* ── Inventory controls ─────────────────────────────────────── */
function QtyControl({
  cardId, setId, qty, userId, onChange,
}: {
  cardId: number; setId: string; qty: number;
  userId: string; onChange: (cardId: number, qty: number) => void;
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

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    background: "none", border: `1px solid ${disabled ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)"}`,
    color: disabled ? INK2 : INK0, borderRadius: "4px",
    width: "22px", height: "22px", cursor: disabled ? "default" : "pointer",
    fontFamily: MONO, fontSize: "13px", lineHeight: 1,
    display: "flex", alignItems: "center", justifyContent: "center",
    opacity: loading ? 0.5 : 1, transition: "border-color 0.15s, color 0.15s",
    flexShrink: 0,
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <button style={btnStyle(qty === 0 || loading)} onClick={() => update(-1)} disabled={qty === 0 || loading}>−</button>
      <span style={{ fontFamily: MONO, fontSize: "12px", color: qty > 0 ? COURT : INK2, minWidth: "16px", textAlign: "center" }}>
        {qty}
      </span>
      <button style={btnStyle(loading)} onClick={() => update(1)} disabled={loading}>+</button>
    </div>
  );
}

/* ── Tiltable TCG card ─────────────────────────────────────── */
function TcgCard({
  card, userId, setId, inventory, onInventoryChange,
}: {
  card: PokemonCard;
  userId?: string;
  setId: string;
  inventory: InventoryMap;
  onInventoryChange: (cardId: number, qty: number) => void;
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
    setTilt({
      x: (-(ny - 0.5)) * 24,
      y: (  (nx - 0.5)) * 24,
    });
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>

      {/* Card with 3D tilt */}
      <div
        ref={ref}
        style={{ perspective: "800px", cursor: "pointer", width: "100%", maxWidth: "240px" }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onMouseEnter={() => setHovered(true)}
      >
        <div style={{
          width: "100%", aspectRatio: "5 / 7",
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
            sizes="240px"
            unoptimized
          />

          {/* RH — metallic shimmer */}
          {isRH && !isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `
                radial-gradient(ellipse 80% 60% at ${mx}% ${my}%,
                  rgba(220,220,240,0.55) 0%,
                  rgba(180,180,210,0.25) 30%,
                  transparent 60%),
                linear-gradient(
                  ${105 + tilt.y * 2}deg,
                  transparent 20%,
                  rgba(200,200,230,0.18) 35%,
                  rgba(255,255,255,0.28) 45%,
                  rgba(200,200,230,0.18) 55%,
                  transparent 70%
                )
              `,
              mixBlendMode: "screen",
            }} />
          )}

          {/* H — rainbow holographic */}
          {isH && !isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `
                radial-gradient(ellipse 90% 70% at ${mx}% ${my}%,
                  rgba(255,100,100,0.5)   0%,
                  rgba(255,200,50,0.4)   15%,
                  rgba(80,255,120,0.4)   30%,
                  rgba(50,180,255,0.4)   45%,
                  rgba(180,80,255,0.4)   60%,
                  rgba(255,80,200,0.35)  75%,
                  transparent            90%)
              `,
              mixBlendMode: "color-dodge",
              animation: "holoShift 4s ease-in-out infinite",
            }} />
          )}

          {/* H — second layer for depth */}
          {isH && !isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `linear-gradient(
                ${120 + tilt.y * 3}deg,
                transparent        0%,
                rgba(255,100,150,0.15) 20%,
                rgba(80,200,255,0.2)   35%,
                rgba(200,80,255,0.15)  50%,
                rgba(255,200,80,0.15)  65%,
                transparent        80%
              )`,
              mixBlendMode: "screen",
            }} />
          )}

          {/* Base sheen */}
          {!isGray && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `linear-gradient(${110 + tilt.y}deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)`,
              mixBlendMode: "screen",
            }} />
          )}

          {/* Version badge */}
          <div style={{
            position: "absolute", bottom: "10px", right: "10px",
            fontFamily: MONO, fontSize: "11px", letterSpacing: "0.15em",
            color: labelColor,
            border: `1px solid ${labelColor}80`,
            borderRadius: "5px", padding: "3px 9px",
            background: "rgba(5,7,13,0.75)",
            backdropFilter: "blur(4px)",
            pointerEvents: "none",
          }}>
            {label}
          </div>
        </div>
      </div>

      {/* Card name */}
      <span style={{
        fontFamily: MONO, fontSize: "10px", letterSpacing: "0.06em",
        color: INK2, textAlign: "center", lineHeight: 1.3,
        maxWidth: "100%",
      }}>
        #{String(card.card_number).padStart(3, "0")} {card.name}
      </span>

      {/* Inventory controls */}
      {userId && (
        <QtyControl
          cardId={card.id}
          setId={setId}
          qty={qty}
          userId={userId}
          onChange={onInventoryChange}
        />
      )}
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
        <Image src={imgSrc} alt={label} fill style={{ objectFit: "contain" }} unoptimized />
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
function SetProgress({ setId, inventory }: { setId: string; inventory: InventoryMap }) {
  const cards = SET_CARDS[setId];
  if (!cards) return null;
  const total   = cards.length;
  const unique  = cards.filter(c => (inventory[c.id] ?? 0) > 0).length;
  const totalQty = cards.reduce((s, c) => s + (inventory[c.id] ?? 0), 0);
  const pct = total > 0 ? Math.round((unique / total) * 100) : 0;

  return (
    <div style={{ marginBottom: "32px", padding: "20px 24px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: INK2 }}>
          Progreso Master Set
        </span>
        <div style={{ display: "flex", gap: "24px" }}>
          <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", color: COURT }}>
            {unique}/{total} únicas
          </span>
          <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", color: INK2 }}>
            {totalQty} total
          </span>
          <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", color: INK0 }}>
            {pct}%
          </span>
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

export function PokemonSetsSection({ userId }: { userId?: string }) {
  const [openSeriesId, setOpenSeriesId] = useState<string | null>(null);
  const [openSetId,    setOpenSetId]    = useState<string | null>(null);
  const [inventory,    setInventory]    = useState<InventoryMap>({});
  const [loadingInv,   setLoadingInv]   = useState(false);
  const [activeFilter, setActiveFilter] = useState<CardFilter>("todas");

  const openSeries = POKEMON_SERIES.find(s => s.id === openSeriesId);
  const openSet    = openSeries?.sets.find(s => s.id === openSetId);

  // Reset filter when set changes
  useEffect(() => { setActiveFilter("todas"); }, [openSetId]);

  // Fetch inventory for the open set when it changes
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

        {/* ── Series grid ── */}
        <SectionLabel>Series</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "40px" }}>
          {POKEMON_SERIES.map(series => (
            <Thumb
              key={series.id}
              imgSrc={series.icon}
              imgW={110} imgH={50}
              label={series.name}
              sublabel={`${series.sets.length} sets`}
              isOpen={openSeriesId === series.id}
              onClick={() => {
                setOpenSeriesId(prev => prev === series.id ? null : series.id);
                setOpenSetId(null);
              }}
            />
          ))}
        </div>

        {/* ── Sets grid ── */}
        {openSeries && (
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "32px", marginBottom: "40px",
          }}>
            <SectionLabel>{openSeries.name} — {openSeries.sets.length} sets</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {openSeries.sets.map(set => {
                const hasCards = !!SET_CARDS[set.id];
                return (
                  <Thumb
                    key={set.id}
                    imgSrc={set.logo}
                    imgW={120} imgH={56}
                    label={set.name}
                    isOpen={openSetId === set.id}
                    isGray={!hasCards}
                    badgeText={hasCards ? `${SET_CARDS[set.id].length} cartas` : undefined}
                    onClick={() => {
                      if (!hasCards) return;
                      setOpenSetId(prev => prev === set.id ? null : set.id);
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── Cards grid ── */}
        {openSet && SET_CARDS[openSet.id] && (() => {
          const allCards = SET_CARDS[openSet.id];
          const visibleCards = allCards.filter(card => {
            if (activeFilter === "tengo")           return (inventory[card.id] ?? 0) > 0;
            if (activeFilter === "faltan")          return (inventory[card.id] ?? 0) === 0;
            if (activeFilter === "normal")          return card.version === "normal";
            if (activeFilter === "holofoil")        return card.version === "holofoil";
            if (activeFilter === "reverseHolofoil") return card.version === "reverseHolofoil";
            return true;
          });
          return (
            <div style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: "32px", paddingBottom: "40px",
            }}>
              <SectionLabel>
                {openSet.name} — {allCards.length} cartas
                {loadingInv && <span style={{ color: INK2, fontSize: "10px", marginLeft: "8px" }}>cargando...</span>}
              </SectionLabel>

              {userId && (
                <SetProgress setId={openSet.id} inventory={inventory} />
              )}

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
                    {f.id === "tengo" && userId ? ` (${allCards.filter(c => (inventory[c.id] ?? 0) > 0).length})` : ""}
                    {f.id === "faltan" && userId ? ` (${allCards.filter(c => (inventory[c.id] ?? 0) === 0).length})` : ""}
                  </button>
                ))}
              </div>

              <div className="pks-cards-grid" style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "32px 16px",
                justifyItems: "center",
              }}>
                {visibleCards.map(card => (
                  <TcgCard
                    key={card.id}
                    card={card}
                    userId={userId}
                    setId={openSet.id}
                    inventory={inventory}
                    onInventoryChange={handleInventoryChange}
                  />
                ))}
                {visibleCards.length === 0 && (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 0", color: INK2, fontFamily: MONO, fontSize: "12px", letterSpacing: "0.1em" }}>
                    No hay cartas en este filtro
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      </div>

      <style>{`
        @keyframes holoShift {
          0%   { opacity: 0.7; filter: hue-rotate(0deg); }
          50%  { opacity: 1;   filter: hue-rotate(180deg); }
          100% { opacity: 0.7; filter: hue-rotate(360deg); }
        }
        @media (max-width: 767px) {
          .pks-header { padding: 48px 20px 32px !important; }
          .pks-body   { padding: 0 20px !important; }
          .pks-cards-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 20px 12px !important; }
        }
      `}</style>
    </section>
  );
}
