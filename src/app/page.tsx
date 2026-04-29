"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { ImageSwiper } from "@/components/ui/image-swiper";
import { PERFECT_ORDER_CARDS } from "@/data/pokemon-cards";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const FEATURES = [
  { icon: "⬡", color: COURT,    title: "Tu Facebinder digital",    desc: "Crea tu perfil de coleccionista con tu foto, set favorito, Pokémon favorito, energía y toda tu identidad TCG en una carta personalizada." },
  { icon: "◉", color: "#a26bff", title: "Inventario de cartas",     desc: "Lleva el control exacto de cada carta que tienes. Marca normales, Reverse Holo y Holofoil y visualiza tu progreso por set en tiempo real." },
  { icon: "⊕", color: "#ff4fd8", title: "Comunidad de coleccionistas", desc: "Sigue a otros coleccionistas, mira sus inventarios, descubre qué sets están completando y conecta con la comunidad Pokémon TCG." },
  { icon: "◈", color: "#4ff0ff", title: "Sets Pokémon TCG",         desc: "Explora todos los sets y series de Pokémon TCG. Desde sets clásicos hasta los más recientes, organizados por serie con logos y datos." },
  { icon: "◬", color: "#ffd24f", title: "Market (próximamente)",    desc: "Compra y vende cartas directamente dentro de la comunidad. Publica lo que tienes de más y consigue las que te faltan." },
  { icon: "◇", color: BALL,     title: "Progreso visual",           desc: "Barra de progreso por set en tu perfil público: únicas / total de cartas, cantidad en inventario y porcentaje completado." },
];

const STEPS = [
  { num: "01", title: "Crea tu cuenta",        desc: "Regístrate con Google en segundos. Sin formularios largos." },
  { num: "02", title: "Arma tu perfil",         desc: "Agrega tu foto, set favorito, energía, Pokémon favorito y más." },
  { num: "03", title: "Arma tu inventario",     desc: "Marca cada carta que tienes con sus versiones: Normal, RH o Holo." },
  { num: "04", title: "Conecta con otros",      desc: "Sigue coleccionistas, compara progresos y completa tu Master Set." },
];

