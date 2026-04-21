import Link from "next/link";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const FEATURES = [
  {
    icon: "◉",
    color: COURT,
    title: "Tu CARD personalizada",
    desc: "Cada jugador tiene una carta coleccionable con su foto, categoría, posición, paleta, historial de torneos y más. Tu identidad en el pádel colombiano.",
  },
  {
    icon: "⊕",
    color: "#a26bff",
    title: "Encuentra jugadores",
    desc: "Busca compañeros o rivales por ciudad, categoría y posición. Sigue a jugadores, mira su perfil y conecta con la comunidad.",
  },
  {
    icon: "⬡",
    color: BALL,
    title: "Clubes por ciudad",
    desc: "Explora todos los clubes de pádel del país. Descubre canchas, horarios y la comunidad de cada club cerca a ti.",
  },
  {
    icon: "◈",
    color: "#ff4fd8",
    title: "Ligas y torneos",
    desc: "Consulta las ligas activas en cada ciudad, inscríbete a torneos y sigue los rankings de la temporada en tiempo real.",
  },
  {
    icon: "◬",
    color: "#ffd24f",
    title: "Mercado de pádel",
    desc: "Compra y vende equipamiento nuevo o usado: palas, zapatillas, paleteros y más. Todo dentro de la misma comunidad.",
  },
  {
    icon: "◇",
    color: "#4ff0ff",
    title: "Comunidad colombiana",
    desc: "La primera plataforma dedicada 100% al pádel colombiano. Rankings, perfiles, historia y pasión por el deporte.",
  },
];

const STEPS = [
  { num: "01", title: "Crea tu cuenta", desc: "Regístrate con Google en segundos. Sin formularios largos." },
  { num: "02", title: "Completa tu perfil", desc: "Agrega tu foto, posición, paleta favorita y toda tu información de jugador." },
  { num: "03", title: "Obtén tu CARD", desc: "Tu carta personalizada se genera automáticamente y puedes compartirla con todos." },
  { num: "04", title: "Únete a la liga", desc: "Inscríbete en torneos, sigue a otros jugadores y sube en el ranking." },
];

