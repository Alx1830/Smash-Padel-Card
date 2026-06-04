"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { PlayerCard3D } from "./PlayerCard3D";
import { FollowButton } from "./FollowButton";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { getVersionLabel, getVersionEffect, getVersionColor } from "@/data/pokemon-cards-meta";
import type { InventoryMap, FeaturedCard as FeaturedCardModal, WishlistCard as WishlistCardModal, UserListing } from "@/components/CardDetailModal";
import { formatPrice, CURRENCY_SYMBOL } from "@/lib/currency";
import dynamic from "next/dynamic";
const CardDetailModal = dynamic(
  () => import("@/components/CardDetailModal").then(m => ({ default: m.CardDetailModal })),
  { ssr: false }
);

type SetStats = { unique: number; total: number; totalQty: number };
type InvRow   = { card_id: number | string; set_id: string; quantity: number; version?: string };

type FeaturedCard  = { card_id: number | string; set_id: string };
type WishlistCard  = { card_id: number | string; set_id: string };

interface PlayerData {
  username:         string;
  firstName:        string;
  lastName:         string;
  pais:             string;
  tipoPerfil:       string;
  ciudad:           string;
  pokemonFavorito:  string;
  edad:             number;
  energiaFavorita:  string;
  setFavoritoId?:   string;
  photoUrl?:        string;
  year?:            string;
  profileUserId?:   string;
  currentUserId?:   string | null;
  setStats?:        Record<string, SetStats>;
  inventoryRows?:   InvRow[];
  featuredCards?:   FeaturedCard[];
  wishlistCards?:   WishlistCard[];
}

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const BG0   = "#05070d";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";


