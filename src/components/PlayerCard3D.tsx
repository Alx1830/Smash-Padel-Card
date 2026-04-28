"use client";

import { useRef, useState } from "react";
import Image from "next/image";

/**
 * Faithful translation of PlayerCard.jsx + styles.css
 * Scaled proportionally: CSS used 420px wide, we use 260px (ratio ≈ 0.62)
 */

interface PlayerCardProps {
  username: string;   // → rank  (N°Alx1830)
  firstName: string;
  lastName: string;
  position: string;
  category: string;   // → rarity  ("7MA CATEGORIA" → "7MA")
  year: string;       // → season
  photoUrl?: string;
}

// CSS tokens
const COURT  = "#2ee6c1";
const BALL   = "#d6ff3d";
const HOLO3  = "#ffd24f";
const INK0   = "#f5f7fb";
const INK1   = "#c9cfdd";

export function PlayerCard3D({
  username,
  firstName,
  lastName,
  position,
  category,
  year,
  photoUrl,
}: PlayerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  /* Mouse-tracking 3-D tilt (added on top of CSS design) */
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTilt({
      x: (-(e.clientY - r.top  - r.height / 2) / (r.height / 2)) * 14,
      y: (  (e.clientX - r.left - r.width  / 2) / (r.width  / 2)) * 14,
    });
  };
  const onLeave = () => setTilt({ x: 0, y: 0 });

  const rarity = category; // "7MA CATEGORIA"

  /* ── Watermark rows (styles.css: 8 spans, alternating offset/color) ── */
  const wmRows = Array.from({ length: 8 });

  return (
    <>
    <style>{`
      @property --border-angle {
        syntax: "<angle>";
        inherits: false;
        initial-value: 0deg;
      }
      @keyframes border-spin {
        to { --border-angle: 360deg; }
      }
      .card-border-animated {
        animation: border-spin 4s linear infinite;
      }
    `}</style>
    <div
      ref={cardRef}
      className="relative select-none flex-shrink-0"
      /* .card — 420×672 scaled ×0.619 → 260×416 */
      style={{
        perspective: "900px",
        width: "260px",
        height: "416px",
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {/* ── .card — conic-gradient border + box-shadow ── */}
      <div
        className="card-border-animated"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "22px",
          padding: "4px",
          background:
            "conic-gradient(from var(--border-angle), #4ff0ff, #2ee6c1, #d6ff3d, #ffd24f, #ff4fd8, #a26bff, #4ff0ff)",
          boxShadow:
            "0 40px 80px -20px rgba(79,240,255,0.25), 0 20px 60px -10px rgba(255,79,216,0.2), 0 0 0 1px rgba(255,255,255,0.08)",
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: tilt.x === 0 ? "transform 0.6s cubic-bezier(0.2,0.8,0.2,1)" : "transform 0.05s linear",
          willChange: "transform",
          position: "relative",
        }}
      >

        {/* ── .card-inner ── */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: "calc(22px - 4px)",
            overflow: "hidden",
            background:
              "radial-gradient(ellipse 100% 60% at 50% 0%, #1a2542 0%, #0b1025 50%, #05070f 100%)",
          }}
        >

          {/* ── .card-watermark ──
              font-size scaled: 38px × 0.619 = 24px
              display:flex flex-direction:column justify-content:space-around
              span(odd)  → translateX(-10%)  color rgba(255,255,255,0.06)
              span(even) → translateX(-30%)  color rgba(46,230,193,0.07)
          ── */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-around",
              padding: "14px 0",
              fontFamily: "var(--font-archivo)",
              fontSize: "24px",
              letterSpacing: "0.1em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            {wmRows.map((_, i) => (
              <span
                key={i}
                style={{
                  display: "block",
                  transform: i % 2 === 1 ? "translateX(-30%)" : "translateX(-10%)",
                  color:
                    i % 2 === 1
                      ? "rgba(46,230,193,0.07)"
                      : "rgba(255,255,255,0.06)",
                }}
              >
                PÁDEL · PÁDEL · PÁDEL · PÁDEL · PÁDEL
              </span>
            ))}
          </div>

          {/* ── .card-photo-wrap ──
              top: 56px × 0.619 = 35px  |  height: 58%
          ── */}
          <div
            style={{
              position: "absolute",
              top: "35px",
              left: 0,
              right: 0,
              height: "58%",
              overflow: "hidden",
              zIndex: 2,
            }}
          >
            {/* .card-photo-bg */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 50% 30%, rgba(46,230,193,0.35), transparent 60%), linear-gradient(180deg, #1a2a4a 0%, #0b1224 100%)",
              }}
            />

            {/* .card-photo-rays — repeating vertical lines + radial mask */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(90deg, transparent 0, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 21px)",
                WebkitMaskImage:
                  "radial-gradient(circle at 50% 40%, black 20%, transparent 70%)",
                maskImage:
                  "radial-gradient(circle at 50% 40%, black 20%, transparent 70%)",
              }}
            />

            {/* .card-photo — bottom-anchored, centered, full height */}
            {photoUrl && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  height: "100%",
                  aspectRatio: "auto",
                  width: "100%",
                  filter: "drop-shadow(0 20px 20px rgba(0,0,0,0.5))",
                }}
              >
                <Image
                  src={photoUrl}
                  alt={`${firstName} ${lastName}`}
                  fill
                  className="object-cover object-top"
                  sizes="260px"
                  priority
                  unoptimized
                />
              </div>
            )}
          </div>

          {/* ── .card-sheen — animated sweep (styles.css) ── */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.12) 45%, rgba(79,240,255,0.18) 50%, rgba(255,79,216,0.15) 55%, transparent 70%)",
              mixBlendMode: "screen",
              pointerEvents: "none",
              animation: "sheen 6s ease-in-out infinite",
              zIndex: 5,
            }}
          />

          {/* ── .card-top ── */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "14px 14px",   /* 18px 20px scaled */
              zIndex: 10,
            }}
          >
            {/* .card-rank */}
            <div
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: COURT,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {/* .dot */}
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: COURT,
                  boxShadow: `0 0 8px ${COURT}`,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {username}
            </div>

            {/* .card-crest — padel ball (radial gradient sphere) */}
            <div
              style={{
                width: "24px",        /* 36px scaled */
                height: "24px",
                borderRadius: "50%",
                background:
                  `radial-gradient(circle at 30% 30%, ${BALL} 0%, #9fc21a 60%, #5f7b10 100%)`,
                boxShadow:
                  "0 0 12px rgba(214,255,61,0.5), inset 0 -3px 8px rgba(0,0,0,0.3)",
                position: "relative",
                flexShrink: 0,
              }}
            >
              {/* crest::after — highlight shine */}
              <div
                style={{
                  position: "absolute",
                  top: "20%",
                  left: "8%",
                  right: "8%",
                  height: "2px",
                  background: "rgba(255,255,255,0.7)",
                  borderRadius: "50%",
                  filter: "blur(0.5px)",
                  transform: "rotate(-15deg)",
                }}
              />
            </div>
          </div>

          {/* ── .card-name — bottom: 80px scaled → 50px ── */}
          <div
            style={{
              position: "absolute",
              bottom: "50px",
              left: 0,
              right: 0,
              textAlign: "center",
              zIndex: 10,
              padding: "0 14px",   /* 0 20px scaled */
            }}
          >
            {/* .card-first */}
            <p
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "13px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: INK1,
                margin: 0,
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              }}
            >
              {firstName}
            </p>

            {/* .card-last — font-size: 54px scaled → 36px */}
            <h2
              style={{
                fontFamily: "var(--font-archivo)",
                fontSize: "36px",
                lineHeight: 0.9,
                margin: "4px 0 0",
                letterSpacing: "-0.01em",
                color: INK0,
                textShadow:
                  "0 4px 14px rgba(0,0,0,0.6), 0 0 30px rgba(79,240,255,0.2)",
              }}
            >
              {lastName.toUpperCase()}
            </h2>

            {/* .card-position */}
            <p
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "11px",
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                color: COURT,
                margin: "6px 0 0",
                fontWeight: 500,
              }}
            >
              {position}
            </p>
          </div>

          {/* ── .card-bottom ── */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "14px 14px 10px",   /* 18px 20px 14px scaled */
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 10,
              background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
            }}
          >
            {/* .card-season */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--font-jetbrains)",
                fontSize: "10px",
                letterSpacing: "0.15em",
                color: INK1,
              }}
            >
              <svg viewBox="0 0 12 12" width="12" height="12" style={{ fill: BALL }}>
                <circle cx="6" cy="6" r="5" />
              </svg>
              {year}
            </div>

            {/* .card-rarity */}
            <div
              style={{
                fontFamily: "var(--font-archivo)",
                fontSize: "8px",
                letterSpacing: "0.12em",
                color: HOLO3,
                padding: "4px 10px",
                border: "1px solid rgba(255,210,79,0.4)",
                borderRadius: "4px",
                whiteSpace: "nowrap",
              }}
            >
              {rarity}
            </div>
          </div>

        </div>{/* end .card-inner */}
      </div>{/* end .card */}
    </div>
    </>
  );
}
