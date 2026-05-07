"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const STYLES = `
@keyframes spc-breathe {
  0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.5; }
  100% { transform: translate(-50%,-50%) scale(1.12); opacity: 0.9; }
}
@keyframes spc-marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes spc-heartbeat {
  0%,100% { transform: scale(1); }
  15%,45% { transform: scale(1.25); }
  30%     { transform: scale(1); }
}
.spc-breathe   { animation: spc-breathe 8s ease-in-out infinite alternate; }
.spc-marquee   { animation: spc-marquee 35s linear infinite; }
.spc-heartbeat { animation: spc-heartbeat 2s cubic-bezier(0.25,1,0.5,1) infinite; }

.spc-grid {
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, rgba(46,230,193,0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(46,230,193,0.04) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}
.spc-pill {
  background: rgba(46,230,193,0.06);
  border: 1px solid rgba(46,230,193,0.15);
  backdrop-filter: blur(12px);
  transition: all 0.3s ease;
}
.spc-pill:hover {
  background: rgba(46,230,193,0.12);
  border-color: rgba(46,230,193,0.35);
  color: #2ee6c1;
}
.spc-big-text {
  font-size: clamp(80px, 20vw, 220px);
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(46,230,193,0.08);
  background: linear-gradient(180deg, rgba(46,230,193,0.12) 0%, transparent 60%);
  -webkit-background-clip: text;
  background-clip: text;
  user-select: none;
}
.spc-glow-text {
  background: linear-gradient(180deg, #f5f7fb 0%, rgba(245,247,251,0.4) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 24px rgba(46,230,193,0.2));
}
`;

const MarqueeItem = () => (
  <div className="flex items-center gap-10 px-6 whitespace-nowrap"
    style={{ fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "0.25em", color: "rgba(46,230,193,0.5)", textTransform: "uppercase" }}>
    <span>Facebinder</span><span style={{ color: "rgba(214,255,61,0.4)" }}>✦</span>
    <span>Pokémon TCG</span><span style={{ color: "rgba(214,255,61,0.4)" }}>✦</span>
    <span>Tu binder digital</span><span style={{ color: "rgba(214,255,61,0.4)" }}>✦</span>
    <span>Coleccionistas</span><span style={{ color: "rgba(214,255,61,0.4)" }}>✦</span>
  </div>
);

const NAV_LINKS = [
  { label: "Inicio",      href: "/" },
  { label: "Amigos",      href: "/dashboard/amigos" },
  { label: "Inventario",  href: "/dashboard/inventario" },
  { label: "Market",      href: "/dashboard/market" },
];

export function Footer() {
  const wrapperRef  = useRef<HTMLElement>(null);
  const bigTextRef  = useRef<HTMLDivElement>(null);
  const headingRef  = useRef<HTMLHeadingElement>(null);
  const linksRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targets = [
      { el: bigTextRef.current, delay: "0ms" },
      { el: headingRef.current, delay: "0ms" },
      { el: linksRef.current,   delay: "120ms" },
    ];
    targets.forEach(({ el, delay }) => {
      if (!el) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(32px)";
      el.style.transition = `opacity 0.7s ease ${delay}, transform 0.7s ease ${delay}`;
    });
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).style.opacity = "1";
        (entry.target as HTMLElement).style.transform = "translateY(0)";
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    targets.forEach(({ el }) => { if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <footer ref={wrapperRef} style={{ position: "relative", background: "#05070d", overflow: "hidden", maxWidth: "100%", paddingTop: "80px" }}>

        {/* Aurora glow */}
        <div className="spc-breathe" style={{
          position: "absolute", left: "50%", top: "50%",
          width: "70vw", height: "50vh", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(46,230,193,0.1) 0%, rgba(214,255,61,0.04) 50%, transparent 70%)",
          filter: "blur(60px)", pointerEvents: "none", zIndex: 0,
        }} />

        {/* Grid */}
        <div className="spc-grid" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }} />

        {/* Giant bg text */}
        <div ref={bigTextRef} className="spc-big-text" style={{
          position: "absolute", bottom: "-2vh", left: "50%", transform: "translateX(-50%)",
          whiteSpace: "nowrap", zIndex: 0, pointerEvents: "none",
          fontFamily: "var(--font-archivo)",
        }}>
          FACEBINDER
        </div>

        {/* Marquee */}
        <div style={{
          position: "relative", zIndex: 10, overflow: "hidden",
          borderTop: "1px solid rgba(46,230,193,0.08)",
          borderBottom: "1px solid rgba(46,230,193,0.08)",
          padding: "14px 0", marginBottom: "72px",
          background: "rgba(5,7,13,0.7)", backdropFilter: "blur(8px)",
        }}>
          <div className="spc-marquee" style={{ display: "flex", width: "max-content" }}>
            <MarqueeItem /><MarqueeItem /><MarqueeItem /><MarqueeItem />
          </div>
        </div>

        {/* Main content */}
        <div style={{ position: "relative", zIndex: 10, maxWidth: "860px", margin: "0 auto", padding: "0 32px 80px", textAlign: "center" }}>

          <h2 ref={headingRef} className="spc-glow-text" style={{
            fontFamily: "var(--font-archivo)",
            fontSize: "clamp(36px, 8vw, 80px)",
            fontWeight: 900, letterSpacing: "-0.03em",
            margin: "0 0 48px",
          }}>
            ¿Listo para armar<br />tu colección?
          </h2>

          <div ref={linksRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            {/* CTA */}
            <Link href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: "10px",
              padding: "14px 36px", borderRadius: "999px",
              background: "linear-gradient(90deg, #2ee6c1, #d6ff3d)",
              color: "#05070d", fontFamily: "var(--font-jetbrains)",
              fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em",
              textDecoration: "none", boxShadow: "0 0 40px rgba(46,230,193,0.25)",
              transition: "opacity 0.2s",
            }}>
              → Crear mi Facebinder
            </Link>

            {/* Nav links */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", marginTop: "8px" }}>
              {NAV_LINKS.map(({ label, href }) => (
                <Link key={label} href={href} className="spc-pill" style={{
                  padding: "8px 20px", borderRadius: "999px",
                  color: "rgba(201,207,221,0.7)", fontFamily: "var(--font-jetbrains)",
                  fontSize: "11px", letterSpacing: "0.1em", textDecoration: "none",
                }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          position: "relative", zIndex: 10,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "20px 48px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "12px",
        }}>
          {/* Logo */}
          <span style={{
            fontFamily: "var(--font-archivo)", fontSize: "16px", fontWeight: 900, letterSpacing: "0.02em",
            background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text", userSelect: "none",
          }}>FaceBinder</span>

          {/* Made by */}
          <a href="https://adxmedialab.com" target="_blank" rel="noopener noreferrer" className="spc-pill" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "8px 20px", borderRadius: "999px",
            fontFamily: "var(--font-jetbrains)", fontSize: "10px",
            letterSpacing: "0.12em", color: "rgba(201,207,221,0.5)",
            textTransform: "uppercase", textDecoration: "none",
          }}>
            Hecho por <span style={{ color: "#2ee6c1" }}>Adxmedialab</span>
          </a>

          {/* Copyright */}
          <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: "10px", color: "rgba(122,130,152,0.7)", letterSpacing: "0.12em" }}>
            © 2026 FACEBINDER · Pokémon TCG
          </span>
        </div>
      </footer>
    </>
  );
}