function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "9px 0",
      borderBottom: "1px dashed rgba(255,255,255,0.08)",
      gap: "6px", flexWrap: "wrap",
    }}>
      <span style={{ fontFamily: MONO, fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", color: INK2, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ color: INK2, fontSize: "12px", flexShrink: 0 }}>/</span>
      <span style={{ fontFamily: MONO, fontSize: "14px", color: INK0, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export function ProfilePage({ player }: { player: PlayerData }) {
  const CARD_H     = 416 * 1.2;
  const COVER_H    = 460;
  const NEG_MARGIN = Math.round(CARD_H / 2);


  return (
    <div style={{ width: "100%" }}>

      {/* ══ COVER ══ */}
      <section id="cover" style={{ position: "relative", overflow: "hidden", isolation: "isolate" }}>
        <div style={{
          position: "absolute", inset: 0, zIndex: -2,
          background: `
            radial-gradient(ellipse 80% 60% at 50% 20%, rgba(46,230,193,0.28), transparent 60%),
            radial-gradient(ellipse 60% 40% at 85% 75%, rgba(255,79,216,0.22), transparent 70%),
            radial-gradient(ellipse 60% 40% at 15% 65%, rgba(79,240,255,0.18), transparent 70%),
            linear-gradient(180deg, #0a1320 0%, #060912 100%)
          `,
        }} />
        <div style={{
          position: "absolute", inset: 0, zIndex: -1,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
          animation: "gridPan 6s linear infinite",
        }} />

        {/* Desktop */}
        <div className="cover-desktop" style={{ height: `${COVER_H}px`, display: "none", position: "relative" }}>
          <div style={{ position: "absolute", top: "38%", left: "80px", transform: "translateY(-80%)", maxWidth: "520px", zIndex: 20 }}>
            <div style={{
              fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em",
              textTransform: "uppercase", color: COURT,
              display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "14px",
            }}>
              <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
              PERFIL MAESTRO POKÉMON
            </div>
            <h1 style={{
              fontFamily: DISP, fontSize: "clamp(34px, 3.8vw, 52px)",
              lineHeight: 0.92, margin: 0, letterSpacing: "-0.02em", color: INK0,
              display: "flex", alignItems: "center", gap: "16px", flexWrap: "nowrap",
            }}>
              <span style={{ whiteSpace: "nowrap" }}>
                {player.firstName}{" "}
                <em style={{
                  fontStyle: "normal",
                  background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)",
                  WebkitBackgroundClip: "text", backgroundClip: "text",
                  WebkitTextFillColor: "transparent", color: "transparent",
                }}>
                  {player.lastName}
                </em>
              </span>
              {player.profileUserId && (
                <span style={{ fontSize: "0", lineHeight: 1, flexShrink: 0 }}>
                  <FollowButton profileUserId={player.profileUserId} currentUserId={player.currentUserId ?? null} />
                </span>
              )}
            </h1>
            <p style={{
              margin: "14px 0 0", color: INK1, fontFamily: MONO, fontSize: "13px",
              letterSpacing: "0.2em", textTransform: "uppercase",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: COURT, display: "inline-block", flexShrink: 0 }} />
              {player.tipoPerfil || "Maestro Pokémon"}
            </p>
          </div>

          <div style={{
            position: "absolute", top: "38%", right: "80px", transform: "translateY(-80%)",
            textAlign: "right", fontFamily: MONO, fontSize: "15px",
            letterSpacing: "0.15em", textTransform: "uppercase", color: INK2, lineHeight: 2.2, zIndex: 20,
          }}>
            <div>Energía Favorita / <b style={{ color: INK0 }}>{player.energiaFavorita || "—"}</b></div>
            <div>País / <b style={{ color: INK0 }}>{player.pais || "—"}</b></div>
            <div>Ciudad / <b style={{ color: INK0 }}>{player.ciudad || "—"}</b></div>
          </div>

          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 48px",
            background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
            fontFamily: MONO, fontSize: "11px", letterSpacing: "0.2em",
            textTransform: "uppercase", color: INK2,
          }}>
            <span>POKÉMON CARD COLLECTOR</span>
          </div>
        </div>

        {/* Mobile */}
        <div className="cover-mobile" style={{ padding: "100px 24px 40px", display: "block" }}>
          <div style={{
            fontFamily: MONO, fontSize: "10px", letterSpacing: "0.22em",
            textTransform: "uppercase", color: COURT,
            display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
          }}>
            <span style={{ width: "18px", height: "1px", background: COURT, display: "inline-block" }} />
            PERFIL MAESTRO POKÉMON
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(36px, 10vw, 56px)", lineHeight: 0.92, margin: 0, letterSpacing: "-0.02em", color: INK0 }}>
            {player.firstName}{" "}
            <em style={{
              fontStyle: "normal",
              background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)",
              WebkitBackgroundClip: "text", backgroundClip: "text",
              WebkitTextFillColor: "transparent", color: "transparent",
            }}>
              {player.lastName}
            </em>
          </h1>
          {player.profileUserId && (
            <div style={{ marginTop: "14px" }}>
              <FollowButton profileUserId={player.profileUserId} currentUserId={player.currentUserId ?? null} />
            </div>
          )}
          <p style={{
            margin: "12px 0 0", color: INK1, fontFamily: MONO, fontSize: "12px",
            letterSpacing: "0.2em", textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: COURT, display: "inline-block", flexShrink: 0 }} />
            {player.tipoPerfil || "Maestro Pokémon"}
          </p>
          <div style={{
            marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "8px 24px",
            fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em",
            textTransform: "uppercase", color: INK2,
          }}>
            <span>Energía Favorita / <b style={{ color: INK0 }}>{player.energiaFavorita || "—"}</b></span>
            <span>País / <b style={{ color: INK0 }}>{player.pais || "—"}</b></span>
            <span>Ciudad / <b style={{ color: INK0 }}>{player.ciudad || "—"}</b></span>
          </div>
        </div>

        <style>{`
          @media (min-width: 768px) {
            .cover-desktop { display: block !important; }
            .cover-mobile  { display: none  !important; }
          }
        `}</style>
      </section>

      {/* ══ PROFILE DATA ══ */}
      <section id="profile" style={{ position: "relative", background: BG0 }}>

        {/* Desktop */}
        <div className="profile-desktop" style={{ display: "none", padding: "0px 80px 30px" }}>
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "64px",
            maxWidth: "1280px", margin: "0 auto",
            marginTop: `-${NEG_MARGIN}px`,
          }}>
            <div style={{ flexShrink: 0, paddingTop: "24px", position: "relative", zIndex: 10, width: "312px", height: "499px" }}>
              <div style={{ transform: "scale(1.2)", transformOrigin: "top left" }}>
                <PlayerCard3D
                  username={player.username}
                  firstName={player.firstName}
                  lastName={player.lastName}
                  position={player.tipoPerfil}
                  category={player.pais}
                  energiaFavorita={player.energiaFavorita}
                  setFavoritoId={player.setFavoritoId}
                  photoUrl={player.photoUrl}
                />
              </div>
            </div>

            <div style={{ flex: 1, paddingTop: "20px" }}>
              <div style={{ marginBottom: "8px" }}>
                <h3 style={{ fontFamily: DISP, fontSize: "28px", letterSpacing: "-0.01em", margin: "0 0 24px", color: INK0 }}>
                  Perfil Maestro Pokémon
                </h3>
                <Row label="Tipo de Perfil"     value={player.tipoPerfil || "—"} />
                <Row label="Edad"               value={player.edad ? `${player.edad} años` : "—"} />
                <Row label="Pokémon Favorito"   value={player.pokemonFavorito || "—"} />
                <Row label="Energía Favorita"   value={player.energiaFavorita || "—"} />
              </div>
            </div>

            {/* Showcase — right column, siempre visible */}
            <div style={{ flex: "0 0 auto", width: "clamp(240px, 26%, 340px)", paddingTop: "20px" }}>
              <Showcase featuredCards={player.featuredCards ?? []} inventoryRows={player.inventoryRows ?? []} />
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="profile-mobile" style={{ display: "block", padding: "40px 20px 64px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "48px" }}>
            <PlayerCard3D
              username={player.username}
              firstName={player.firstName}
              lastName={player.lastName}
              position={player.tipoPerfil}
              category={player.pais}
              energiaFavorita={player.energiaFavorita}
              photoUrl={player.photoUrl}
              setFavoritoId={player.setFavoritoId}
            />
          </div>
          <div style={{ width: "100%", height: "1px", marginBottom: "40px", background: "rgba(255,255,255,0.06)" }} />
          <h3 style={{ fontFamily: DISP, fontSize: "22px", letterSpacing: "-0.01em", margin: "0 0 16px", color: INK0 }}>
            Perfil Maestro Pokémon
          </h3>
          <Row label="Pokémon Favorito"  value={player.pokemonFavorito || "—"} />
          <Row label="Edad"               value={player.edad ? `${player.edad} años` : "—"} />
          <Row label="Energía Favorita"   value={player.energiaFavorita || "—"} />
          <Row label="Tipo de Perfil"     value={player.tipoPerfil || "—"} />
          <div style={{ marginTop: "40px" }}>
            <Showcase featuredCards={player.featuredCards ?? []} inventoryRows={player.inventoryRows ?? []} />
          </div>
        </div>

        <style>{`
          @media (min-width: 768px) {
            .profile-desktop { display: block !important; }
            .profile-mobile  { display: none  !important; }
          }
        `}</style>
      </section>

      {/* ══ SHOWCASE + COLECCIÓN ══ */}
      {(player.setStats && Object.keys(player.setStats).length > 0) || (player.wishlistCards && player.wishlistCards.length > 0) ? (
        <CollectionSection
          setStats={player.setStats ?? {}}
          inventoryRows={player.inventoryRows ?? []}
          wishlistCards={player.wishlistCards ?? []}
          featuredCards={player.featuredCards ?? []}
          profileUserId={player.profileUserId}
          username={player.username}
        />
      ) : null}

    </div>
  );
}

/* ── Shared constants ───────────────────────────────────────── */
const ALL_SETS   = POKEMON_SERIES.flatMap(s => s.sets);
const COURT_C    = "#2ee6c1";
const INK0_C     = "#f5f7fb";
const INK2_C     = "#7a8298";
const BG0_C      = "#05070d";
const MONO_C     = "var(--font-jetbrains)";
const DISP_C     = "var(--font-archivo)";

const VERSION_COLOR_MAP: Record<string, string> = {
  N:  "#7a8298",
  RH: "#2ee6c1",
  H:  "#ffd24f",
};

const VERSION_FULL_LABEL: Record<string, string> = {
  N:  "Normal",
  RH: "Reverse Holo",
  H:  "Holofoil",
};

