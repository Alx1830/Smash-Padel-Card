import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlayerCard3D } from "@/components/PlayerCard3D";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const FEATURES = [
  { icon: "◉", color: COURT,    title: "Tu CARD personalizada",   desc: "Cada jugador tiene una carta coleccionable con su foto, categoría, posición, paleta, historial de torneos y más. Tu identidad en el pádel colombiano." },
  { icon: "⊕", color: "#a26bff", title: "Encuentra jugadores",     desc: "Busca compañeros o rivales por ciudad, categoría y posición. Sigue a jugadores, mira su perfil y conecta con la comunidad." },
  { icon: "⬡", color: BALL,     title: "Clubes por ciudad",        desc: "Explora todos los clubes de pádel del país. Descubre canchas, horarios y la comunidad de cada club cerca a ti." },
  { icon: "◈", color: "#ff4fd8", title: "Ligas y torneos",          desc: "Consulta las ligas activas en cada ciudad, inscríbete a torneos y sigue los rankings de la temporada en tiempo real." },
  { icon: "◬", color: "#ffd24f", title: "Mercado de pádel",         desc: "Compra y vende equipamiento nuevo o usado: palas, zapatillas, paleteros y más. Todo dentro de la misma comunidad." },
  { icon: "◇", color: "#4ff0ff", title: "Comunidad colombiana",     desc: "La primera plataforma dedicada 100% al pádel colombiano. Rankings, perfiles, historia y pasión por el deporte." },
];