export default function LandingPage() {
  return (
    <main style={{ background: BG0, color: INK0, overflowX: "hidden" }}>
      <style>{`
        @keyframes gridPan { from { backgroundPosition: 0 0; } to { backgroundPosition: 80px 80px; } }
        @keyframes dot-pulse { 0%,100% { opacity:1; boxShadow: 0 0 14px ${COURT}; } 50% { opacity:0.5; boxShadow: 0 0 4px ${COURT}; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes border-spin { to { --border-angle: 360deg; } }
        @property --border-angle { syntax:"<angle>"; inherits:false; initial-value:0deg; }
        .card-glow { animation: border-spin 4s linear infinite; }
        .feature-card:hover { border-color: rgba(255,255,255,0.18) !important; background: rgba(255,255,255,0.05) !important; }
        .cta-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .cta-btn { transition: opacity 0.2s, transform 0.2s; }
        .ghost-btn:hover { border-color: rgba(255,255,255,0.4) !important; color: ${INK0} !important; }
        .ghost-btn { transition: border-color 0.2s, color 0.2s; }
        section { position: relative; }
      `}</style>

      {/* ══ NAVBAR ══ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", height: "64px",
        background: "rgba(5,7,13,0.85)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: COURT, boxShadow: `0 0 10px ${COURT}`, display: "inline-block", animation: "dot-pulse 2s ease-in-out infinite" }} />
          <span style={{ fontFamily: DISP, fontSize: "13px", letterSpacing: "0.1em", color: INK0, textTransform: "uppercase" }}>SMASH PADEL CARD</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          {[["Jugadores", "/dashboard/jugadores"], ["Clubes", "/clubs"], ["Ligas", "/ligas"], ["Torneos", "/torneos"], ["Mercado", "/mercado"]].map(([label, href]) => (
            <Link key={href} href={href} style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={undefined} className="ghost-btn" >
              {label}
            </Link>
          ))}
          <Link href="/login" style={{
            padding: "8px 20px", borderRadius: "8px",
            background: `linear-gradient(90deg, ${COURT}, ${BALL})`,
            color: BG0, fontFamily: MONO, fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.08em", textDecoration: "none",
          }}>
            Entrar →
          </Link>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        paddingTop: "64px", overflow: "hidden",
      }}>
        {/* Fondo */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `radial-gradient(ellipse 80% 60% at 50% 20%, rgba(46,230,193,0.22), transparent 60%), radial-gradient(ellipse 60% 40% at 80% 70%, rgba(255,79,216,0.14), transparent 70%), radial-gradient(ellipse 50% 40% at 20% 60%, rgba(79,240,255,0.12), transparent 70%), linear-gradient(180deg, #0a1320 0%, ${BG0} 100%)` }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)`, backgroundSize: "80px 80px", WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%)", maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%)", animation: "gridPan 6s linear infinite" }} />

        <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "0 24px", maxWidth: "820px" }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "999px", background: `${COURT}14`, border: `1px solid ${COURT}33`, marginBottom: "32px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COURT, display: "inline-block", animation: "dot-pulse 2s ease-in-out infinite" }} />
            <span style={{ fontFamily: MONO, fontSize: "10px", color: COURT, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Comunidad colombiana de pádel · Season One 2025/26
            </span>
          </div>

          {/* Título */}
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(44px, 8vw, 88px)", lineHeight: 0.9, margin: "0 0 28px", letterSpacing: "-0.03em", color: INK0 }}>
            El pádel colombiano<br />
            <em style={{ fontStyle: "normal", background: `linear-gradient(135deg, #4ff0ff, ${COURT}, ${BALL})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
              en una sola carta
            </em>
          </h1>

          {/* Descripción */}
          <p style={{ fontFamily: MONO, fontSize: "15px", color: INK1, lineHeight: 1.9, letterSpacing: "0.03em", margin: "0 0 48px", maxWidth: "580px", marginLeft: "auto", marginRight: "auto" }}>
            Encuentra jugadores, clubes, ligas y torneos en todo Colombia.
            Crea tu CARD personalizada y forma parte de la comunidad.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" className="cta-btn" style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "15px 40px", borderRadius: "12px", background: `linear-gradient(90deg, ${COURT}, ${BALL})`, color: BG0, fontFamily: MONO, fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", boxShadow: `0 0 40px ${COURT}44` }}>
              Crear mi CARD gratis →
            </Link>
            <Link href="/dashboard/jugadores" className="ghost-btn" style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "15px 32px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.15)", color: INK2, fontFamily: MONO, fontSize: "13px", letterSpacing: "0.08em", textDecoration: "none" }}>
              Ver jugadores
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: "48px", justifyContent: "center", marginTop: "64px", flexWrap: "wrap" }}>
            {[["CARDs", "activas"], ["Ciudades", "de Colombia"], ["Torneos", "esta temporada"]].map(([num, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: DISP, fontSize: "28px", color: INK0, letterSpacing: "-0.02em" }}>—</div>
                <div style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "4px" }}>{num} {label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Card flotante decorativa */}
        <div style={{ position: "absolute", right: "5vw", top: "50%", transform: "translateY(-50%)", animation: "float 6s ease-in-out infinite", zIndex: 5, opacity: 0.18, pointerEvents: "none" }}>
          <div className="card-glow" style={{ width: "180px", height: "288px", borderRadius: "18px", padding: "3px", background: `conic-gradient(from var(--border-angle), #4ff0ff, #2ee6c1, #d6ff3d, #ffd24f, #ff4fd8, #a26bff, #4ff0ff)` }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "15px", background: "#0b1025" }} />
          </div>
        </div>
        <div style={{ position: "absolute", left: "5vw", top: "55%", transform: "translateY(-50%)", animation: "float 8s ease-in-out infinite reverse", zIndex: 5, opacity: 0.12, pointerEvents: "none" }}>
          <div className="card-glow" style={{ width: "130px", height: "208px", borderRadius: "14px", padding: "3px", background: `conic-gradient(from var(--border-angle), #4ff0ff, #2ee6c1, #d6ff3d, #ffd24f, #ff4fd8, #a26bff, #4ff0ff)` }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "11px", background: "#0b1025" }} />
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section style={{ padding: "120px 40px", maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header sección */}
        <div style={{ textAlign: "center", marginBottom: "72px" }}>
          <div style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
            Todo en un solo lugar
            <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
          </div>
          <h2 style={{ fontFamily: DISP, fontSize: "clamp(32px, 5vw, 52px)", color: INK0, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            La plataforma completa<br />
            <span style={{ color: INK2, fontFamily: MONO, fontSize: "clamp(14px, 2vw, 18px)", letterSpacing: "0.04em", fontWeight: 400 }}>para jugadores de pádel en Colombia</span>
          </h2>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card" style={{ padding: "32px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", transition: "border-color 0.2s, background 0.2s" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `${f.color}18`, border: `1px solid ${f.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: f.color, marginBottom: "20px" }}>
                {f.icon}
              </div>
              <h3 style={{ fontFamily: DISP, fontSize: "20px", color: INK0, margin: "0 0 12px", letterSpacing: "-0.01em" }}>{f.title}</h3>
              <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, lineHeight: 1.8, margin: 0, letterSpacing: "0.04em" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ CÓMO FUNCIONA ══ */}
      <section style={{ padding: "120px 40px", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "72px" }}>
            <div style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
              Proceso
              <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
            </div>
            <h2 style={{ fontFamily: DISP, fontSize: "clamp(32px, 5vw, 52px)", color: INK0, margin: 0, letterSpacing: "-0.02em" }}>
              Empieza en minutos
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "32px" }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ position: "relative" }}>
                {/* Línea conectora */}
                {i < STEPS.length - 1 && (
                  <div style={{ position: "absolute", top: "20px", left: "calc(100% + 16px)", width: "calc(100% - 32px)", height: "1px", background: `linear-gradient(90deg, ${COURT}44, transparent)`, display: "none" }} />
                )}
                <div style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.2em", marginBottom: "12px" }}>{s.num}</div>
                <h4 style={{ fontFamily: DISP, fontSize: "18px", color: INK0, margin: "0 0 10px" }}>{s.title}</h4>
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, lineHeight: 1.8, margin: 0, letterSpacing: "0.03em" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CARD SHOWCASE ══ */}
      <section style={{ padding: "120px 40px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "80px", flexWrap: "wrap" }}>
          {/* Texto */}
          <div style={{ flex: 1, minWidth: "280px" }}>
            <div style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
              Tu identidad digital
            </div>
            <h2 style={{ fontFamily: DISP, fontSize: "clamp(32px, 5vw, 52px)", color: INK0, margin: "0 0 24px", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              Una CARD que<br />te representa
            </h2>
            <p style={{ fontFamily: MONO, fontSize: "13px", color: INK2, lineHeight: 1.9, margin: "0 0 32px", letterSpacing: "0.04em" }}>
              Tu carta personalizada incluye tu foto, nombre, categoría, posición en la cancha, paleta, zapatillas, torneos jugados y tu ranking en la liga. Es tu tarjeta de presentación en el pádel colombiano.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {["Foto de perfil personalizada", "Categoría y posición (Drive / Revés)", "Historial de torneos y rankings", "Paleta y equipamiento favorito", "Perfil público compartible"].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COURT, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontFamily: MONO, fontSize: "12px", color: INK1, letterSpacing: "0.04em" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card decorativa */}
          <div style={{ flex: 0, display: "flex", alignItems: "center", justifyContent: "center", animation: "float 7s ease-in-out infinite" }}>
            <div className="card-glow" style={{ width: "260px", height: "416px", borderRadius: "22px", padding: "4px", background: `conic-gradient(from var(--border-angle), #4ff0ff, #2ee6c1, #d6ff3d, #ffd24f, #ff4fd8, #a26bff, #4ff0ff)`, boxShadow: "0 40px 80px -20px rgba(79,240,255,0.25), 0 20px 60px -10px rgba(255,79,216,0.2)" }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "18px", background: "radial-gradient(ellipse 100% 60% at 50% 0%, #1a2542 0%, #0b1025 50%, #05070f 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "20px", position: "relative", overflow: "hidden" }}>
                {/* Watermark */}
                <div aria-hidden style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-around", padding: "14px 0", fontFamily: DISP, fontSize: "24px", letterSpacing: "0.1em", whiteSpace: "nowrap", overflow: "hidden", opacity: 0.06, color: INK0 }}>
                  {Array.from({ length: 8 }).map((_, i) => <span key={i} style={{ display: "block", transform: i % 2 ? "translateX(-30%)" : "translateX(-10%)" }}>PÁDEL · PÁDEL · PÁDEL · PÁDEL</span>)}
                </div>
                {/* Foto placeholder */}
                <div style={{ position: "absolute", top: "35px", left: 0, right: 0, height: "58%", background: "radial-gradient(circle at 50% 30%, rgba(46,230,193,0.25), transparent 60%), linear-gradient(180deg, #1a2a4a 0%, #0b1224 100%)" }} />
                {/* Nombre */}
                <div style={{ position: "relative", zIndex: 5, textAlign: "center" }}>
                  <p style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", color: INK1, margin: "0 0 4px" }}>TU NOMBRE</p>
                  <h3 style={{ fontFamily: DISP, fontSize: "30px", lineHeight: 0.9, margin: "0 0 6px", letterSpacing: "-0.01em", color: INK0 }}>APELLIDO</h3>
                  <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.4em", textTransform: "uppercase", color: COURT, margin: 0 }}>DRIVE</p>
                </div>
                <div style={{ position: "relative", zIndex: 5, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
                  <span style={{ fontFamily: MONO, fontSize: "10px", color: INK1, letterSpacing: "0.15em" }}>2025-26</span>
                  <span style={{ fontFamily: DISP, fontSize: "8px", letterSpacing: "0.12em", color: "#ffd24f", padding: "4px 10px", border: "1px solid rgba(255,210,79,0.4)", borderRadius: "4px" }}>TU CATEGORÍA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ══ */}
      <section style={{ padding: "120px 40px", textAlign: "center", background: `radial-gradient(ellipse 60% 60% at 50% 50%, rgba(46,230,193,0.1), transparent 70%)`, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <div style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
            Únete ahora
            <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
          </div>
          <h2 style={{ fontFamily: DISP, fontSize: "clamp(36px, 6vw, 64px)", color: INK0, margin: "0 0 24px", letterSpacing: "-0.02em", lineHeight: 1 }}>
            ¿Listo para estar<br />en el mapa del pádel?
          </h2>
          <p style={{ fontFamily: MONO, fontSize: "13px", color: INK2, lineHeight: 1.8, margin: "0 0 48px", letterSpacing: "0.04em" }}>
            Regístrate gratis, crea tu CARD y empieza a conectar con la comunidad de pádel más grande de Colombia.
          </p>
          <Link href="/login" className="cta-btn" style={{ display: "inline-flex", alignItems: "center", gap: "12px", padding: "16px 48px", borderRadius: "14px", background: `linear-gradient(90deg, ${COURT}, ${BALL})`, color: BG0, fontFamily: MONO, fontSize: "14px", fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", boxShadow: `0 0 60px ${COURT}44` }}>
            Crear mi CARD gratis →
          </Link>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, marginTop: "20px", letterSpacing: "0.08em" }}>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" style={{ color: COURT, textDecoration: "none" }}>Inicia sesión</Link>
          </p>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: COURT, boxShadow: `0 0 8px ${COURT}`, display: "inline-block" }} />
          <span style={{ fontFamily: DISP, fontSize: "12px", letterSpacing: "0.1em", color: INK0, textTransform: "uppercase" }}>SMASH PADEL CARD</span>
        </div>
        <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
          {[["Jugadores", "/dashboard/jugadores"], ["Clubes", "/clubs"], ["Ligas", "/ligas"], ["Torneos", "/torneos"], ["Mercado", "/mercado"]].map(([label, href]) => (
            <Link key={href} href={href} style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none" }}>{label}</Link>
          ))}
        </div>
        <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.1em" }}>© 2025 Smash Padel Card · Colombia</span>
      </footer>
    </main>
  );
}