const VERSION_GLOW: Record<string, string> = {
  N:  "none",
  RH: "0 0 16px rgba(46,230,193,0.35)",
  H:  "0 0 20px rgba(255,210,79,0.45)",
};

/* ── Mini card for expand grid ──────────────────────────────── */
function MiniCard({ cardId, setId, quantity }: { cardId: number | string; setId: string; quantity: number }) {
  const cards = SET_CARDS[setId];
  const card  = cards?.find(c => c.id === cardId);
  if (!card) return null;
  const label      = getVersionLabel(card.version);
  const effect     = getVersionEffect(card.version);
  const labelColor = getVersionColor(card.version);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <div style={{ position: "relative", width: "160px", height: "224px", borderRadius: "8px", overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
        <img src={card.image} alt={card.name} style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />
        <div style={{
          position: "absolute", bottom: "7px", right: "7px",
          fontFamily: MONO_C, fontSize: "9px", letterSpacing: "0.12em",
          color: labelColor, border: `1px solid ${labelColor}80`,
          borderRadius: "4px", padding: "2px 6px",
          background: "rgba(5,7,13,0.8)", backdropFilter: "blur(4px)",
          pointerEvents: "none",
        }}>{label}</div>
      </div>
      <span style={{ fontFamily: MONO_C, fontSize: "9px", letterSpacing: "0.06em", color: INK2_C, textAlign: "center" }}>
        #{String(card.card_number).padStart(3, "0")} {card.name}
      </span>
      <span style={{ fontFamily: MONO_C, fontSize: "10px", color: COURT_C }}>×{quantity}</span>
    </div>
  );
}

/* ── Showcase card 3D ───────────────────────────────────────── */
function ShowcaseCard({ cardId, setId, quantity, autoAnimate = false }: {
  cardId: number | string; setId: string; quantity: number; autoAnimate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt,  setTilt]  = useState({ x: 0, y: 0 });
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  // Continuous shimmer + tilt animation for background cards
  useEffect(() => {
    if (!autoAnimate) return;
    let frame: number;
    let t = 0;
    const loop = () => {
      t += 0.016;
      setMouse({ x: 0.5 + Math.cos(t) * 0.42, y: 0.5 + Math.sin(t * 0.65) * 0.38 });
      setTilt({ x: Math.sin(t * 0.7) * 7, y: Math.cos(t) * 7 });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [autoAnimate]);

  const cards = SET_CARDS[setId];
  const card  = cards?.find(c => c.id === cardId);
  if (!card) return null;

  const label      = getVersionLabel(card.version);
  const effect     = getVersionEffect(card.version);
  const isH        = effect === "holofoil";
  const isGold     = effect === "goldBorder";
  const isRH       = effect === "reverseHolofoil" || effect === "metal";
  const labelColor = getVersionColor(card.version);
  const fullLabel  = label;
  const glow       = isH ? "0 0 20px rgba(255,210,79,0.45)" : isGold ? "0 0 20px rgba(255,200,50,0.5)" : isRH ? "0 0 16px rgba(46,230,193,0.35)" : "none";
  const mx = mouse.x * 100;
  const my = mouse.y * 100;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setMouse({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
    setTilt({ x: (-((e.clientY - r.top) / r.height - 0.5)) * 24, y: (((e.clientX - r.left) / r.width - 0.5)) * 24 });
  };
  const onLeave = () => { setTilt({ x: 0, y: 0 }); setMouse({ x: 0.5, y: 0.5 }); };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", width: "100%" }}>
      <div
        ref={ref}
        style={{ perspective: "800px", cursor: "pointer", width: "100%" }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <div style={{
          width: "100%", aspectRatio: "5 / 7",
          borderRadius: "14px", overflow: "hidden", position: "relative",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: tilt.x === 0 ? "transform 0.6s cubic-bezier(0.2,0.8,0.2,1)" : "transform 0.05s linear",
          willChange: "transform",
          boxShadow: `0 20px 60px rgba(0,0,0,0.75), ${glow}`,
          border: `1px solid ${labelColor}30`,
        }}>
          <img src={card.image} alt={card.name} style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />

          {isRH && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
              background: `radial-gradient(ellipse 80% 60% at ${mx}% ${my}%, rgba(220,220,240,0.55) 0%, rgba(180,180,210,0.25) 30%, transparent 60%),
                linear-gradient(${105 + tilt.y * 2}deg, transparent 20%, rgba(200,200,230,0.18) 35%, rgba(255,255,255,0.28) 45%, rgba(200,200,230,0.18) 55%, transparent 70%)`,
            }} />
          )}
          {(isH || isGold) && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "color-dodge",
              background: isGold
                ? `radial-gradient(ellipse 90% 70% at ${mx}% ${my}%, rgba(255,220,80,0.6) 0%, rgba(255,180,30,0.45) 20%, rgba(220,140,0,0.35) 45%, rgba(255,200,80,0.2) 65%, transparent 90%)`
                : `radial-gradient(ellipse 90% 70% at ${mx}% ${my}%, rgba(255,100,100,0.5) 0%, rgba(255,200,50,0.4) 15%, rgba(80,255,120,0.4) 30%, rgba(50,180,255,0.4) 45%, rgba(180,80,255,0.4) 60%, rgba(255,80,200,0.35) 75%, transparent 90%)`,
            }} />
          )}
          {(isH || isGold) && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
              background: isGold
                ? `linear-gradient(${120 + tilt.y * 3}deg, transparent 0%, rgba(255,200,50,0.2) 25%, rgba(255,160,0,0.25) 45%, rgba(255,220,80,0.2) 65%, transparent 85%)`
                : `linear-gradient(${120 + tilt.y * 3}deg, transparent 0%, rgba(255,100,150,0.15) 20%, rgba(80,200,255,0.2) 35%, rgba(200,80,255,0.15) 50%, rgba(255,200,80,0.15) 65%, transparent 80%)`,
            }} />
          )}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
            background: `linear-gradient(${110 + tilt.y}deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)`,
          }} />

          <div style={{
            position: "absolute", bottom: "12px", right: "12px",
            fontFamily: MONO_C, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase",
            color: labelColor, border: `1px solid ${labelColor}80`,
            borderRadius: "5px", padding: "4px 10px",
            background: "rgba(5,7,13,0.85)", backdropFilter: "blur(6px)",
          }}>{fullLabel}</div>

          {quantity > 1 && (
            <div style={{
              position: "absolute", top: "12px", right: "12px",
              fontFamily: MONO_C, fontSize: "12px", letterSpacing: "0.1em",
              color: COURT_C, border: `1px solid ${COURT_C}60`,
              borderRadius: "5px", padding: "4px 10px",
              background: "rgba(5,7,13,0.85)", backdropFilter: "blur(6px)",
            }}>×{quantity}</div>
          )}
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: MONO_C, fontSize: "14px", letterSpacing: "0.06em", color: INK0_C, marginBottom: "6px" }}>{card.name}</div>
        <div style={{ fontFamily: MONO_C, fontSize: "11px", letterSpacing: "0.06em", color: INK2_C }}>#{String(card.card_number).padStart(3, "0")}</div>
      </div>
    </div>
  );
}

