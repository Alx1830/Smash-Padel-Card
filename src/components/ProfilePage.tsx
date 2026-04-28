"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { PlayerCard3D } from "./PlayerCard3D";
import { FollowButton } from "./FollowButton";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { SET_CARDS, VERSION_LABEL } from "@/data/pokemon-cards";

type SetStats = { unique: number; total: number; totalQty: number };
type InvRow   = { card_id: number; set_id: string; quantity: number };

interface PlayerData {
  username:         string;
  firstName:        string;
  lastName:         string;
  pais:             string;
  tipoPerfil:       string;
  gimnasioPokemon:  string;
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
            <div>Gimnasio Favorito / <b style={{ color: INK0 }}>{player.gimnasioPokemon || "—"}</b></div>
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
            <span>{player.pais || "—"}</span>
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
            <span>Gimnasio Favorito / <b style={{ color: INK0 }}>{player.gimnasioPokemon || "—"}</b></span>
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
        <div className="profile-desktop" style={{ display: "none", padding: "0 80px 80px" }}>
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
                <Row label="País"               value={player.pais || "—"} />
                <Row label="Pokémon Favorito"   value={player.pokemonFavorito || "—"} />
                <Row label="Energía Favorita"   value={player.energiaFavorita || "—"} />
                <Row label="Gimnasio Favorito"  value={player.gimnasioPokemon || "—"} />
              </div>
            </div>

            {/* Showcase — right column */}
            {(player.inventoryRows ?? []).filter(r => r.quantity > 0).length >= 3 && (
              <div style={{ flex: "0 0 auto", width: "clamp(240px, 26%, 340px)", paddingTop: "20px" }}>
                <Showcase inventoryRows={player.inventoryRows ?? []} />
              </div>
            )}
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
          <Row label="País"               value={player.pais || "—"} />
          <Row label="Gimnasio Favorito"  value={player.gimnasioPokemon || "—"} />
          {(player.inventoryRows ?? []).filter(r => r.quantity > 0).length >= 3 && (
            <div style={{ marginTop: "40px" }}>
              <Showcase inventoryRows={player.inventoryRows ?? []} />
            </div>
          )}
        </div>

        <style>{`
          @media (min-width: 768px) {
            .profile-desktop { display: block !important; }
            .profile-mobile  { display: none  !important; }
          }
        `}</style>
      </section>