export default function LandingPage() {
  const STABLE_TEN = PERFECT_ORDER_CARDS.slice(0, 10).map(c => c.image).join(",");
  const [randomTen, setRandomTen] = useState(STABLE_TEN);
  useEffect(() => {
    const shuffled = [...PERFECT_ORDER_CARDS].sort(() => Math.random() - 0.5);
    setRandomTen(shuffled.slice(0, 10).map(c => c.image).join(","));
  }, []);

  return (
    <main style={{ background: BG0, color: INK0, overflowX: "hidden" }}>
      <style>{`
        @keyframes gridPan { from { background-position: 0 0; } to { background-position: 80px 80px; } }
        @keyframes float   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        .feature-card:hover { border-color: rgba(255,255,255,0.18) !important; background: rgba(255,255,255,0.05) !important; }
        .cta-btn  { transition: opacity 0.2s, transform 0.2s; }
        .cta-btn:hover  { opacity: 0.88; transform: translateY(-2px); }
        .ghost-btn { transition: border-color 0.2s, color 0.2s; }
        .ghost-btn:hover { border-color: rgba(255,255,255,0.4) !important; color: ${INK0} !important; }
        @media (max-width: 767px) {
          .hero-grid   { flex-direction: column !important; align-items: center !important; padding: 60px 24px 64px !important; gap: 40px !important; }
          .hero-text   { max-width: 100% !important; text-align: center !important; }
          .hero-btns   { justify-content: center !important; flex-direction: column !important; align-items: center !important; }
          .hero-swiper { display: flex; justify-content: center; width: 100%; }
          .features-section { padding: 64px 20px !important; }
          .steps-section    { padding: 64px 20px !important; }
          .cta-section      { padding: 64px 20px !important; }
          .footer-section   { padding: 28px 20px !important; flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
        }
      `}</style>

      <Navbar />

      {/* ══ HERO ══ */}
      <section style={{ paddingTop: "64px", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: `
            radial-gradient(ellipse 70% 60% at 20% 50%, rgba(46,230,193,0.18), transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 60%, rgba(255,79,216,0.12), transparent 70%),
            linear-gradient(180deg, #0a1320 0%, ${BG0} 100%)
          `,
        }} />
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          animation: "gridPan 4s linear infinite",
        }} />

        <div className="hero-grid" style={{
          position: "relative", zIndex: 10,
          maxWidth: "1200px", margin: "0 auto", padding: "80px 40px 100px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "64px",
        }}>
          {/* Texto */}
          <div className="hero-text" style={{ flex: 1, maxWidth: "560px" }}>
            <div style={{
              fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em",
              textTransform: "uppercase", color: COURT,
              display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "20px",
            }}>
              <span style={{ width: "18px", height: "1px", background: COURT, display: "inline-block" }} />
              Binder digital Pokémon TCG
            </div>

            <h1 style={{
              fontFamily: DISP, fontSize: "clamp(44px, 6vw, 80px)",
              lineHeight: 0.92, margin: "0 0 28px", letterSpacing: "-0.03em", color: INK0,
            }}>
              Tu colección,<br />
              <em style={{
                fontStyle: "normal",
                background: `linear-gradient(135deg, #4ff0ff, ${COURT}, ${BALL})`,
                WebkitBackgroundClip: "text", backgroundClip: "text",
                WebkitTextFillColor: "transparent", color: "transparent",
              }}>
                en un solo lugar
              </em>
            </h1>

            <p style={{
              fontFamily: MONO, fontSize: "14px", color: INK1, lineHeight: 1.9,
              letterSpacing: "0.03em", margin: "0 0 40px",
            }}>
              Lleva el control de cada carta de tu binder. Marca Normales,
              Reverse Holo y Holofoil. Conecta con otros coleccionistas Pokémon.
            </p>

            <div className="hero-btns" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <Link href="/login" className="cta-btn" style={{
                display: "inline-flex", alignItems: "center", gap: "10px",
                padding: "14px 36px", borderRadius: "12px",
                background: `linear-gradient(90deg, ${COURT}, ${BALL})`,
                color: BG0, fontFamily: MONO, fontSize: "13px", fontWeight: 700,
                letterSpacing: "0.08em", textDecoration: "none",
                boxShadow: `0 0 40px ${COURT}33`,
              }}>
                Crear mi Facebinder →
              </Link>
              <Link href="/dashboard/inventario" className="ghost-btn" style={{
                display: "inline-flex", alignItems: "center", padding: "14px 28px",
                borderRadius: "12px", border: "1px solid rgba(255,255,255,0.15)",
                color: INK2, fontFamily: MONO, fontSize: "13px",
                letterSpacing: "0.08em", textDecoration: "none",
              }}>
                Ver inventario
              </Link>
            </div>

            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, marginTop: "20px", letterSpacing: "0.08em" }}>
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" style={{ color: COURT, textDecoration: "none" }}>Inicia sesión</Link>
            </p>
          </div>

          {/* ImageSwiper */}
          <div className="hero-swiper" style={{ flexShrink: 0, animation: "float 7s ease-in-out infinite" }}>
            <ImageSwiper images={randomTen} cardWidth={264} cardHeight={370} />
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="features-section" style={{ padding: "120px 40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "72px" }}>
            <div style={{
              fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.22em",
              textTransform: "uppercase", marginBottom: "16px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            }}>
              <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
              Todo en un solo lugar
              <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
            </div>
            <h2 style={{
              fontFamily: DISP, fontSize: "clamp(32px, 5vw, 52px)", color: INK0,
              margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1,
            }}>
              La plataforma completa<br />
              <span style={{ color: INK2, fontFamily: MONO, fontSize: "clamp(13px, 2vw, 16px)", letterSpacing: "0.04em", fontWeight: 400 }}>
                para coleccionistas de Pokémon TCG
              </span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card" style={{
                padding: "32px", borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                transition: "border-color 0.2s, background 0.2s",
              }}>
                <div style={{
                  width: "44px", height: "44px", borderRadius: "12px",
                  background: `${f.color}18`, border: `1px solid ${f.color}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "20px", color: f.color, marginBottom: "20px",
                }}>
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
      <section className="steps-section" style={{
        padding: "120px 40px",
        background: "rgba(255,255,255,0.015)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "72px" }}>
            <div style={{
              fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.22em",
              textTransform: "uppercase", marginBottom: "16px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            }}>
              <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
              Proceso
              <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
            </div>
            <h2 style={{ fontFamily: DISP, fontSize: "clamp(32px, 5vw, 52px)", color: INK0, margin: 0, letterSpacing: "-0.02em" }}>
              Empieza en minutos
            </h2>
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
      <section className="cta-section" style={{
        padding: "120px 40px", textAlign: "center",
        background: `radial-gradient(ellipse 60% 60% at 50% 50%, rgba(46,230,193,0.08), transparent 70%)`,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <div style={{
            fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.22em",
            textTransform: "uppercase", marginBottom: "24px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          }}>
            <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
            Únete ahora
            <span style={{ width: "24px", height: "1px", background: COURT, display: "inline-block" }} />
          </div>
          <h2 style={{
            fontFamily: DISP, fontSize: "clamp(36px, 6vw, 64px)", color: INK0,
            margin: "0 0 24px", letterSpacing: "-0.02em", lineHeight: 1,
          }}>
            ¿Listo para armar<br />tu colección?
          </h2>
          <p style={{ fontFamily: MONO, fontSize: "13px", color: INK2, lineHeight: 1.8, margin: "0 0 48px", letterSpacing: "0.04em" }}>
            Regístrate gratis, crea tu Facebinder y empieza a conectar
            con la comunidad de coleccionistas Pokémon TCG.
          </p>
          <Link href="/login" className="cta-btn" style={{
            display: "inline-flex", alignItems: "center", gap: "12px",
            padding: "16px 48px", borderRadius: "14px",
            background: `linear-gradient(90deg, ${COURT}, ${BALL})`,
            color: BG0, fontFamily: MONO, fontSize: "14px", fontWeight: 700,
            letterSpacing: "0.08em", textDecoration: "none",
            boxShadow: `0 0 60px ${COURT}44`,
          }}>
            Crear mi Facebinder gratis →
          </Link>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, marginTop: "20px", letterSpacing: "0.08em" }}>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" style={{ color: COURT, textDecoration: "none" }}>Inicia sesión</Link>
          </p>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="footer-section" style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "40px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: "16px",
      }}>
        <span style={{ fontFamily: DISP, fontSize: "13px", letterSpacing: "0.1em", color: INK0, textTransform: "uppercase" }}>
          FACEBINDER
        </span>
        <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
          {[["Amigos", "/dashboard/amigos"], ["Inventario", "/dashboard/inventario"], ["Market", "/dashboard/market"]].map(([label, href]) => (
            <Link key={href} href={href} style={{
              fontFamily: MONO, fontSize: "10px", color: INK2,
              letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none",
            }}>{label}</Link>
          ))}
        </div>
        <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.1em" }}>
          © 2025 Facebinder · Pokémon TCG · Diseñado por{" "}
          <a href="https://adxmedialab.com" target="_blank" rel="noopener noreferrer"
            style={{ color: COURT, textDecoration: "none" }}>
            AdxMediaLab
          </a>
        </span>
      </footer>
    </main>
  );
}
