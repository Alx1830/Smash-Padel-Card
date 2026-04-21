"use client";

import { PlayerCard3D } from "./PlayerCard3D";
import { FollowButton } from "./FollowButton";

interface PlayerData {
  username: string;
  firstName: string;
  lastName: string;
  category: string;
  position: "Drive" | "Revés";
  rankingLiga: string;
  ciudad: string;
  partner: string;
  edad: number;
  manoDominante: string;
  clubBase: string;
  liga: string;
  pala: string;
  tenis: string;
  paletero: string;
  torneos: { nombre: string; puesto: string }[];
  photoUrl?: string;
  year?: string;
  profileUserId?: string;
  currentUserId?: string | null;
}

/* CSS tokens */
const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const BG0   = "#05070d";

const MONO = "var(--font-jetbrains)";
const DISP = "var(--font-archivo)";

/* ─── helpers ─── */

/* Solo renderiza el link si tiene href real, si no muestra texto plano */
function MaybeLink({ href, label, fallback }: { href?: string; label: string; fallback: string }) {
  if (!href || label === fallback) {
    return (
      <span style={{ fontFamily: MONO, fontSize: "12px", color: INK2, fontStyle: "italic" }}>
        {fallback}
      </span>
    );
  }
  return (
    <a
      href={href}
      style={{
        fontFamily: MONO, fontSize: "12px", color: INK0,
        fontWeight: 500, textDecoration: "underline",
        textDecorationColor: `${COURT}66`,
        textUnderlineOffset: "3px",
      }}
    >
      {label}
    </a>
  );
}

