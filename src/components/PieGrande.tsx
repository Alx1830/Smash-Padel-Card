"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

/**
 * El pie grande del sitio: el letrero que rueda, la palabra enorme de fondo,
 * la llamada a publicar y la barra de abajo con la marca.
 *
 * Nació dentro de la página del market y ahora lo usan también las noticias,
 * así que vive acá. Lo único que cambia de una página a otra es la palabra
 * gigante del fondo; el resto es igual a propósito — es el mismo pie y se
 * reconoce como tal.
 */
const STYLES = `
/* El pie grande ocupa pantallas enteras: en el celular y la tableta obliga a
   desplazar un buen rato después de terminar de leer, y ahí abajo ya está la
   barra de pestañas para moverse. Se deja solo en la portada del sitio, que es
   donde cumple de verdad su papel de invitar a registrarse. */
.pie-grande-movil-no { display: none; }
@media (min-width: 1024px) and (pointer: fine) {
  .pie-grande-movil-no { display: block; }
}

  @keyframes mft-breathe {
    0%   { transform: translate(-50%,-50%) scale(1);    opacity: 0.5; }
    100% { transform: translate(-50%,-50%) scale(1.12); opacity: 0.9; }
  }
  @keyframes mft-marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  .mft-breathe { animation: mft-breathe 8s ease-in-out infinite alternate; }
  .mft-marquee { animation: mft-marquee 35s linear infinite; }
  .mft-grid {
    background-size: 60px 60px;
    background-image:
      linear-gradient(to right, rgba(46,230,193,0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(46,230,193,0.04) 1px, transparent 1px);
    mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
    -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  }
  .mft-pill {
    background: rgba(46,230,193,0.06);
    border: 1px solid rgba(46,230,193,0.15);
    backdrop-filter: blur(12px);
    transition: all 0.3s ease;
  }
  .mft-pill:hover {
    background: rgba(46,230,193,0.12);
    border-color: rgba(46,230,193,0.35);
    color: #2ee6c1;
  }
  .mft-big-text {
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
  .mft-glow-text {
    background: linear-gradient(180deg, #f5f7fb 0%, rgba(245,247,251,0.4) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 24px rgba(46,230,193,0.2));
  }
`;

const NAV_LINKS = [
  { label: "Inicio",     href: "/" },
  { label: "Mi binder",  href: "/dashboard" },
  { label: "Inventario", href: "/dashboard/inventario" },
  { label: "Amigos",     href: "/dashboard/amigos" },
];

const MarqueeItem = () => (
  <div style={{ display: "flex", alignItems: "center", gap: "40px", padding: "0 24px", whiteSpace: "nowrap", fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "0.25em", color: "rgba(46,230,193,0.5)", textTransform: "uppercase" }}>
    <span>Facebinder Market</span><span style={{ color: "rgba(214,255,61,0.4)" }}>✦</span>
    <span>Vende tus cartas</span><span style={{ color: "rgba(214,255,61,0.4)" }}>✦</span>
    <span>Pokémon TCG</span><span style={{ color: "rgba(214,255,61,0.4)" }}>✦</span>
    <span>Coleccionistas</span><span style={{ color: "rgba(214,255,61,0.4)" }}>✦</span>
  </div>
);

export function PieGrande({ palabra = "MARKET" }: { palabra?: string }) {

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <footer className="pie-grande-movil-no" style={{ position: "relative", background: "#05070d", overflow: "hidden", maxWidth: "100%", paddingTop: "80px" }}>

        {/* Aurora glow */}
        <div className="mft-breathe" style={{ position: "absolute", left: "50%", top: "50%", width: "70vw", height: "50vh", borderRadius: "50%", background: "radial-gradient(circle, rgba(46,230,193,0.1) 0%, rgba(214,255,61,0.04) 50%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none", zIndex: 0 }} />

        {/* Grid */}
        <div className="mft-grid" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }} />

        {/* Giant bg text */}
        <div className="mft-big-text" style={{ position: "absolute", bottom: "-2vh", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", zIndex: 0, pointerEvents: "none", fontFamily: "var(--font-archivo)", maxWidth: "100vw" }}>
          {palabra}
        </div>

        {/* Marquee */}
        <div style={{ position: "relative", zIndex: 10, overflow: "hidden", borderTop: "1px solid rgba(46,230,193,0.08)", borderBottom: "1px solid rgba(46,230,193,0.08)", padding: "14px 0", marginBottom: "72px", background: "rgba(5,7,13,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="mft-marquee" style={{ display: "flex", width: "max-content" }}>
            <MarqueeItem /><MarqueeItem /><MarqueeItem /><MarqueeItem />
          </div>
        </div>

        {/* Main content */}
        <div style={{ position: "relative", zIndex: 10, maxWidth: "860px", margin: "0 auto", padding: "0 32px 80px", textAlign: "center" }}>
          <h2 className="mft-glow-text" style={{ fontFamily: "var(--font-archivo)", fontSize: "clamp(36px, 8vw, 80px)", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 48px" }}>
            ¿Tienes cartas<br />que no usas?
          </h2>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "14px 36px", borderRadius: "999px", background: "linear-gradient(90deg, #2ee6c1, #d6ff3d)", color: "#05070d", fontFamily: "var(--font-jetbrains)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", boxShadow: "0 0 40px rgba(46,230,193,0.25)" }}>
              → Publica tus cartas gratis
            </Link>

            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", marginTop: "8px" }}>
              {NAV_LINKS.map(({ label, href }) => (
                <Link key={label} href={href} className="mft-pill" style={{ padding: "8px 20px", borderRadius: "999px", color: "rgba(201,207,221,0.7)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "0.1em", textDecoration: "none" }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "20px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <BrandLogo height={36} />
          <a href="https://adxmedialab.com" target="_blank" rel="noopener noreferrer" className="mft-pill" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 20px", borderRadius: "999px", fontFamily: "var(--font-jetbrains)", fontSize: "10px", letterSpacing: "0.12em", color: "rgba(201,207,221,0.5)", textTransform: "uppercase", textDecoration: "none" }}>
            Hecho por <span style={{ color: "#2ee6c1" }}>Adxmedialab</span>
          </a>
          <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: "10px", color: "rgba(122,130,152,0.7)", letterSpacing: "0.12em" }}>
            © 2026 FACEBINDER · Pokémon TCG
          </span>
        </div>
      </footer>
    </>
  );
}
