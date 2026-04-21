import Link from "next/link";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export default function LandingPage() {
  return (
    <main style={{
      minHeight: "100vh", background: BG0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>

      {/* [BG] gradientes */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: `
          radial-gradient(ellipse 70% 50% at 50% 20%, rgba(46,230,193,0.2), transparent 60%),
          radial-gradient(ellipse 50% 40% at 80% 70%, rgba(255,79,216,0.12), transparent 70%),
          radial-gradient(ellipse 50% 40% at 20% 60%, rgba(79,240,255,0.1), transparent 70%),
          linear-gradient(180deg, #0a1320 0%, ${BG0} 100%)
        `,
      }} />

      {/* [BG-GRID] rejilla animada */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
        WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%)",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%)",
        animation: "gridPan 6s linear infinite",
      }} />

      {/* [CONTENT] */}
      <div style={{
        position: "relative", zIndex: 10,
        textAlign: "center", padding: "0 24px",
        maxWidth: "640px",
      }}>

        {/* Logo */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "10px",
          marginBottom: "48px",
        }}>
          <span style={{
            width: "10px", height: "10px", borderRadius: "50%",
            background: COURT, boxShadow: `0 0 14px ${COURT}`,
            display: "inline-block", flexShrink: 0,
            animation: "dot-pulse 2s ease-in-out infinite",
          }} />
          <span style={{
            fontFamily: DISP, fontSize: "16px",
            letterSpacing: "0.1em", color: INK0,
            textTransform: "uppercase",
          }}>
            SMASH PADEL CARD
          </span>
        </div>

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "6px 16px", borderRadius: "999px",
          background: `${COURT}14`,
          border: `1px solid ${COURT}33`,
          marginBottom: "28px",
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COURT, display: "inline-block" }} />
          <span style={{ fontFamily: MONO, fontSize: "10px", color: COURT, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Página en construcción
          </span>
        </div>

        {/* Título */}
        <h1 style={{
          fontFamily: DISP,
          fontSize: "clamp(40px, 8vw, 72px)",
          lineHeight: 0.9,
          margin: "0 0 24px",
          letterSpacing: "-0.02em",
          color: INK0,
        }}>
          Tu carta de{" "}
          <em style={{
            fontStyle: "normal",
            background: `linear-gradient(135deg, #4ff0ff, ${COURT}, ${BALL})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}>
            pádel
          </em>
          {" "}te espera
        </h1>

        {/* Descripción */}
        <p style={{
          fontFamily: MONO, fontSize: "14px",
          color: INK1, lineHeight: 1.8,
          letterSpacing: "0.04em", margin: "0 0 48px",
        }}>
          La plataforma de la comunidad de pádel de Cúcuta.<br />
          Crea tu perfil, muestra tu carta y compite en la liga.
        </p>

        {/* CTA */}
        <Link
          href="/login"
          style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            padding: "14px 36px", borderRadius: "12px",
            background: `linear-gradient(90deg, ${COURT}, ${BALL})`,
            color: BG0, fontFamily: MONO, fontSize: "13px",
            fontWeight: 700, letterSpacing: "0.08em",
            textDecoration: "none",
            boxShadow: `0 0 32px ${COURT}44`,
            transition: "opacity 0.2s, box-shadow 0.2s",
          }}
        >
          Crear mi perfil →
        </Link>

        {/* Sub-CTA */}
        <p style={{
          fontFamily: MONO, fontSize: "11px",
          color: INK2, marginTop: "20px", letterSpacing: "0.08em",
        }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" style={{ color: COURT, textDecoration: "none" }}>
            Inicia sesión
          </Link>
        </p>

      </div>

      {/* [STRIP] inferior */}
      <div style={{
        position: "absolute", bottom: "24px",
        display: "flex", gap: "40px",
        fontFamily: MONO, fontSize: "10px",
        letterSpacing: "0.15em", textTransform: "uppercase", color: INK2,
      }}>
        <span>Season One — 2025/26</span>
        <span>Cúcuta, Colombia</span>
      </div>
    </main>
  );
}