const STEPS = [
  { num: "01", title: "Crea tu cuenta",      desc: "Regístrate con Google en segundos. Sin formularios largos." },
  { num: "02", title: "Completa tu perfil",  desc: "Agrega tu foto, posición, paleta favorita y toda tu información de jugador." },
  { num: "03", title: "Obtén tu CARD",       desc: "Tu carta personalizada se genera automáticamente y puedes compartirla." },
  { num: "04", title: "Únete a la liga",     desc: "Inscríbete en torneos, sigue a otros jugadores y sube en el ranking." },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: fetched } = await supabase
    .from("players")
    .select("username, first_name, last_name, pais, tipo_perfil, energia_favorita, photo_url")
    .ilike("username", "alx1830")
    .maybeSingle();

  const featured = fetched ?? {
    username: "ALX1830",
    first_name: "Alexis",
    last_name: "Torres",
    pais: "Colombia",
    tipo_perfil: "Coleccionista",
    energia_favorita: "⚡ Eléctrica/Rayo",
    photo_url: null,
  };

  return (
    <main style={{ background: BG0, color: INK0, overflowX: "hidden" }}>
      <style>{`
        @keyframes gridPan {
          from { background-position: 0 0; }
          to   { background-position: 80px 80px; }
        }
        @keyframes dot-pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        @keyframes border-spin { to { --border-angle: 360deg; } }
        @property --border-angle { syntax:"<angle>"; inherits:false; initial-value:0deg; }
        .card-glow { animation: border-spin 4s linear infinite; }
        .feature-card:hover { border-color: rgba(255,255,255,0.18) !important; background: rgba(255,255,255,0.05) !important; }
        .cta-btn { transition: opacity 0.2s, transform 0.2s; }
        .cta-btn:hover { opacity: 0.88; transform: translateY(-2px); }
        .ghost-btn { transition: border-color 0.2s, color 0.2s; }
        .ghost-btn:hover { border-color: rgba(255,255,255,0.4) !important; color: ${INK0} !important; }
        .nav-link { transition: color 0.2s; }
        .nav-link:hover { color: ${INK0} !important; }
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
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          {[["Jugadores", "/dashboard/jugadores"], ["Clubes", "/clubs"], ["Ligas", "/ligas"], ["Torneos", "/torneos"], ["Mercado", "/mercado"]].map(([label, href]) => (
            <Link key={href} href={href} className="nav-link" style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>
              {label}
            </Link>
          ))}
          <Link href="/login" style={{ padding: "8px 20px", borderRadius: "8px", background: `linear-gradient(90deg, ${COURT}, ${BALL})`, color: BG0, fontFamily: MONO, fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none" }}>
            Entrar →
          </Link>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section style={{ paddingTop: "64px", position: "relative", overflow: "hidden" }}>
        {/* Fondo degradado */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `radial-gradient(ellipse 70% 60% at 20% 50%, rgba(46,230,193,0.18), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 60%, rgba(255,79,216,0.12), transparent 70%), linear-gradient(180deg, #0a1320 0%, ${BG0} 100%)` }} />

        {/* Grid animado — sin máscara para que el movimiento sea visible */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          animation: "gridPan 4s linear infinite",
        }} />

        {/* Contenido en dos columnas */}
        <div style={{
          position: "relative", zIndex: 10,
          maxWidth: "1200px", margin: "0 auto", padding: "80px 40px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "64px",
        }}>
          {/* Columna izquierda — texto */}
          <div style={{ flex: 1, maxWidth: "560px" }}>
            <h1 style={{ fontFamily: DISP, fontSize: "clamp(44px, 6vw, 80px)", lineHeight: 0.92, margin: "0 0 28px", letterSpacing: "-0.03em", color: INK0, textAlign: "left" }}>
              El pádel colombiano<br />
              <em style={{ fontStyle: "normal", background: `linear-gradient(135deg, #4ff0ff, ${COURT}, ${BALL})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
                en una sola carta
              </em>
            </h1>

            <p style={{ fontFamily: MONO, fontSize: "14px", color: INK1, lineHeight: 1.9, letterSpacing: "0.03em", margin: "0 0 40px", textAlign: "left" }}>
              Encuentra jugadores, clubes, ligas y torneos en todo Colombia.
              Crea tu CARD personalizada y forma parte de la comunidad.
            </p>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <Link href="/login" className="cta-btn" style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "14px 36px", borderRadius: "12px", background: `linear-gradient(90deg, ${COURT}, ${BALL})`, color: BG0, fontFamily: MONO, fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", boxShadow: `0 0 40px ${COURT}33` }}>
                Crear mi CARD gratis →
              </Link>
              <Link href="/dashboard/jugadores" className="ghost-btn" style={{ display: "inline-flex", alignItems: "center", padding: "14px 28px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.15)", color: INK2, fontFamily: MONO, fontSize: "13px", letterSpacing: "0.08em", textDecoration: "none" }}>
                Ver jugadores
              </Link>
            </div>

            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, marginTop: "20px", letterSpacing: "0.08em" }}>
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" style={{ color: COURT, textDecoration: "none" }}>Inicia sesión</Link>
            </p>
          </div>

          {/* Columna derecha — card de ALX1830 */}
          <div style={{ flexShrink: 0, animation: "float 7s ease-in-out infinite" }}>
            <PlayerCard3D
              username={featured.username}
              firstName={featured.first_name ?? ""}
              lastName={featured.last_name ?? ""}
              category={featured.pais ?? "—"}
              position={featured.tipo_perfil ?? "—"}
              energiaFavorita={featured.energia_favorita ?? "—"}
              photoUrl={featured.photo_url || undefined}
            />
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section style={{ padding: "120px 40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "72px" }}>
            <div style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
              Todo en un solo lugar
              <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
            </div>
            <h2 style={{ fontFamily: DISP, fontSize: "clamp(32px, 5vw, 52px)", color: INK0, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              La plataforma completa<br />
              <span style={{ color: INK2, fontFamily: MONO, fontSize: "clamp(13px, 2vw, 16px)", letterSpacing: "0.04em", fontWeight: 400 }}>para jugadores de pádel en Colombia</span>
            </h2>
          </div>
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
            <h2 style={{ fontFamily: DISP, fontSize: "clamp(32px, 5vw, 52px)", color: INK0, margin: 0, letterSpacing: "-0.02em" }}>Empieza en minutos</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "40px" }}>
            {STEPS.map(s => (
              <div key={s.num}>
                <div style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.2em", marginBottom: "12px" }}>{s.num}</div>
                <h4 style={{ fontFamily: DISP, fontSize: "18px", color: INK0, margin: "0 0 10px" }}>{s.title}</h4>
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, lineHeight: 1.8, margin: 0, letterSpacing: "0.03em" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ══ */}
      <section style={{ padding: "120px 40px", textAlign: "center", background: `radial-gradient(ellipse 60% 60% at 50% 50%, rgba(46,230,193,0.08), transparent 70%)`, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
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