function SearchBtn({ query, label }: { query: string; label: string }) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`;
  return (
    <a
      href={url} target="_blank" rel="noopener noreferrer"
      style={{
        display: "inline-flex", alignItems: "center",
        padding: "4px 12px", borderRadius: "999px",
        background: `linear-gradient(90deg, ${COURT}, ${BALL})`,
        color: BG0, fontFamily: MONO, fontSize: "11px",
        fontWeight: 700, letterSpacing: "0.05em",
        whiteSpace: "nowrap", flexShrink: 0,
      }}
    >
      {label}
    </a>
  );
}

function SectionH3({ num, children, mobile }: { num: string; children: React.ReactNode; mobile?: boolean }) {
  return (
    <h3 style={{
      fontFamily: DISP,
      fontSize: mobile ? "22px" : "28px",
      letterSpacing: "-0.01em",
      margin: mobile ? "0 0 16px" : "0 0 24px",
      color: INK0,
    }}>
      <span style={{
        fontFamily: MONO,
        fontSize: mobile ? "11px" : "12px",
        color: COURT,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        marginRight: mobile ? "12px" : "16px",
      }}>
        {num}
      </span>
      {children}
    </h3>
  );
}

/* Row: LABEL / VALUE [BUTTON] */
function Row({
  label, value, button,
}: {
  label: string; value: React.ReactNode; button?: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      padding: "9px 0",
      borderBottom: "1px dashed rgba(255,255,255,0.08)",
      gap: "6px", flexWrap: "wrap",
    }}>
      <span style={{
        fontFamily: MONO, fontSize: "12px",
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: INK2, flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{ color: INK2, fontSize: "12px", flexShrink: 0 }}>/</span>
      <span style={{
        fontFamily: MONO, fontSize: "14px",
        color: INK0, fontWeight: 500,
      }}>
        {value}
      </span>
      {button && <span style={{ flexShrink: 0 }}>{button}</span>}
    </div>
  );
}

export function ProfilePage({ player }: { player: PlayerData }) {
  const CARD_H = 416 * 1.2;   // card escalada 20%
  const COVER_H = 460;
  const NEG_MARGIN = Math.round(CARD_H / 2);

  return (
    /* [ROOT] contenedor principal */
    <div style={{ width: "100%" }}>

      {/* ══════════════════════════════════════════════════════
          [COVER] sección superior con fondo de rejilla animada
          ══════════════════════════════════════════════════════ */}
      <section
        id="cover"
        style={{
          position: "relative",
          overflow: "hidden",
          isolation: "isolate",
        }}
      >
        {/* [COVER-BG] gradientes de fondo */}
        <div style={{
          position: "absolute", inset: 0, zIndex: -2,
          background: `
            radial-gradient(ellipse 80% 60% at 50% 20%, rgba(46,230,193,0.28), transparent 60%),
            radial-gradient(ellipse 60% 40% at 85% 75%, rgba(255,79,216,0.22), transparent 70%),
            radial-gradient(ellipse 60% 40% at 15% 65%, rgba(79,240,255,0.18), transparent 70%),
            linear-gradient(180deg, #0a1320 0%, #060912 100%)
          `,
        }} />

        {/* [COVER-GRID] rejilla animada */}
        <div style={{
          position: "absolute", inset: 0, zIndex: -1,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
          animation: "gridPan 6s linear infinite",
        }} />

        {/* [COVER-ORBS] esferas de luz */}
        <div style={{
          position: "absolute", inset: 0, zIndex: -1,
          background: `
            radial-gradient(circle 400px at 20% 40%, rgba(46,230,193,0.15), transparent),
            radial-gradient(circle 500px at 80% 60%, rgba(214,255,61,0.08), transparent)
          `,
        }} />

        {/* ── Desktop layout (≥768px): absolute positioning ── */}
        <div
          className="cover-desktop"
          style={{ height: `${COVER_H}px`, display: "none", position: "relative" }}
        >
          {/* [COVER-TITLE] bloque izquierdo: eyebrow + nombre + categoría */}
          <div style={{
            position: "absolute",
            top: "38%", left: "80px",
            transform: "translateY(-80%)",
            maxWidth: "520px",
            zIndex: 20,
          }}>
            <div style={{
              fontFamily: MONO, fontSize: "11px",
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: COURT,
              display: "inline-flex", alignItems: "center", gap: "10px",
              marginBottom: "14px",
            }}>
              <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
              PERFIL DE JUGADOR
            </div>

            <h1 style={{
              fontFamily: DISP,
              fontSize: "clamp(34px, 3.8vw, 52px)",
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
                  <FollowButton
                    profileUserId={player.profileUserId}
                    currentUserId={player.currentUserId ?? null}
                  />
                </span>
              )}
            </h1>

            <p style={{
              margin: "14px 0 0", color: INK1, fontFamily: MONO, fontSize: "13px",
              letterSpacing: "0.2em", textTransform: "uppercase",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span className="neon-dot" style={{
                width: "10px", height: "10px", borderRadius: "50%",
                background: COURT, display: "inline-block", flexShrink: 0,
              }} />
              {player.category}
            </p>
          </div>

          {/* [COVER-STATS] bloque derecho: posición, ranking, ciudad */}
          <div style={{
            position: "absolute",
            top: "38%", right: "80px",
            transform: "translateY(-80%)",
            textAlign: "right", fontFamily: MONO,
            fontSize: "15px", letterSpacing: "0.15em",
            textTransform: "uppercase", color: INK2, lineHeight: 2.2, zIndex: 20,
          }}>
            <div>Posición / <b style={{ color: INK0, fontWeight: 600 }}>{player.position}</b></div>
            <div>Ranking Liga / <b style={{ color: INK0, fontWeight: 600 }}>#{player.rankingLiga}</b></div>
            <div>Ciudad / <b style={{ color: INK0, fontWeight: 600 }}>{player.ciudad}</b></div>
          </div>

          {/* [COVER-STRIP] barra inferior */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 48px",
            background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
            fontFamily: MONO, fontSize: "11px",
            letterSpacing: "0.2em", textTransform: "uppercase", color: INK2,
          }}>
            <span>SMASH PADEL CARD</span>
            <span>Season One — 2025/26</span>
          </div>
        </div>

        {/* ── Mobile layout (<768px): stacked flow ── */}
        <div
          className="cover-mobile"
          style={{ padding: "100px 24px 40px", display: "block" }}
        >
          {/* [COVER-TITLE-EYEBROW] */}
          <div style={{
            fontFamily: MONO, fontSize: "10px",
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: COURT,
            display: "flex", alignItems: "center", gap: "10px",
            marginBottom: "12px",
          }}>
            <span style={{ width: "18px", height: "1px", background: COURT, display: "inline-block" }} />
            PERFIL DE JUGADOR
          </div>

          {/* [COVER-TITLE-NAME] */}
          <h1 style={{
            fontFamily: DISP, fontSize: "clamp(36px, 10vw, 56px)",
            lineHeight: 0.92, margin: 0, letterSpacing: "-0.02em", color: INK0,
          }}>
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

          {/* [FOLLOW] botón debajo del apellido en móvil */}
          {player.profileUserId && (
            <div style={{ marginTop: "14px" }}>
              <FollowButton
                profileUserId={player.profileUserId}
                currentUserId={player.currentUserId ?? null}
              />
            </div>
          )}

          {/* [COVER-TITLE-CATEGORY] */}
          <p style={{
            margin: "12px 0 0", color: INK1, fontFamily: MONO, fontSize: "12px",
            letterSpacing: "0.2em", textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <span className="neon-dot" style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: COURT, display: "inline-block", flexShrink: 0,
            }} />
            {player.category}
          </p>

          {/* [COVER-STATS] fila de stats debajo del nombre */}
          <div style={{
            marginTop: "20px",
            display: "flex", flexWrap: "wrap", gap: "8px 24px",
            fontFamily: MONO, fontSize: "11px",
            letterSpacing: "0.1em", textTransform: "uppercase", color: INK2,
          }}>
            <span>Posición / <b style={{ color: INK0 }}>{player.position}</b></span>
            <span>Ranking / <b style={{ color: INK0 }}>#{player.rankingLiga}</b></span>
            <span>Ciudad / <b style={{ color: INK0 }}>{player.ciudad}</b></span>
          </div>
        </div>

        <style>{`
          @media (min-width: 768px) {
            .cover-desktop { display: block !important; }
            .cover-mobile  { display: none  !important; }
          }
        `}</style>
      </section>

      {/* ══════════════════════════════════════════════════════
          [PROFILE] sección inferior con fondo oscuro sólido
          ══════════════════════════════════════════════════════ */}
      <section
        id="profile"
        style={{ position: "relative", background: BG0 }}
      >

        {/* ── Desktop: card izquierda + grid derecha ── */}
        <div className="profile-desktop" style={{ display: "none", padding: "0 80px 80px" }}>
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "64px",
            maxWidth: "1280px", margin: "0 auto",
            marginTop: `-${NEG_MARGIN}px`,
          }}>

            {/* [CARD] izquierda, straddling seam */}
            <div style={{ flexShrink: 0, paddingTop: "24px", position: "relative", zIndex: 10, width: "312px", height: "499px" }}>
              <div style={{ transform: "scale(1.2)", transformOrigin: "top left" }}>
                <PlayerCard3D
                  username={player.username}
                  firstName={player.firstName}
                  lastName={player.lastName}
                  position={player.position}
                  category={player.category}
                  year={player.year ?? "2025-26"}
                  photoUrl={player.photoUrl}
                />
              </div>
            </div>

            {/* [DATA] derecha: grid 4 secciones */}
            <div style={{ flex: 1, paddingTop: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "30px", columnGap: "40px" }}>

                <div>
                  <SectionH3 num="01">Perfil</SectionH3>
                  <Row label="Partner" value={player.partner} />
                  <Row label="Edad"    value={`${player.edad} años`} />
                  <Row label="Mano"    value={player.manoDominante} />
                </div>

                <div>
                  <SectionH3 num="02">Liga</SectionH3>
                  <Row label="Club Base" value={<MaybeLink label={player.clubBase} fallback="Sin club" />} />
                  <Row label="Liga"      value={<MaybeLink label={player.liga} fallback="Sin liga" />} />
                </div>

                <div>
                  <SectionH3 num="03">Indumentaria</SectionH3>
                  <Row label="Pala"     value={player.pala && player.pala !== "—" ? player.pala : "Sin pala"}             button={player.pala && player.pala !== "—" ? <SearchBtn query={player.pala}     label="Ver Pala" />     : undefined} />
                  <Row label="Tenis"    value={player.tenis && player.tenis !== "—" ? player.tenis : "Sin tenis"}           button={player.tenis && player.tenis !== "—" ? <SearchBtn query={player.tenis}    label="Ver Tenis" />    : undefined} />
                  <Row label="Paletero" value={player.paletero && player.paletero !== "—" ? player.paletero : "Sin paletero"} button={player.paletero && player.paletero !== "—" ? <SearchBtn query={player.paletero} label="Ver Paletero" /> : undefined} />
                </div>

                <div>
                  <SectionH3 num="04">Torneos</SectionH3>
                  {player.torneos.map((t, i) => (
                    <Row key={i} label={t.nombre} value={t.puesto} />
                  ))}
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile: card centrada + grid 4 secciones ── */}
        <div className="profile-mobile" style={{ display: "block", padding: "40px 20px 64px" }}>

          {/* [CARD] centrada */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "48px" }}>
            <PlayerCard3D
              username={player.username}
              firstName={player.firstName}
              lastName={player.lastName}
              position={player.position}
              category={player.category}
              year={player.year ?? "2025-26"}
              photoUrl={player.photoUrl}
            />
          </div>

          {/* [PROFILE-DIVIDER] */}
          <div style={{
            width: "100%", height: "1px", marginBottom: "40px",
            background: "rgba(255,255,255,0.06)",
          }} />

          {/* [MOBILE-GRID] cuadrícula 2 columnas × 2 filas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "40px", columnGap: "16px" }}>

            {/* [PERFIL 01] */}
            <div>
              <SectionH3 num="01" mobile>Perfil</SectionH3>
              <Row label="Partner" value={player.partner} />
              <Row label="Edad"    value={`${player.edad} años`} />
              <Row label="Mano"    value={player.manoDominante} />
            </div>

            {/* [LIGA 02] */}
            <div>
              <SectionH3 num="02" mobile>Liga</SectionH3>
              <Row label="Club" value={<MaybeLink label={player.clubBase} fallback="Sin club" />} />
              <Row label="Liga" value={<MaybeLink label={player.liga} fallback="Sin liga" />} />
            </div>

            {/* [INDUMENTARIA 03] */}
            <div>
              <SectionH3 num="03" mobile>Indumentaria</SectionH3>
              <Row label="Pala"     value={player.pala && player.pala !== "—" ? player.pala : "Sin pala"}         button={player.pala && player.pala !== "—" ? <SearchBtn query={player.pala}     label="Ver" /> : undefined} />
              <Row label="Tenis"    value={player.tenis && player.tenis !== "—" ? player.tenis : "Sin tenis"}         button={player.tenis && player.tenis !== "—" ? <SearchBtn query={player.tenis}    label="Ver" /> : undefined} />
              <Row label="Paletero" value={player.paletero && player.paletero !== "—" ? player.paletero : "Sin paletero"} button={player.paletero && player.paletero !== "—" ? <SearchBtn query={player.paletero} label="Ver" /> : undefined} />
            </div>

            {/* [TORNEOS 04] */}
            <div>
              <SectionH3 num="04" mobile>Torneos</SectionH3>
              {player.torneos.map((t, i) => (
                <Row key={i} label={t.nombre} value={t.puesto} />
              ))}
            </div>

          </div>
        </div>

        <style>{`
          @media (min-width: 768px) {
            .profile-desktop { display: block !important; }
            .profile-mobile  { display: none  !important; }
          }
        `}</style>
      </section>
    </div>
  );
}
