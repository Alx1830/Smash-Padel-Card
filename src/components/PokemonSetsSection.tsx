"use client";

import { useRef, useState } from "react";
import Image from "next/image";
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

/* ── Tiltable TCG card ─────────────────────────────────────── */
function TcgCard({ card }: { card: PokemonCard }) {
  const ref  = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

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
  };

  const label = VERSION_LABEL[card.version];
  const labelColor = VERSION_COLOR[label] ?? INK2;
  const isRH = label === "RH";
  const isH  = label === "H";

  const mx = mouse.x * 100;
  const my = mouse.y * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>

      {/* Card with 3D tilt */}
      <div
        ref={ref}
        style={{ perspective: "800px", cursor: "pointer" }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <div style={{
          width: "240px", height: "336px",
          borderRadius: "12px",
          overflow: "hidden",
          position: "relative",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: tilt.x === 0 ? "transform 0.6s cubic-bezier(0.2,0.8,0.2,1)" : "transform 0.05s linear",
          willChange: "transform",
          boxShadow: isH
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
          {isRH && (
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
          {isH && (
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
          {isH && (
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

          {/* Base sheen for all */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `linear-gradient(${110 + tilt.y}deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)`,
            mixBlendMode: "screen",
          }} />

          {/* Version badge — bottom right corner overlay */}
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
        maxWidth: "240px",
      }}>
        #{String(card.card_number).padStart(3, "0")} {card.name}
      </span>
    </div>
  );
}

/* ── Set thumbnail (B&W if no cards, color if has cards) ───── */
function SetThumb({
  set, isOpen, hasCards, onClick,
}: {
  set: PokemonSet;
  isOpen: boolean;
  hasCards: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", cursor: hasCards ? "pointer" : "default",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
        padding: "16px 12px",
        borderRadius: "12px",
        outline: isOpen ? `2px solid ${COURT}` : "2px solid transparent",
        outlineOffset: "2px",
        transition: "background 0.2s, outline-color 0.2s",
      }}
      onMouseEnter={e => {
        if (hasCards) (e.currentTarget as HTMLButtonElement).style.background = "rgba(46,230,193,0.07)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "none";
      }}
    >
      {/* Logo */}
      <div style={{
        position: "relative", width: "120px", height: "56px",
        filter: hasCards ? "none" : "grayscale(1) brightness(0.5)",
        transition: "filter 0.3s",
      }}>
        <Image src={set.logo} alt={set.name} fill style={{ objectFit: "contain" }} unoptimized />
      </div>

      {/* Symbol + name */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {set.symbol && (
          <div style={{
            position: "relative", width: "18px", height: "18px", flexShrink: 0,
            filter: hasCards ? "none" : "grayscale(1) brightness(0.4)",
          }}>
            <Image src={set.symbol} alt="" fill style={{ objectFit: "contain" }} unoptimized />
          </div>
        )}
        <span style={{
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.08em",
          color: hasCards ? INK0 : INK2,
          textAlign: "center", lineHeight: 1.3,
        }}>
          {set.name}
        </span>
      </div>

      {hasCards && (
        <span style={{
          fontFamily: MONO, fontSize: "9px", letterSpacing: "0.12em",
          color: COURT, textTransform: "uppercase",
        }}>
          {SET_CARDS[set.id].length} cartas ↓
        </span>
      )}
    </button>
  );
}

/* ── Main section ───────────────────────────────────────────── */
export function PokemonSetsSection() {
  const [openSeriesId, setOpenSeriesId] = useState<string | null>(null);
  const [openSetId,    setOpenSetId]    = useState<string | null>(null);

  const toggleSet = (setId: string) => {
    if (!SET_CARDS[setId]) return;
    setOpenSetId(prev => prev === setId ? null : setId);
  };

  return (
    <section style={{ background: BG0, padding: "0 0 80px" }}>
      {/* Header */}
      <div className="pks-header" style={{
        padding: "64px 80px 48px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
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

      {/* Accordion */}
      <div className="pks-body" style={{ padding: "0 80px" }}>
        {POKEMON_SERIES.map(series => {
          const isSeriesOpen = openSeriesId === series.id;
          return (
            <div key={series.id} style={{
              borderTop: "1px solid rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}>
              {/* Series row */}
              <button
                onClick={() => {
                  setOpenSeriesId(prev => prev === series.id ? null : series.id);
                  setOpenSetId(null);
                }}
                style={{
                  width: "100%", background: "none", border: "none",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  gap: "20px", padding: "20px 0", textAlign: "left",
                }}
              >
                <div style={{ position: "relative", width: "56px", height: "32px", flexShrink: 0 }}>
                  <Image src={series.icon} alt={series.name} fill style={{ objectFit: "contain" }} unoptimized />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: DISP, fontSize: "18px", letterSpacing: "-0.01em", color: INK0 }}>
                    {series.name}
                  </span>
                  <span style={{
                    fontFamily: MONO, fontSize: "11px", color: INK2,
                    letterSpacing: "0.1em", marginLeft: "12px",
                  }}>
                    {series.sets.length} sets
                  </span>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                  style={{
                    flexShrink: 0, color: INK2,
                    transform: isSeriesOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.3s ease",
                  }}
                >
                  <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Sets grid */}
              {isSeriesOpen && (
                <div>
                  <div style={{
                    display: "flex", flexWrap: "wrap", gap: "12px",
                    paddingBottom: "24px",
                  }}>
                    {series.sets.map(set => {
                      const hasCards = !!SET_CARDS[set.id];
                      const isSetOpen = openSetId === set.id;
                      return (
                        <div key={set.id}>
                          <SetThumb
                            set={set}
                            isOpen={isSetOpen}
                            hasCards={hasCards}
                            onClick={() => toggleSet(set.id)}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Cards panel — shown below the set grid */}
                  {openSetId && series.sets.some(s => s.id === openSetId) && SET_CARDS[openSetId] && (
                    <div style={{
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      paddingTop: "32px", paddingBottom: "40px",
                    }}>
                      <div style={{
                        fontFamily: MONO, fontSize: "11px", letterSpacing: "0.2em",
                        textTransform: "uppercase", color: COURT, marginBottom: "24px",
                        display: "flex", alignItems: "center", gap: "10px",
                      }}>
                        <span style={{ width: "16px", height: "1px", background: COURT, display: "inline-block" }} />
                        {series.sets.find(s => s.id === openSetId)?.name} — {SET_CARDS[openSetId].length} cartas
                      </div>
                      <div className="pks-cards-grid" style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(6, 1fr)",
                        gap: "32px 24px",
                        justifyItems: "center",
                      }}>
                        {SET_CARDS[openSetId].map(card => (
                          <TcgCard key={card.id} card={card} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />
      </div>

      <style>{`
        @keyframes holoShift {
          0%   { opacity: 0.7; filter: hue-rotate(0deg); }
          50%  { opacity: 1;   filter: hue-rotate(180deg); }
          100% { opacity: 0.7; filter: hue-rotate(360deg); }
        }
        @media (max-width: 767px) {
          .pks-header { padding: 48px 24px 32px !important; }
          .pks-body   { padding: 0 24px !important; }
          .pks-cards-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  );
}