      {/* ══ SHOWCASE + COLECCIÓN ══ */}
      {player.setStats && Object.keys(player.setStats).length > 0 && (
        <CollectionSection
          setStats={player.setStats}
          inventoryRows={player.inventoryRows ?? []}
        />
      )}

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
function MiniCard({ cardId, setId, quantity }: { cardId: number; setId: string; quantity: number }) {
  const cards = SET_CARDS[setId];
  const card  = cards?.find(c => c.id === cardId);
  if (!card) return null;
  const label      = VERSION_LABEL[card.version];
  const labelColor = VERSION_COLOR_MAP[label] ?? INK2_C;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <div style={{ position: "relative", width: "160px", height: "224px", borderRadius: "8px", overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
        <Image src={card.image} alt={card.name} fill style={{ objectFit: "cover" }} sizes="160px" unoptimized />
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
  cardId: number; setId: string; quantity: number; autoAnimate?: boolean;
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

  const label      = VERSION_LABEL[card.version];
  const labelColor = VERSION_COLOR_MAP[label] ?? INK2_C;
  const fullLabel  = VERSION_FULL_LABEL[label] ?? label;
  const glow       = VERSION_GLOW[label] ?? "none";
  const isRH = label === "RH";
  const isH  = label === "H";
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
          <Image src={card.image} alt={card.name} fill style={{ objectFit: "cover" }} sizes="420px" unoptimized />

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
            position: "absolute", top: "12px", left: "12px",
            fontFamily: MONO_C, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase",
            color: labelColor, border: `1px solid ${labelColor}80`,
            borderRadius: "5px", padding: "4px 10px",
            background: "rgba(5,7,13,0.85)", backdropFilter: "blur(6px)",
          }}>{fullLabel}</div>

          {quantity > 1 && (
            <div style={{
              position: "absolute", bottom: "12px", right: "12px",
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

/* ── Showcase slider ────────────────────────────────────────── */
function Showcase({ inventoryRows }: { inventoryRows: InvRow[] }) {
  const [idx, setIdx] = useState(0);

  const owned = inventoryRows
    .filter(r => r.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  if (owned.length < 3) return null;

  const prevIdx = (idx - 1 + owned.length) % owned.length;
  const nextIdx = (idx + 1) % owned.length;

  // Auto-advance every 2 seconds, infinite loop
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % owned.length), 2000);
    return () => clearInterval(t);
  }, [owned.length]);

  return (
    <div style={{ marginBottom: "64px" }}>
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

      {/* Card fan — 3 cards stacked, side ones behind center */}
      <div style={{ position: "relative", padding: "0 10%", paddingBottom: "6%" }}>

        {/* Left background card */}
        <div style={{
          position: "absolute", top: "5%", left: "0",
          width: "78%",
          transform: "rotateZ(-9deg) rotateY(-8deg)",
          transformOrigin: "bottom center",
          opacity: 0.45,
          filter: "brightness(0.5)",
          zIndex: 1,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
        }}>
          <ShowcaseCard cardId={owned[prevIdx].card_id} setId={owned[prevIdx].set_id} quantity={owned[prevIdx].quantity} autoAnimate />
        </div>

        {/* Right background card */}
        <div style={{
          position: "absolute", top: "5%", right: "0",
          width: "78%",
          transform: "rotateZ(9deg) rotateY(8deg)",
          transformOrigin: "bottom center",
          opacity: 0.45,
          filter: "brightness(0.5)",
          zIndex: 2,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
        }}>
          <ShowcaseCard cardId={owned[nextIdx].card_id} setId={owned[nextIdx].set_id} quantity={owned[nextIdx].quantity} autoAnimate />
        </div>

        {/* Center card — interactive, animates on change */}
        <div key={idx} className="sc-center" style={{ position: "relative", zIndex: 10 }}>
          <ShowcaseCard cardId={owned[idx].card_id} setId={owned[idx].set_id} quantity={owned[idx].quantity} />
        </div>
      </div>

      {/* Dots */}
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
    </div>
  );
}

/* ── Collection stats section ───────────────────────────────── */
function CollectionSection({
  setStats, inventoryRows,
}: {
  setStats: Record<string, SetStats>;
  inventoryRows: InvRow[];
}) {
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);

  const entries = Object.entries(setStats).map(([setId, stats]) => {
    const set = ALL_SETS.find(s => s.id === setId);
    return set ? { set, stats } : null;
  }).filter(Boolean) as { set: { id: string; name: string; logo: string }; stats: SetStats }[];

  if (entries.length === 0) return null;

  // Cards owned per set for expand view
  const ownedBySet = (setId: string) => {
    const cards = SET_CARDS[setId] ?? [];
    return inventoryRows
      .filter(r => r.set_id === setId && r.quantity > 0)
      .map(r => ({ card: cards.find(c => c.id === r.card_id), qty: r.quantity }))
      .filter(x => x.card) as { card: NonNullable<typeof cards[0]>; qty: number }[];
  };

  return (
    <section style={{ background: BG0_C, padding: "0 0 80px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="coll-outer" style={{ padding: "64px 80px 0" }}>

        {/* ── Colección ── */}
        <div style={{ maxWidth: "600px" }}>
          <div style={{
            fontFamily: MONO_C, fontSize: "11px", letterSpacing: "0.22em",
            textTransform: "uppercase", color: COURT_C,
            display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
          }}>
            <span style={{ width: "22px", height: "1px", background: COURT_C, display: "inline-block" }} />
            Colección
          </div>
          <h2 style={{ fontFamily: DISP_C, fontSize: "clamp(24px, 2.5vw, 36px)", letterSpacing: "-0.02em", margin: "0 0 32px", color: INK0_C }}>
            Pokémon TCG
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                        <Image src={set.logo} alt={set.name} fill style={{ objectFit: "contain", objectPosition: "left center" }} unoptimized />
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
                  {isOpen && (
                    <div style={{
                      padding: "24px", background: "rgba(46,230,193,0.03)",
                      border: `1px solid ${COURT_C}44`, borderTop: "none",
                      borderRadius: "0 0 14px 14px",
                    }}>
                      <div className="prof-cards-grid" style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "20px 16px",
                        justifyItems: "center",
                      }}>
                        {ownedCards.map(({ card, qty }) => (
                          <MiniCard key={`${card.id}`} cardId={card.id} setId={set.id} quantity={qty} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .coll-outer { padding: 40px 20px 0 !important; }
          .prof-cards-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 16px 12px !important; }
        }
      `}</style>
    </section>
  );
}