/* Candidatos estables para placeholder (sin random — compatible con SSR) */
const PLACEHOLDER_CANDIDATES = (() => {
  const candidates: { card_id: number | string; set_id: string }[] = [];
  for (const [setId, cards] of Object.entries(SET_CARDS)) {
    const valid = cards.filter(c => c.id !== 0);
    if (valid.length >= 3) {
      candidates.push(
        { card_id: valid[0].id, set_id: setId },
        { card_id: valid[Math.floor(valid.length / 2)].id, set_id: setId },
        { card_id: valid[valid.length - 1].id, set_id: setId },
      );
      if (candidates.length >= 9) break;
    }
  }
  return candidates;
})();
const PLACEHOLDER_STABLE = PLACEHOLDER_CANDIDATES.slice(0, 3);

/* ── Showcase slider ────────────────────────────────────────── */
function Showcase({ featuredCards, inventoryRows }: { featuredCards: FeaturedCard[]; inventoryRows: InvRow[] }) {
  const [idx, setIdx] = useState(0);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_STABLE);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (PLACEHOLDER_CANDIDATES.length >= 3) {
      const shuffled = [...PLACEHOLDER_CANDIDATES].sort(() => Math.random() - 0.5);
      setPlaceholder(shuffled.slice(0, 3));
    }
    const ids = [
      ...featuredCards.map(f => f.set_id),
      ...PLACEHOLDER_STABLE.map(p => p.set_id as string),
    ];
    loadManySets([...new Set(ids)]).then(() => forceUpdate(n => n + 1));
  }, [featuredCards]);

  const owned = featuredCards.slice(0, 10).map(f => {
    const row = inventoryRows.find(r => r.card_id === f.card_id && r.set_id === f.set_id);
    return { card_id: f.card_id, set_id: f.set_id, quantity: row?.quantity ?? 1 };
  }).filter(f => SET_CARDS[f.set_id]?.some(c => c.id === f.card_id));

  const isEmpty = owned.length < 3;

  const displayCards = isEmpty ? placeholder : owned;
  const prevIdx = (idx - 1 + displayCards.length) % displayCards.length;
  const nextIdx = (idx + 1) % displayCards.length;

  useEffect(() => {
    if (isEmpty) return;
    const t = setInterval(() => setIdx(i => (i + 1) % displayCards.length), 2000);
    return () => clearInterval(t);
  }, [isEmpty, displayCards.length]);

  if (displayCards.length < 3) return null;

  return (
    <div className="showcase-wrap" style={{ marginBottom: "64px" }}>
      <style>{`
        @keyframes sc-in {
          from { opacity: 0; transform: scale(0.88) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .sc-center { animation: sc-in 0.45s cubic-bezier(0.2,0.8,0.2,1) forwards; }
      `}</style>

      <div style={{
        fontFamily: MONO_C, fontSize: "11px", letterSpacing: "0.22em",
        textTransform: "uppercase", color: COURT_C,
        display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
      }}>
        <span style={{ width: "22px", height: "1px", background: COURT_C, display: "inline-block" }} />
        Mis cartas destacadas
      </div>

      {/* Fan de cartas — si está vacío muestra placeholder gris con overlay */}
      <div style={{ position: "relative", padding: "0 10%", paddingBottom: "6%" }}>

        {/* Izquierda */}
        <div style={{
          position: "absolute", top: "5%", left: "0", width: "78%",
          transform: "rotateZ(-9deg) rotateY(-8deg)",
          transformOrigin: "bottom center",
          opacity: 0.45, filter: isEmpty ? "grayscale(1) brightness(0.35)" : "brightness(0.5)",
          zIndex: 1, transition: "opacity 0.3s ease", pointerEvents: "none",
        }}>
          <ShowcaseCard cardId={displayCards[prevIdx].card_id} setId={displayCards[prevIdx].set_id} quantity={1} autoAnimate={!isEmpty} />
        </div>

        {/* Derecha */}
        <div style={{
          position: "absolute", top: "5%", right: "0", width: "78%",
          transform: "rotateZ(9deg) rotateY(8deg)",
          transformOrigin: "bottom center",
          opacity: 0.45, filter: isEmpty ? "grayscale(1) brightness(0.35)" : "brightness(0.5)",
          zIndex: 2, transition: "opacity 0.3s ease", pointerEvents: "none",
        }}>
          <ShowcaseCard cardId={displayCards[nextIdx].card_id} setId={displayCards[nextIdx].set_id} quantity={1} autoAnimate={!isEmpty} />
        </div>

        {/* Centro */}
        <div key={isEmpty ? "empty" : idx} className="sc-center" style={{
          position: "relative", zIndex: 10,
          filter: isEmpty ? "grayscale(1) brightness(0.35)" : "none",
          pointerEvents: "none",
        }}>
          <ShowcaseCard cardId={displayCards[isEmpty ? 1 : idx].card_id} setId={displayCards[isEmpty ? 1 : idx].set_id} quantity={1} />
        </div>

        {/* Overlay mensaje cuando no hay destacadas */}
        {isEmpty && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 20,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "10px",
            background: "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(5,7,13,0.82) 30%, transparent 100%)",
          }}>
            <span style={{
              fontFamily: MONO_C, fontSize: "10px", letterSpacing: "0.22em",
              textTransform: "uppercase", color: COURT_C,
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <span style={{ width: "14px", height: "1px", background: COURT_C, display: "inline-block" }} />
              Sin cartas destacadas
            </span>
            <p style={{
              fontFamily: MONO_C, fontSize: "11px", letterSpacing: "0.08em",
              color: INK0_C, textAlign: "center", lineHeight: 1.6,
              margin: 0, maxWidth: "200px",
            }}>
              Ve a tu inventario, haz clic en una carta y presiona{" "}
              <span style={{ color: COURT_C, fontWeight: 600 }}>Destacar</span>
              {" "}— mínimo 3 cartas
            </p>
          </div>
        )}
      </div>

      {/* Dots — solo cuando hay cartas reales */}
      {!isEmpty && (
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "16px" }}>
          {owned.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{
              width: i === idx ? "20px" : "6px", height: "6px",
              borderRadius: "3px", border: "none", cursor: "pointer",
              background: i === idx ? COURT_C : "rgba(255,255,255,0.2)",
              transition: "all 0.2s", padding: 0,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Wishlist Slider ────────────────────────────────────────── */
function WishlistSlider({
  wishlistCards, inventoryRows, featuredCards, profileUserId, username,
}: {
  wishlistCards:  WishlistCard[];
  inventoryRows:  InvRow[];
  featuredCards:  FeaturedCard[];
  profileUserId?: string;
  username?:      string;
}) {
  const [offset,    setOffset]    = useState(0);
  const [animated,  setAnimated]  = useState(true);
  const [modalCard, setModalCard] = useState<{ card_id: number | string; set_id: string } | null>(null);
  const [featLocal, setFeatLocal] = useState<FeaturedCardModal[]>(featuredCards as FeaturedCardModal[]);
  const [wishLocal, setWishLocal] = useState<WishlistCardModal[]>(wishlistCards as WishlistCardModal[]);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const ids = [...new Set(wishlistCards.map(w => w.set_id))];
    loadManySets(ids).then(() => forceUpdate(n => n + 1));
  }, [wishlistCards]);

  // Resolver cartas válidas (que existan en SET_CARDS)
  const resolved = wishlistCards.map(w => {
    const cards = SET_CARDS[w.set_id];
    const card  = cards?.find(c => c.id === w.card_id);
    const set   = ALL_SETS.find(s => s.id === w.set_id);
    return card && set ? { card, set, card_id: w.card_id, set_id: w.set_id } : null;
  }).filter(Boolean) as { card: NonNullable<ReturnType<typeof SET_CARDS[string]["find"]>>; set: { id: string; name: string }; card_id: number | string; set_id: string }[];

  // Inventory map para el modal
  const inventoryMap: InventoryMap = {};
  inventoryRows.forEach(r => { inventoryMap[r.card_id] = r.quantity; });

  // Loop infinito: duplicamos el array para simular carrusel continuo
  const looped = resolved.length > 0 ? [...resolved, ...resolved, ...resolved] : [];

  useEffect(() => {
    if (resolved.length < 2) return;
    const t = setInterval(() => {
      setAnimated(true);
      setOffset(prev => {
        const next = prev + 1;
        // Cuando llegamos al final del primer bloque, reseteamos sin animación
        if (next >= resolved.length) {
          setTimeout(() => {
            setAnimated(false);
            setOffset(0);
          }, 400); // después de que termine la transición
        }
        return next;
      });
    }, 2000);
    return () => clearInterval(t);
  }, [resolved.length]);

  if (resolved.length === 0) return null;

  const VISIBLE  = 4;
  const CARD_GAP = 10; // px

  return (
    <div style={{ marginBottom: "16px", minWidth: 0, overflow: "hidden" }}>
      <style>{`
        @keyframes wl-fade { from { opacity:0; } to { opacity:1; } }
        .wl-track { transition: transform 0.4s cubic-bezier(0.4,0,0.2,1); }
        .wl-track.no-anim { transition: none !important; }
      `}</style>

      {/* Header */}
      <div style={{
        fontFamily: MONO_C, fontSize: "11px", letterSpacing: "0.22em",
        textTransform: "uppercase", color: "#ffd24f",
        display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
      }}>
        <span style={{ width: "22px", height: "1px", background: "#ffd24f", display: "inline-block" }} />
        Cartas que necesito
      </div>

      {/* Carrusel */}
      <div style={{ padding: "0 0%" }}>
      <div style={{ overflow: "hidden", borderRadius: "8px" }}>
        <div
          className={`wl-track${animated ? "" : " no-anim"}`}
          style={{
            display: "flex",
            gap: `${CARD_GAP}px`,
            transform: `translateX(calc(-${offset} * (100% / ${VISIBLE} + ${CARD_GAP / VISIBLE}px)))`,
          }}
        >
          {looped.map((item, i) => (
            <div
              key={i}
              onClick={() => setModalCard({ card_id: item.card_id, set_id: item.set_id })}
              style={{
                flexShrink: 0,
                width: `calc(100% / ${VISIBLE} - ${CARD_GAP * (VISIBLE - 1) / VISIBLE}px)`,
                cursor: "pointer",
              }}
            >
              {/* Imagen */}
              <div
                style={{
                  position: "relative", width: "100%", aspectRatio: "5/7",
                  borderRadius: "7px", overflow: "hidden",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,210,79,0.12)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "scale(1.04)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,210,79,0.35)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,210,79,0.12)";
                }}
              >
                <img src={item.card.image} alt={item.card.name} style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />
              </div>

              {/* Info */}
              <div style={{ marginTop: "6px", textAlign: "center" }}>
                <div style={{
                  fontFamily: MONO_C, fontSize: "9px", color: INK0_C,
                  fontWeight: 600, marginBottom: "2px",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  #{String(item.card.card_number).padStart(3, "0")} {item.card.name}
                </div>
                <div style={{
                  fontFamily: MONO_C, fontSize: "8px", color: INK2_C, letterSpacing: "0.04em",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {item.set.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Ver todas */}
      {username && (
        <div style={{ marginTop: "12px", textAlign: "center" }}>
          <Link href={`/${username}/wishlist`} style={{
            display: "inline-block",
            fontFamily: MONO_C, fontSize: "9px", letterSpacing: "0.14em",
            textTransform: "uppercase", color: "#ffd24f",
            background: "rgba(255,210,79,0.08)", border: "1px solid rgba(255,210,79,0.3)",
            borderRadius: "6px", padding: "6px 16px",
            textDecoration: "none",
          }}>
            Ver todas →
          </Link>
        </div>
      )}

      {/* Modal */}
      {modalCard && (() => {
        const cards = SET_CARDS[modalCard.set_id];
        const card  = cards?.find(c => c.id === modalCard.card_id);
        if (!card) return null;
        return (
          <CardDetailModal
            card={card}
            setId={modalCard.set_id}
            userId={profileUserId}
            inventory={inventoryMap}
            onInventoryChange={() => {}}
            featuredCards={featLocal}
            onFeaturedChange={setFeatLocal}
            wishlistCards={wishLocal}
            onWishlistChange={setWishLocal}
            userListings={[] as UserListing[]}
            onListingsChange={() => {}}
            onClose={() => setModalCard(null)}
          />
        );
      })()}
    </div>
  );
}

/* ── Market Listings Slider ─────────────────────────────────── */
function MarketListingsSlider({ profileUserId, username }: { profileUserId?: string; username?: string }) {
  const [listings, setListings] = useState<{ id: string; card_id: number | string; set_id: string; price_cop: number; currency: string; version: string }[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [offset,   setOffset]   = useState(0);
  const [animated, setAnimated] = useState(true);

  useEffect(() => {
    if (!profileUserId) return;
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("market_listings")
        .select("id, card_id, set_id, price_cop, currency, version")
        .eq("user_id", profileUserId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);
      const rows = data ?? [];
      await loadManySets([...new Set(rows.map((l: any) => l.set_id))]);
      setListings(rows);
      setLoaded(true);
    })();
  }, [profileUserId]);

  const resolved = listings.map(l => {
    const cards = SET_CARDS[l.set_id];
    const card  = cards?.find(c => c.card_number === l.card_id && c.version === l.version);
    const set   = ALL_SETS.find(s => s.id === l.set_id);
    return card && set ? { card, set, listing: l } : null;
  }).filter(Boolean) as { card: NonNullable<ReturnType<typeof SET_CARDS[string]["find"]>>; set: { id: string; name: string }; listing: typeof listings[0] }[];

  const looped = resolved.length > 0 ? [...resolved, ...resolved, ...resolved] : [];

  useEffect(() => {
    if (resolved.length < 2) return;
    const t = setInterval(() => {
      setAnimated(true);
      setOffset(prev => {
        const next = prev + 1;
        if (next >= resolved.length) {
          setTimeout(() => { setAnimated(false); setOffset(0); }, 400);
        }
        return next;
      });
    }, 2000);
    return () => clearInterval(t);
  }, [resolved.length]);


  const VISIBLE  = 4;
  const CARD_GAP = 10;
  const GREEN    = COURT_C; // "#2ee6c1"

  return (
    <div style={{ marginBottom: "16px", minWidth: 0, overflow: "hidden", marginTop: "40px" }}>
      {/* Header */}
      <div style={{
        fontFamily: MONO_C, fontSize: "11px", letterSpacing: "0.22em",
        textTransform: "uppercase", color: GREEN,
        display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
      }}>
        <span style={{ width: "22px", height: "1px", background: GREEN, display: "inline-block" }} />
        Cartas en venta
      </div>

      {/* Slider or empty state */}
      {!loaded ? null : resolved.length === 0 ? (
        <div style={{ border: "1px dashed rgba(46,230,193,0.2)", borderRadius: "12px", padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "28px", marginBottom: "12px" }}>🏷️</div>
          <p style={{ fontFamily: MONO_C, fontSize: "12px", color: GREEN, fontWeight: 600, marginBottom: "6px", letterSpacing: "0.05em" }}>
            Sin cartas en venta
          </p>
          <p style={{ fontFamily: MONO_C, fontSize: "11px", color: INK2_C, lineHeight: 1.6 }}>
            Abre cualquier carta en tu inventario<br />y presiona{" "}
            <span style={{ color: GREEN }}>Vender</span> para publicarla aquí.
          </p>
        </div>
      ) : (
        <div style={{ padding: "0 0%" }}>
          <div style={{ overflow: "hidden", borderRadius: "8px" }}>
            <div
              className={`mls-track${animated ? "" : " no-anim"}`}
              style={{
                display: "flex",
                gap: `${CARD_GAP}px`,
                transform: `translateX(calc(-${offset} * (100% / ${VISIBLE} + ${CARD_GAP / VISIBLE}px)))`,
              }}
            >
              <style>{`.mls-track { transition: transform 0.4s cubic-bezier(0.4,0,0.2,1); } .mls-track.no-anim { transition: none !important; }`}</style>
              {looped.map(({ card, listing }, i) => {
                const color = getVersionColor(listing.version);
                const label = getVersionLabel(listing.version);
                return (
                  <div
                    key={i}
                    style={{
                      flexShrink: 0,
                      width: `calc(100% / ${VISIBLE} - ${CARD_GAP * (VISIBLE - 1) / VISIBLE}px)`,
                      cursor: "default",
                    }}
                  >
                    <div
                      style={{
                        position: "relative", width: "100%", aspectRatio: "5/7",
                        borderRadius: "7px", overflow: "hidden",
                        boxShadow: `0 4px 14px rgba(0,0,0,0.6), 0 0 0 1px ${GREEN}22`,
                        transition: "transform 0.2s, box-shadow 0.2s",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.transform = "scale(1.04)";
                        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 20px rgba(0,0,0,0.8), 0 0 0 1px ${GREEN}55`;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 14px rgba(0,0,0,0.6), 0 0 0 1px ${GREEN}22`;
                      }}
                    >
                      <img src={card.image} alt={card.name} style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />
                      <div style={{ position: "absolute", bottom: "6px", right: "6px", fontFamily: MONO_C, fontSize: "8px", letterSpacing: "0.1em", color, border: `1px solid ${color}55`, borderRadius: "4px", padding: "2px 5px", background: "rgba(5,7,13,0.85)" }}>{label}</div>
                    </div>
                    <div style={{ marginTop: "6px", textAlign: "center" }}>
                      <div style={{ fontFamily: MONO_C, fontSize: "9px", color: INK0_C, fontWeight: 600, marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        #{String(card.card_number).padStart(3, "0")} {card.name}
                      </div>
                      <div style={{ fontFamily: MONO_C, fontSize: "9px", color: GREEN, fontWeight: 700 }}>{CURRENCY_SYMBOL[listing.currency] ?? "$"}{formatPrice(listing.price_cop, listing.currency)} {listing.currency}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Botón ver todas */}
      {username && (
        <div style={{ marginTop: "12px", textAlign: "center" }}>
          <Link href={`/${username}/market`} style={{
            display: "inline-block",
            fontFamily: MONO_C, fontSize: "9px", letterSpacing: "0.14em",
            textTransform: "uppercase", color: GREEN,
            background: `${GREEN}10`, border: `1px solid ${GREEN}40`,
            borderRadius: "6px", padding: "6px 16px",
            textDecoration: "none",
          }}>
            Ver todas →
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── Collection stats section ───────────────────────────────── */
function CollectionSection({
  setStats, inventoryRows, wishlistCards, featuredCards, profileUserId, username,
}: {
  setStats:       Record<string, SetStats>;
  inventoryRows:  InvRow[];
  wishlistCards:  WishlistCard[];
  featuredCards:  FeaturedCard[];
  profileUserId?: string;
  username?:      string;
}) {
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [loadedSets, setLoadedSets] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"inventario" | "restantes">("inventario");

  // Load card data when a set is expanded
  useEffect(() => {
    if (!expandedSetId || loadedSets.has(expandedSetId)) return;
    import("@/data/pokemon-cards").then(({ loadSetCards }) => {
      loadSetCards(expandedSetId).then(() => {
        setLoadedSets(prev => new Set([...prev, expandedSetId]));
      });
    });
  }, [expandedSetId, loadedSets]);

  // Reset tab when changing set
  useEffect(() => { setActiveTab("inventario"); }, [expandedSetId]);

  const entries = Object.entries(setStats).map(([setId, stats]) => {
    const set = ALL_SETS.find(s => s.id === setId);
    return set ? { set, stats } : null;
  }).filter(Boolean)
    .sort((a, b) => b!.stats.unique - a!.stats.unique) as { set: { id: string; name: string; logo: string }; stats: SetStats }[];

  // Cards owned per set for expand view
  const ownedBySet = (setId: string) => {
    const cards = SET_CARDS[setId] ?? [];
    return inventoryRows
      .filter(r => r.set_id === setId && r.quantity > 0)
      .map(r => ({
        card: cards.find(c => String(c.id) === String(r.card_id))
           ?? cards.find(c => String(c.card_number) === String(r.card_id)),
        qty: r.quantity,
      }))
      .filter(x => x.card) as { card: NonNullable<typeof cards[0]>; qty: number }[];
  };

  return (
    <section style={{ background: BG0_C, padding: "0 0 80px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>

      <div className="coll-outer" style={{ padding: "64px 14% 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px", alignItems: "flex-start" }}>

        {/* ── Columna izquierda: Wishlist + Market ── */}
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          {wishlistCards.length > 0 ? (
            <WishlistSlider
              wishlistCards={wishlistCards}
              inventoryRows={inventoryRows}
              featuredCards={featuredCards}
              profileUserId={profileUserId}
              username={username}
            />
          ) : (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontFamily: MONO_C, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: "#ffd24f", display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <span style={{ width: "22px", height: "1px", background: "#ffd24f", display: "inline-block" }} />
                Cartas que necesito
              </div>
              <div style={{ border: "1px dashed rgba(255,210,79,0.2)", borderRadius: "12px", padding: "32px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", marginBottom: "12px" }}>🔍</div>
                <p style={{ fontFamily: MONO_C, fontSize: "12px", color: "#ffd24f", fontWeight: 600, marginBottom: "6px", letterSpacing: "0.05em" }}>
                  ¿Estás buscando una carta?
                </p>
                <p style={{ fontFamily: MONO_C, fontSize: "11px", color: INK2_C, lineHeight: 1.6 }}>
                  Abre cualquier set en tu inventario,<br />haz clic en una carta y presiona{" "}
                  <span style={{ color: "#ffd24f" }}>Buscando</span> para agregarla aquí.
                </p>
              </div>
            </div>
          )}
          <MarketListingsSlider profileUserId={profileUserId} username={username} />
        </div>

        {/* ── Colección ── */}
        <div>
          <div style={{
            fontFamily: MONO_C, fontSize: "11px", letterSpacing: "0.22em",
            textTransform: "uppercase", color: COURT_C,
            display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
          }}>
            <span style={{ width: "22px", height: "1px", background: COURT_C, display: "inline-block" }} />
            Colección
          </div>
          <h2 style={{ fontFamily: DISP_C, fontSize: "clamp(24px, 2.5vw, 36px)", letterSpacing: "-0.02em", margin: "0 0 32px", color: INK0_C }}>
            Pokémon Master Set's
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {entries.length === 0 && (
              <div style={{ border: "1px dashed rgba(46,230,193,0.2)", borderRadius: "12px", padding: "32px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", marginBottom: "12px" }}>📦</div>
                <p style={{ fontFamily: MONO_C, fontSize: "12px", color: COURT_C, fontWeight: 600, marginBottom: "6px", letterSpacing: "0.05em" }}>
                  Colección vacía
                </p>
                <p style={{ fontFamily: MONO_C, fontSize: "11px", color: INK2_C, lineHeight: 1.6 }}>
                  Ve a <span style={{ color: COURT_C }}>Inventario</span>, abre un set y usa el{" "}
                  <span style={{ color: COURT_C }}>+</span> en cada carta que tengas para registrarla aquí.
                </p>
              </div>
            )}
            {entries.map(({ set, stats }) => {
              const pct      = Math.round((stats.unique / stats.total) * 100);
              const isOpen   = expandedSetId === set.id;
              const ownedCards = isOpen ? ownedBySet(set.id) : [];

              return (
                <div key={set.id}>
                  {/* Progress card — clickable */}
                  <button
                    onClick={() => setExpandedSetId(prev => prev === set.id ? null : set.id)}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "20px 24px", background: isOpen ? "rgba(46,230,193,0.06)" : "rgba(255,255,255,0.02)",
                      borderRadius: isOpen ? "14px 14px 0 0" : "14px",
                      border: `1px solid ${isOpen ? COURT_C + "44" : "rgba(255,255,255,0.07)"}`,
                      borderBottom: isOpen ? "none" : undefined,
                      cursor: "pointer", display: "block", transition: "background 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "12px", flexWrap: "wrap" }}>
                      <div style={{ position: "relative", width: "100px", height: "38px", flexShrink: 0 }}>
                        <Image src={set.logo} alt={set.name} fill style={{ objectFit: "contain", objectPosition: "left center" }} />
                      </div>
                      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: "24px", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontFamily: MONO_C, fontSize: "11px", letterSpacing: "0.1em", color: COURT_C }}>
                          {stats.unique}/{stats.total} únicas
                        </span>
                        <span style={{ fontFamily: MONO_C, fontSize: "11px", letterSpacing: "0.1em", color: INK2_C }}>
                          {stats.totalQty} total
                        </span>
                        <span style={{ fontFamily: MONO_C, fontSize: "11px", letterSpacing: "0.1em", color: INK0_C, minWidth: "36px", textAlign: "right" }}>
                          {pct}%
                        </span>
                        <span style={{ fontFamily: MONO_C, fontSize: "14px", color: INK2_C, marginLeft: "4px" }}>
                          {isOpen ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${pct}%`,
                        background: `linear-gradient(90deg, ${COURT_C}, #4ff0ff)`,
                        borderRadius: "2px",
                      }} />
                    </div>
                  </button>

                  {/* Expanded card grid */}
                  {isOpen && (() => {
                    const allSetCards = SET_CARDS[set.id] ?? [];
                    // Build the set of owned card IDs using the same matching as ownedBySet
                    const ownedCardIds = new Set<string>();
                    inventoryRows
                      .filter(r => r.set_id === set.id && r.quantity > 0)
                      .forEach(r => {
                        const exact = allSetCards.find(c => String(c.id) === String(r.card_id));
                        if (exact) {
                          ownedCardIds.add(String(exact.id));
                        } else {
                          // legacy: card_id stored as number only — mark all versions of that number
                          allSetCards
                            .filter(c => String(c.card_number) === String(r.card_id))
                            .forEach(c => ownedCardIds.add(String(c.id)));
                        }
                      });
                    const missingCards = allSetCards.filter(c => !ownedCardIds.has(String(c.id)));
                    const displayCards = activeTab === "inventario" ? ownedCards : missingCards;
                    return (
                      <div style={{
                        background: "rgba(46,230,193,0.03)",
                        border: `1px solid ${COURT_C}44`, borderTop: "none",
                        borderRadius: "0 0 14px 14px",
                      }}>
                        {/* Tabs */}
                        <div style={{ display: "flex", borderBottom: `1px solid ${COURT_C}22` }}>
                          {(["inventario", "restantes"] as const).map(tab => {
                            const count = tab === "inventario" ? ownedCards.length : missingCards.length;
                            const isActive = activeTab === tab;
                            return (
                              <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                  flex: 1, padding: "12px 16px",
                                  fontFamily: MONO_C, fontSize: "10px", letterSpacing: "0.14em",
                                  textTransform: "uppercase",
                                  color: isActive ? COURT_C : INK2_C,
                                  background: isActive ? `${COURT_C}10` : "transparent",
                                  border: "none",
                                  borderBottom: `2px solid ${isActive ? COURT_C : "transparent"}`,
                                  cursor: "pointer", transition: "all 0.15s",
                                }}
                              >
                                {tab === "inventario" ? "Inventario" : "Restantes"} ({count})
                              </button>
                            );
                          })}
                        </div>

                        <div style={{ padding: "20px 24px" }}>
                          {!loadedSets.has(set.id) && activeTab === "restantes" ? (
                            <div style={{ textAlign: "center", padding: "24px 0", fontFamily: MONO_C, fontSize: "11px", color: INK2_C }}>
                              Cargando cartas...
                            </div>
                          ) : displayCards.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "24px 0", fontFamily: MONO_C, fontSize: "11px", color: INK2_C }}>
                              {activeTab === "inventario" ? "No tienes cartas de este set" : "¡Tienes el set completo! 🎉"}
                            </div>
                          ) : (
                            <div style={{
                              maxHeight: "580px",
                              overflowY: displayCards.length > 6 ? "auto" : "visible",
                              paddingRight: displayCards.length > 6 ? "6px" : "0",
                              scrollbarWidth: "thin",
                              scrollbarColor: `${COURT_C}44 transparent`,
                            }}>
                              <div className="prof-cards-grid" style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, 1fr)",
                                gap: "20px 16px",
                                justifyItems: "center",
                              }}>
                                {activeTab === "inventario"
                                  ? ownedCards.map(({ card, qty }) => (
                                      <MiniCard key={`${card.id}`} cardId={card.id} setId={set.id} quantity={qty} />
                                    ))
                                  : missingCards.map(card => (
                                      <div key={`${card.id}-${card.version}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                        <div style={{
                                          position: "relative", width: "160px", height: "224px",
                                          borderRadius: "8px", overflow: "hidden",
                                          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                                          filter: "grayscale(1) opacity(0.5)",
                                        }}>
                                          <img src={card.image} alt={card.name} style={{ objectFit: "cover", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />
                                        </div>
                                        <span style={{ fontFamily: MONO_C, fontSize: "9px", letterSpacing: "0.06em", color: INK2_C, textAlign: "center" }}>
                                          #{String(card.card_number).padStart(3, "0")} {card.name}
                                        </span>
                                      </div>
                                    ))
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        /* Tablet */
        @media (max-width: 1023px) and (min-width: 768px) {
          .coll-outer { padding: 40px 32px 0 !important; gap: 32px !important; }
        }
        /* Mobile */
        @media (max-width: 767px) {
          .coll-outer { padding: 16px 16px 0 !important; grid-template-columns: 1fr !important; gap: 16px !important; }
          .prof-cards-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 16px 12px !important; }
          .showcase-wrap { margin-bottom: 16px !important; }
        }
      `}</style>
    </section>
  );
}
