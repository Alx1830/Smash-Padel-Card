import Link from "next/link";
import { HeroSwiper } from "@/components/HeroSwiper";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const FEATURES = [
  { icon: "⬡", color: COURT,     title: "Tu Facebinder digital",       desc: "Crea tu perfil de coleccionista con foto, set favorito, Pokémon favorito y toda tu identidad TCG en una carta personalizada." },
  { icon: "◉", color: "#a26bff", title: "Inventario completo",          desc: "Lleva el control exacto de cada carta. Marca Normal, Reverse Holo y Holofoil y visualiza tu progreso por set en tiempo real." },
  { icon: "◈", color: "#4ff0ff", title: "Market de cartas",             desc: "Publica las cartas que te sobran y véndelas a coleccionistas de tu país. Contacto directo por WhatsApp, sin intermediarios." },
  { icon: "⊕", color: "#ff4fd8", title: "Comunidad de coleccionistas",  desc: "Sigue a otros coleccionistas, mira sus inventarios, descubre qué sets están completando y conecta con la comunidad." },
  { icon: "◬", color: "#ffd24f", title: "Progreso visual",              desc: "Barra de progreso por set en tu perfil público: únicas / total de cartas, cantidad en inventario y porcentaje completado." },
  { icon: "◇", color: BALL,      title: "Precios TCGPlayer",            desc: "Consulta el precio de referencia de cada carta en TCGPlayer directamente desde el market sin salir de la plataforma." },
];

const STEPS = [
  { num: "01", title: "Crea tu cuenta",        desc: "Regístrate con Google en segundos. Sin formularios largos." },
  { num: "02", title: "Arma tu perfil",         desc: "Agrega tu foto, set favorito, energía, Pokémon favorito y más." },
  { num: "03", title: "Registra tu inventario", desc: "Marca cada carta que tienes: Normal, Reverse Holo o Holofoil." },
  { num: "04", title: "Vende tus cartas",        desc: "Publica lo que te sobra con tu precio en COP y recibe compradores por WhatsApp." },
  { num: "05", title: "Conecta con otros",       desc: "Sigue coleccionistas, compara progresos y completa tu Master Set." },
];

const MARKET_FEATURES = [
  { label: "Publica en segundos",     desc: "Agrega una carta a la venta desde tu inventario con solo unos toques." },
  { label: "Precio en COP",           desc: "Pon tu precio en pesos colombianos. Sin conversiones ni complicaciones." },
  { label: "Contacto por WhatsApp",   desc: "Los compradores te contactan directamente. Sin pagos dentro de la plataforma." },
  { label: "Filtros inteligentes",    desc: "Busca por nombre, variante, set, rango de precio y ciudad." },
  { label: "Precio TCGPlayer",        desc: "Consulta el precio de referencia de mercado antes de comprar o vender." },
  { label: "Por ciudad y país",       desc: "Filtra vendedores cerca de ti. Disponible en más de 30 países de Latinoamérica." },
];

