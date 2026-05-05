"use client";

import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { PlayerCard3D } from "./PlayerCard3D";
import { FollowButton } from "./FollowButton";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { getVersionLabel, getVersionEffect, getVersionColor } from "@/data/pokemon-cards-meta";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const BG0   = "#05070d";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export interface ProfileHeaderData {
  username:        string;
  firstName:       string;
  lastName:        string;
  tipoPerfil:      string;
  pais:            string;
  ciudad:          string;
  energiaFavorita: string;
  pokemonFavorito: string;
  edad:            number;
  setFavoritoId?:  string;
  photoUrl?:       string;
  profileUserId?:  string;
  currentUserId?:  string | null;
  featuredCards?:  { card_id: number | string; set_id: string }[];
  inventoryRows?:  { card_id: number | string; set_id: string; quantity: number }[];
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "9px 0", borderBottom: "1px dashed rgba(255,255,255,0.08)", gap: "6px", flexWrap: "wrap" }}>
      <span style={{ fontFamily: MONO, fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", color: INK2, flexShrink: 0 }}>{label}</span>
      <span style={{ color: INK2, fontSize: "12px", flexShrink: 0 }}>/</span>
      <span style={{ fontFamily: MONO, fontSize: "14px", color: INK0, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/* ── ShowcaseCard ── */
function ShowcaseCard({ cardId, setId, quantity, autoAnimate = false }: {
  cardId: number | string; setId: string; quantity: number; autoAnimate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt,  setTilt]  = useState({ x: 0, y: 0 });
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

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
  const card  = cards?.find(c => c.id === cardId || c.card_number === Number(cardId));
  if (!card) return null;

  const label      = getVersionLabel(card.version);
  const effect     = getVersionEffect(card.version);
  const isH        = effect === "holofoil";
  const isGold     = effect === "goldBorder";
  const isRH       = effect === "reverseHolofoil" || effect === "metal";
  const labelColor = getVersionColor(card.version);
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
      <div ref={ref} style={{ perspective: "800px", cursor: "pointer", width: "100%" }} onMouseMove={onMove} onMouseLeave={onLeave}>
        <div style={{
          width: "100%", aspectRatio: "5 / 7", borderRadius: "14px", overflow: "hidden", position: "relative",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: tilt.x === 0 ? "transform 0.6s cubic-bezier(0.2,0.8,0.2,1)" : "transform 0.05s linear",
          willChange: "transform",
          boxShadow: `0 20px 60px rgba(0,0,0,0.75), ${glow}`,
          border: `1px solid ${labelColor}30`,
        }}>
          <Image src={card.image} alt={card.name} fill style={{ objectFit: "cover" }} sizes="420px" />
          {isRH && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
              background: `radial-gradient(ellipse 80% 60% at ${mx}% ${my}%, rgba(220,220,240,0.55) 0%, rgba(180,180,210,0.25) 30%, transparent 60%), linear-gradient(${105 + tilt.y * 2}deg, transparent 20%, rgba(200,200,230,0.18) 35%, rgba(255,255,255,0.28) 45%, rgba(200,200,230,0.18) 55%, transparent 70%)` }} />
          )}
          {(isH || isGold) && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "color-dodge",
              background: isGold
                ? `radial-gradient(ellipse 90% 70% at ${mx}% ${my}%, rgba(255,220,80,0.6) 0%, rgba(255,180,30,0.45) 20%, rgba(220,140,0,0.35) 45%, rgba(255,200,80,0.2) 65%, transparent 90%)`
                : `radial-gradient(ellipse 90% 70% at ${mx}% ${my}%, rgba(255,100,100,0.5) 0%, rgba(255,200,50,0.4) 15%, rgba(80,255,120,0.4) 30%, rgba(50,180,255,0.4) 45%, rgba(180,80,255,0.4) 60%, rgba(255,80,200,0.35) 75%, transparent 90%)` }} />
          )}
          {(isH || isGold) && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
              background: isGold
                ? `linear-gradient(${120 + tilt.y * 3}deg, transparent 0%, rgba(255,200,50,0.2) 25%, rgba(255,160,0,0.25) 45%, rgba(255,220,80,0.2) 65%, transparent 85%)`
                : `linear-gradient(${120 + tilt.y * 3}deg, transparent 0%, rgba(255,100,150,0.15) 20%, rgba(80,200,255,0.2) 35%, rgba(200,80,255,0.15) 50%, rgba(255,200,80,0.15) 65%, transparent 80%)` }} />
          )}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen", background: `linear-gradient(${110 + tilt.y}deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)` }} />
          <div style={{ position: "absolute", bottom: "12px", right: "12px", fontFamily: MONO, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: labelColor, border: `1px solid ${labelColor}80`, borderRadius: "5px", padding: "4px 10px", background: "rgba(5,7,13,0.85)", backdropFilter: "blur(6px)" }}>{label}</div>
          {quantity > 1 && (
            <div style={{ position: "absolute", top: "12px", right: "12px", fontFamily: MONO, fontSize: "12px", letterSpacing: "0.1em", color: COURT, border: `1px solid ${COURT}60`, borderRadius: "5px", padding: "4px 10px", background: "rgba(5,7,13,0.85)", backdropFilter: "blur(6px)" }}>×{quantity}</div>
          )}
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: "14px", letterSpacing: "0.06em", color: INK0, marginBottom: "6px" }}>{card.name}</div>
        <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.06em", color: INK2 }}>#{String(card.card_number).padStart(3, "0")}</div>
      </div>
    </div>
  );
}

