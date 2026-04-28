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

/* ── Thumb base — shared card style ───────────────────────── */
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

/* ── Main section ───────────────────────────────────────────── */
export function PokemonSetsSection() {
  const [openSeriesId, setOpenSeriesId] = useState<string | null>(null);
  const [openSetId,    setOpenSetId]    = useState<string | null>(null);

  const openSeries = POKEMON_SERIES.find(s => s.id === openSeriesId);
  const openSet    = openSeries?.sets.find(s => s.id === openSetId);

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

        {/* ── Sets grid (visible when a series is open) ── */}
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
                    sublabel={set.symbol ? undefined : undefined}
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

        {/* ── Cards grid (visible when a set is open) ── */}
        {openSet && SET_CARDS[openSet.id] && (
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "32px", paddingBottom: "40px",
          }}>
            <SectionLabel>
              {openSet.name} — {SET_CARDS[openSet.id].length} cartas
            </SectionLabel>
            <div className="pks-cards-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "32px 24px",
              justifyItems: "center",
            }}>
              {SET_CARDS[openSet.id].map(card => (
                <TcgCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        )}

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