export default function LandingPage() {
  return (
    <main style={{ background: BG0, color: INK0, overflowX: "hidden" }}>
      <style>{`
        @keyframes gridPan  { from { background-position: 0 0; } to { background-position: 80px 80px; } }
        @keyframes float    { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        @keyframes marquee  { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .feature-card:hover { border-color: rgba(255,255,255,0.18) !important; background: rgba(255,255,255,0.05) !important; }
        .mkt-feat:hover     { background: rgba(46,230,193,0.06) !important; border-color: rgba(46,230,193,0.2) !important; }
        .cta-btn   { transition: opacity 0.2s, transform 0.2s; }
        .cta-btn:hover   { opacity: 0.88; transform: translateY(-2px); }
        .ghost-btn { transition: border-color 0.2s, color 0.2s; }
        .ghost-btn:hover { border-color: rgba(255,255,255,0.4) !important; color: ${INK0} !important; }
        @media (max-width: 767px) {
          .hero-grid        { flex-direction: column !important; align-items: center !important; padding: 60px 24px 64px !important; gap: 40px !important; }
          .hero-text        { max-width: 100% !important; text-align: center !important; }
          .hero-btns        { justify-content: center !important; flex-direction: column !important; align-items: center !important; }
          .hero-swiper      { display: flex; justify-content: center; width: 100%; }
          .features-section { padding: 64px 20px !important; }
          .market-section   { padding: 64px 20px !important; }
          .steps-section    { padding: 64px 20px !important; }
          .cta-section      { padding: 64px 20px !important; }
          .footer-section   { padding: 28px 20px !important; flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
          .mkt-inner        { flex-direction: column !important; gap: 40px !important; }
          .steps-grid       { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ══ HERO ══ */}
      <section style={{ paddingTop: "64px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `radial-gradient(ellipse 70% 60% at 20% 50%, rgba(46,230,193,0.18), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 60%, rgba(255,79,216,0.12), transparent 70%), linear-gradient(180deg, #0a1320 0%, ${BG0} 100%)` }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`, backgroundSize: "80px 80px", animation: "gridPan 4s linear infinite" }} />

        <div className="hero-grid" style={{ position: "relative", zIndex: 10, maxWidth: "1200px", margin: "0 auto", padding: "80px 40px 100px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "64px" }}>
          <div className="hero-text" style={{ flex: 1, maxWidth: "560px" }}>
            <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <span style={{ width: "18px", height: "1px", background: COURT, display: "inline-block" }} />
              Binder digital Pokémon TCG
            </div>

            <h1 style={{ fontFamily: DISP, fontSize: "clamp(44px, 6vw, 80px)", lineHeight: 0.92, margin: "0 0 28px", letterSpacing: "-0.03em", color: INK0 }}>
              Colecciona,<br />comparte
              <em style={{ fontStyle: "normal", display: "block", background: `linear-gradient(135deg, #4ff0ff, ${COURT}, ${BALL})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
                y vende.
              </em>
            </h1>

            <p style={{ fontFamily: MONO, fontSize: "14px", color: INK1, lineHeight: 1.9, letterSpacing: "0.03em", margin: "0 0 40px" }}>
              Lleva el control de cada carta de tu binder. Conecta con coleccionistas Pokémon. Publica y vende las cartas que te sobran directo por WhatsApp.
            </p>

            <div className="hero-btns" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <Link href="/login" className="cta-btn" style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "14px 36px", borderRadius: "12px", background: `linear-gradient(90deg, ${COURT}, ${BALL})`, color: BG0, fontFamily: MONO, fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", boxShadow: `0 0 40px ${COURT}33` }}>
                Crear mi Facebinder →
              </Link>
              <Link href="/market" className="ghost-btn" style={{ display: "inline-flex", alignItems: "center", padding: "14px 28px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.15)", color: INK2, fontFamily: MONO, fontSize: "13px", letterSpacing: "0.08em", textDecoration: "none" }}>
                Ver el Market →
              </Link>
            </div>

            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, marginTop: "20px", letterSpacing: "0.08em" }}>
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" style={{ color: COURT, textDecoration: "none" }}>Inicia sesión</Link>
            </p>
          </div>

          <div className="hero-swiper" style={{ flexShrink: 0, animation: "float 7s ease-in-out infinite" }}>
            <HeroSwiper />
          </div>
        </div>
      </section>

      {/* ══ MARQUEE STRIP ══ */}
      <div style={{ overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 0", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ display: "flex", width: "max-content", animation: "marquee 30s linear infinite" }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "40px", padding: "0 32px", whiteSpace: "nowrap", fontFamily: MONO, fontSize: "11px", letterSpacing: "0.2em", color: INK2, textTransform: "uppercase" }}>
              <span style={{ color: COURT }}>✦</span><span>Pokémon TCG</span>
              <span style={{ color: COURT }}>✦</span><span>Binder Digital</span>
              <span style={{ color: COURT }}>✦</span><span>Market de cartas</span>
              <span style={{ color: COURT }}>✦</span><span>+30 países</span>
              <span style={{ color: COURT }}>✦</span><span>Comunidad TCG</span>
              <span style={{ color: COURT }}>✦</span><span>Vende tus cartas</span>
              <span style={{ color: COURT }}>✦</span><span>Reverse Holo</span>
              <span style={{ color: COURT }}>✦</span><span>Holofoil</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FEATURES ══ */}
      <section className="features-section" style={{ padding: "120px 40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "72px" }}>
            <div style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
              Todo en un solo lugar
              <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
            </div>
            <h2 style={{ fontFamily: DISP, fontSize: "clamp(32px, 5vw, 52px)", color: INK0, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              La plataforma completa<br />
              <span style={{ color: INK2, fontFamily: MONO, fontSize: "clamp(13px, 2vw, 16px)", letterSpacing: "0.04em", fontWeight: 400 }}>para coleccionistas de Pokémon TCG</span>
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

      {/* ══ MARKET SHOWCASE ══ */}
      <section className="market-section" style={{ padding: "120px 40px", background: "rgba(46,230,193,0.025)", borderTop: "1px solid rgba(46,230,193,0.08)", borderBottom: "1px solid rgba(46,230,193,0.08)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontFamily: DISP, fontSize: "clamp(100px, 20vw, 220px)", fontWeight: 900, color: "transparent", WebkitTextStroke: `1px rgba(46,230,193,0.05)`, whiteSpace: "nowrap", pointerEvents: "none", userSelect: "none", letterSpacing: "-0.05em" }}>
          MARKET
        </div>

        <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative" }}>
          <div style={{ marginBottom: "64px" }}>
            <div style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
              Market de cartas
            </div>
            <div className="mkt-inner" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: DISP, fontSize: "clamp(32px, 5vw, 56px)", color: INK0, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
                Vende tus cartas<br />
                <em style={{ fontStyle: "normal", background: `linear-gradient(135deg, ${COURT}, ${BALL})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>directamente.</em>
              </h2>
              <Link href="/market" className="cta-btn" style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "13px 28px", borderRadius: "12px", background: `linear-gradient(90deg, ${COURT}, ${BALL})`, color: BG0, fontFamily: MONO, fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", flexShrink: 0 }}>
                Ir al Market →
              </Link>
            </div>
            <p style={{ fontFamily: MONO, fontSize: "13px", color: INK2, lineHeight: 1.8, margin: "20px 0 0", letterSpacing: "0.03em", maxWidth: "560px" }}>
              ¿Tienes cartas que no usas? Publícalas en segundos y conecta con compradores de tu país directamente por WhatsApp. Sin comisiones, sin plataforma de pagos — solo coleccionistas.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {MARKET_FEATURES.map(f => (
              <div key={f.label} className="mkt-feat" style={{ padding: "22px 24px", borderRadius: "14px", border: "1px solid rgba(46,230,193,0.1)", background: "rgba(46,230,193,0.03)", transition: "all 0.2s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COURT, flexShrink: 0, display: "inline-block" }} />
                  <span style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.1em", textTransform: "uppercase" }}>{f.label}</span>
                </div>
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, lineHeight: 1.7, margin: 0, letterSpacing: "0.03em" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CÓMO FUNCIONA ══ */}
      <section className="steps-section" style={{ padding: "120px 40px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
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
          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "32px" }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ position: "relative" }}>
                {i < STEPS.length - 1 && (
                  <div style={{ position: "absolute", top: "7px", left: "calc(100% - 16px)", width: "32px", height: "1px", background: `linear-gradient(90deg, ${COURT}60, transparent)`, display: "none" }} className="step-connector" />
                )}
                <div style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.2em", marginBottom: "12px" }}>{s.num}</div>
                <h4 style={{ fontFamily: DISP, fontSize: "17px", color: INK0, margin: "0 0 10px" }}>{s.title}</h4>
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, lineHeight: 1.8, margin: 0, letterSpacing: "0.03em" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ══ */}
      <section className="cta-section" style={{ padding: "120px 40px", textAlign: "center", background: `radial-gradient(ellipse 60% 60% at 50% 50%, rgba(46,230,193,0.08), transparent 70%)` }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <div style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
            Únete ahora
            <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
          </div>
          <h2 style={{ fontFamily: DISP, fontSize: "clamp(36px, 6vw, 64px)", color: INK0, margin: "0 0 24px", letterSpacing: "-0.02em", lineHeight: 1 }}>
            ¿Listo para armar<br />tu colección?
          </h2>
          <p style={{ fontFamily: MONO, fontSize: "13px", color: INK2, lineHeight: 1.8, margin: "0 0 16px", letterSpacing: "0.04em" }}>
            Regístrate gratis, crea tu Facebinder y empieza a conectar con la comunidad de coleccionistas Pokémon TCG.
          </p>
          <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, lineHeight: 1.8, margin: "0 0 48px", letterSpacing: "0.04em" }}>
            ¿Tienes cartas que no usas?{" "}
            <Link href="/market" style={{ color: COURT, textDecoration: "none" }}>Mira el Market →</Link>
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" className="cta-btn" style={{ display: "inline-flex", alignItems: "center", gap: "12px", padding: "16px 48px", borderRadius: "14px", background: `linear-gradient(90deg, ${COURT}, ${BALL})`, color: BG0, fontFamily: MONO, fontSize: "14px", fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", boxShadow: `0 0 60px ${COURT}44` }}>
              Crear mi Facebinder gratis →
            </Link>
            <Link href="/market" className="ghost-btn" style={{ display: "inline-flex", alignItems: "center", padding: "16px 28px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.15)", color: INK2, fontFamily: MONO, fontSize: "13px", letterSpacing: "0.08em", textDecoration: "none" }}>
              Ver el Market
            </Link>
          </div>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, marginTop: "20px", letterSpacing: "0.08em" }}>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" style={{ color: COURT, textDecoration: "none" }}>Inicia sesión</Link>
          </p>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="footer-section" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <span style={{ fontFamily: DISP, fontSize: "13px", letterSpacing: "0.1em", color: INK0, textTransform: "uppercase" }}>FACEBINDER</span>
        <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
          {[["Market", "/market"], ["Inventario", "/dashboard/inventario"], ["Amigos", "/dashboard/amigos"], ["Mi perfil", "/dashboard"]].map(([label, href]) => (
            <Link key={href} href={href} style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none" }}>{label}</Link>
          ))}
        </div>
        <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.1em" }}>
          © 2025 Facebinder · Pokémon TCG · Diseñado por{" "}
          <a href="https://adxmedialab.com" target="_blank" rel="noopener noreferrer" style={{ color: COURT, textDecoration: "none" }}>AdxMediaLab</a>
        </span>
      </footer>
    </main>
  );
}