/* ── Placeholder candidates (SSR-safe) ── */
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

/* ── Showcase slider ── */
function Showcase({ featuredCards, inventoryRows }: {
  featuredCards: { card_id: number | string; set_id: string }[];
  inventoryRows: { card_id: number | string; set_id: string; quantity: number }[];
}) {
  const [idx, setIdx] = useState(0);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_STABLE);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const ids = [
      ...featuredCards.map(f => f.set_id),
      ...PLACEHOLDER_STABLE.map(p => p.set_id),
    ];
    loadManySets([...new Set(ids)]).then(() => forceUpdate(n => n + 1));
  }, [featuredCards]);

  useEffect(() => {
    if (PLACEHOLDER_CANDIDATES.length >= 3) {
      const shuffled = [...PLACEHOLDER_CANDIDATES].sort(() => Math.random() - 0.5);
      setPlaceholder(shuffled.slice(0, 3));
    }
  }, []);

  const owned = featuredCards.slice(0, 10).map(f => {
    const row = inventoryRows.find(r => r.card_id === f.card_id && r.set_id === f.set_id);
    return { card_id: f.card_id, set_id: f.set_id, quantity: row?.quantity ?? 1 };
  }).filter(f => SET_CARDS[f.set_id]?.some(c => c.id === f.card_id || c.card_number === Number(f.card_id)));

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
    <div style={{ marginBottom: "64px" }}>
      <style>{`
        @keyframes sc-in { from { opacity:0; transform:scale(0.88) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .sc-center { animation: sc-in 0.45s cubic-bezier(0.2,0.8,0.2,1) forwards; }
      `}</style>
      <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
        Mis cartas destacadas
      </div>
      <div style={{ position: "relative", padding: "0 10%", paddingBottom: "6%" }}>
        <div style={{ position: "absolute", top: "5%", left: "0", width: "78%", transform: "rotateZ(-9deg) rotateY(-8deg)", transformOrigin: "bottom center", opacity: 0.45, filter: isEmpty ? "grayscale(1) brightness(0.35)" : "brightness(0.5)", zIndex: 1, transition: "opacity 0.3s ease", pointerEvents: "none" }}>
          <ShowcaseCard cardId={displayCards[prevIdx].card_id} setId={displayCards[prevIdx].set_id} quantity={1} autoAnimate={!isEmpty} />
        </div>
        <div style={{ position: "absolute", top: "5%", right: "0", width: "78%", transform: "rotateZ(9deg) rotateY(8deg)", transformOrigin: "bottom center", opacity: 0.45, filter: isEmpty ? "grayscale(1) brightness(0.35)" : "brightness(0.5)", zIndex: 2, transition: "opacity 0.3s ease", pointerEvents: "none" }}>
          <ShowcaseCard cardId={displayCards[nextIdx].card_id} setId={displayCards[nextIdx].set_id} quantity={1} autoAnimate={!isEmpty} />
        </div>
        <div key={isEmpty ? "empty" : idx} className="sc-center" style={{ position: "relative", zIndex: 10, filter: isEmpty ? "grayscale(1) brightness(0.35)" : "none", pointerEvents: "none" }}>
          <ShowcaseCard cardId={displayCards[isEmpty ? 1 : idx].card_id} setId={displayCards[isEmpty ? 1 : idx].set_id} quantity={1} />
        </div>
        {isEmpty && (
          <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", background: "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(5,7,13,0.82) 30%, transparent 100%)" }}>
            <span style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "14px", height: "1px", background: COURT, display: "inline-block" }} />
              Sin cartas destacadas
            </span>
            <p style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.08em", color: INK0, textAlign: "center", lineHeight: 1.6, margin: 0, maxWidth: "200px" }}>
              Ve a tu inventario, haz clic en una carta y presiona{" "}
              <span style={{ color: COURT, fontWeight: 600 }}>Destacar</span>
              {" "}— mínimo 3 cartas
            </p>
          </div>
        )}
      </div>
      {!isEmpty && (
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "16px" }}>
          {owned.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? "20px" : "6px", height: "6px", borderRadius: "3px", border: "none", cursor: "pointer", background: i === idx ? COURT : "rgba(255,255,255,0.2)", transition: "all 0.2s", padding: 0 }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ══ ProfileHeader ══ */
export function ProfileHeader({ player }: { player: ProfileHeaderData }) {
  const CARD_H     = 416 * 1.2;
  const COVER_H    = 460;
  const NEG_MARGIN = Math.round(CARD_H / 2);
  const featuredCards = player.featuredCards ?? [];
  const inventoryRows = player.inventoryRows ?? [];

  return (
    <div style={{ width: "100%" }}>

      {/* ══ COVER ══ */}
      <section id="cover" style={{ position: "relative", overflow: "hidden", isolation: "isolate" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: -2, background: `radial-gradient(ellipse 80% 60% at 50% 20%, rgba(46,230,193,0.28), transparent 60%), radial-gradient(ellipse 60% 40% at 85% 75%, rgba(255,79,216,0.22), transparent 70%), radial-gradient(ellipse 60% 40% at 15% 65%, rgba(79,240,255,0.18), transparent 70%), linear-gradient(180deg, #0a1320 0%, #060912 100%)` }} />
        <div style={{ position: "absolute", inset: 0, zIndex: -1, backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`, backgroundSize: "80px 80px", WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)", maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)", animation: "gridPan 6s linear infinite" }} />

        {/* Desktop */}
        <div className="ph-cover-desktop" style={{ height: `${COVER_H}px`, display: "none", position: "relative" }}>
          <div style={{ position: "absolute", top: "38%", left: "80px", transform: "translateY(-80%)", maxWidth: "520px", zIndex: 20 }}>
            <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
              PERFIL MAESTRO POKÉMON
            </div>
            <h1 style={{ fontFamily: DISP, fontSize: "clamp(34px, 3.8vw, 52px)", lineHeight: 0.92, margin: 0, letterSpacing: "-0.02em", color: INK0, display: "flex", alignItems: "center", gap: "16px", flexWrap: "nowrap" }}>
              <span style={{ whiteSpace: "nowrap" }}>
                {player.firstName}{" "}
                <em style={{ fontStyle: "normal", background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
                  {player.lastName}
                </em>
              </span>
              {player.profileUserId && (
                <span style={{ fontSize: "0", lineHeight: 1, flexShrink: 0 }}>
                  <FollowButton profileUserId={player.profileUserId} currentUserId={player.currentUserId ?? null} />
                </span>
              )}
            </h1>
            <p style={{ margin: "14px 0 0", color: INK1, fontFamily: MONO, fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: COURT, display: "inline-block", flexShrink: 0 }} />
              {player.tipoPerfil || "Maestro Pokémon"}
            </p>
          </div>
          <div style={{ position: "absolute", top: "38%", right: "80px", transform: "translateY(-80%)", textAlign: "right", fontFamily: MONO, fontSize: "15px", letterSpacing: "0.15em", textTransform: "uppercase", color: INK2, lineHeight: 2.2, zIndex: 20 }}>
            <div>Energía Favorita / <b style={{ color: INK0 }}>{player.energiaFavorita || "—"}</b></div>
            <div>País / <b style={{ color: INK0 }}>{player.pais || "—"}</b></div>
            <div>Ciudad / <b style={{ color: INK0 }}>{player.ciudad || "—"}</b></div>
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", alignItems: "center", padding: "14px 48px", background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)", fontFamily: MONO, fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: INK2 }}>
            <span>POKÉMON CARD COLLECTOR</span>
          </div>
        </div>

        {/* Mobile */}
        <div className="ph-cover-mobile" style={{ padding: "100px 24px 40px", display: "block" }}>
          <div style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ width: "18px", height: "1px", background: COURT, display: "inline-block" }} />
            PERFIL MAESTRO POKÉMON
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(36px, 10vw, 56px)", lineHeight: 0.92, margin: 0, letterSpacing: "-0.02em", color: INK0 }}>
            {player.firstName}{" "}
            <em style={{ fontStyle: "normal", background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
              {player.lastName}
            </em>
          </h1>
          {player.profileUserId && (
            <div style={{ marginTop: "14px" }}>
              <FollowButton profileUserId={player.profileUserId} currentUserId={player.currentUserId ?? null} />
            </div>
          )}
          <p style={{ margin: "12px 0 0", color: INK1, fontFamily: MONO, fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: COURT, display: "inline-block", flexShrink: 0 }} />
            {player.tipoPerfil || "Maestro Pokémon"}
          </p>
          <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "8px 24px", fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: INK2 }}>
            <span>Energía Favorita / <b style={{ color: INK0 }}>{player.energiaFavorita || "—"}</b></span>
            <span>País / <b style={{ color: INK0 }}>{player.pais || "—"}</b></span>
            <span>Ciudad / <b style={{ color: INK0 }}>{player.ciudad || "—"}</b></span>
          </div>
        </div>

        <style>{`
          @keyframes gridPan { 0% { background-position: 0 0; } 100% { background-position: 80px 80px; } }
          @media (min-width: 768px) { .ph-cover-desktop { display: block !important; } .ph-cover-mobile { display: none !important; } }
        `}</style>
      </section>

      {/* ══ PROFILE HERO ══ */}
      <section style={{ position: "relative", background: BG0 }}>

        {/* Desktop */}
        <div className="ph-profile-desktop" style={{ display: "none", padding: "0px 80px 30px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "64px", maxWidth: "1280px", margin: "0 auto", marginTop: `-${NEG_MARGIN}px` }}>
            <div style={{ flexShrink: 0, paddingTop: "24px", position: "relative", zIndex: 10, width: "312px", height: "499px" }}>
              <div style={{ transform: "scale(1.2)", transformOrigin: "top left" }}>
                <PlayerCard3D
                  username={player.username} firstName={player.firstName} lastName={player.lastName}
                  position={player.tipoPerfil} category={player.pais} energiaFavorita={player.energiaFavorita}
                  setFavoritoId={player.setFavoritoId} photoUrl={player.photoUrl}
                />
              </div>
            </div>
            <div style={{ flex: 1, paddingTop: "20px" }}>
              <h3 style={{ fontFamily: DISP, fontSize: "28px", letterSpacing: "-0.01em", margin: "0 0 24px", color: INK0 }}>
                Perfil Maestro Pokémon
              </h3>
              <Row label="Tipo de Perfil"   value={player.tipoPerfil || "—"} />
              <Row label="Edad"             value={player.edad ? `${player.edad} años` : "—"} />
              <Row label="Pokémon Favorito" value={player.pokemonFavorito || "—"} />
              <Row label="Energía Favorita" value={player.energiaFavorita || "—"} />
            </div>
            <div style={{ flex: "0 0 auto", width: "clamp(240px, 26%, 340px)", paddingTop: "20px" }}>
              <Showcase featuredCards={featuredCards} inventoryRows={inventoryRows} />
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="ph-profile-mobile" style={{ display: "block", padding: "40px 20px 48px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "48px" }}>
            <PlayerCard3D
              username={player.username} firstName={player.firstName} lastName={player.lastName}
              position={player.tipoPerfil} category={player.pais} energiaFavorita={player.energiaFavorita}
              photoUrl={player.photoUrl} setFavoritoId={player.setFavoritoId}
            />
          </div>
          <div style={{ width: "100%", height: "1px", marginBottom: "40px", background: "rgba(255,255,255,0.06)" }} />
          <h3 style={{ fontFamily: DISP, fontSize: "22px", letterSpacing: "-0.01em", margin: "0 0 16px", color: INK0 }}>
            Perfil Maestro Pokémon
          </h3>
          <Row label="Pokémon Favorito" value={player.pokemonFavorito || "—"} />
          <Row label="Edad"             value={player.edad ? `${player.edad} años` : "—"} />
          <Row label="Energía Favorita" value={player.energiaFavorita || "—"} />
          <Row label="Tipo de Perfil"   value={player.tipoPerfil || "—"} />
          <div style={{ marginTop: "40px" }}>
            <Showcase featuredCards={featuredCards} inventoryRows={inventoryRows} />
          </div>
        </div>

        <style>{`
          @media (min-width: 768px) { .ph-profile-desktop { display: block !important; } .ph-profile-mobile { display: none !important; } }
        `}</style>
      </section>
    </div>
  );
}
