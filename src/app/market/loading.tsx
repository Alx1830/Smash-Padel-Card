import { CardGridSkeleton } from "@/components/CardGridSkeleton";

const COURT = "#2ee6c1";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";

/**
 * Esqueleto de /market. Reproduce la misma estructura que MarketPageClient
 * —portada (260px en escritorio, bloque con padding 100/24/40 en móvil),
 * cuerpo con sidebar de 260px y grilla— para que el reemplazo por el
 * contenido real no mueva nada. Antes era un spinner centrado a 100vh y todo
 * el market saltaba al aparecer.
 */
export default function MarketLoading() {
  return (
    <div style={{ width: "100%", background: "#05070d", minHeight: "100vh" }}>
      <style>{`
        @keyframes fb-skel { 0%,100% { opacity: 0.55; } 50% { opacity: 0.9; } }
        .mkl-cover-desktop { display: none; }
        .mkl-cover-mobile  { display: block; }
        @media (min-width: 768px) {
          .mkl-cover-desktop { display: block; }
          .mkl-cover-mobile  { display: none; }
        }
        .mkl-body { padding: 48px 24px 80px; }
        @media (min-width: 1024px) { .mkl-body { padding: 64px 80px 80px; } }
        .mkl-layout  { display: flex; gap: 32px; align-items: flex-start; }
        .mkl-sidebar { width: 260px; flex-shrink: 0; }
        .mkl-grid-area { flex: 1; min-width: 0; }
        @media (max-width: 1023px) {
          .mkl-layout  { flex-direction: column; align-items: stretch; }
          .mkl-sidebar { display: none; }
          .mkl-grid-area { width: 100%; }
          .mkl-cards-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }
        }
        @media (max-width: 767px) {
          .mkl-cards-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
        }
      `}</style>

      {/* Portada — mismo alto que la real */}
      <section style={{ position: "relative", overflow: "hidden", isolation: "isolate" }}>
        <div style={{
          position: "absolute", inset: 0, zIndex: -1,
          background: "linear-gradient(180deg, #0a1320 0%, #060912 100%)",
        }} />
        <div className="mkl-cover-desktop" style={{ height: "260px", marginBottom: "48px" }} />
        <div className="mkl-cover-mobile" style={{ padding: "100px 24px 40px" }}>
          <div style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ width: "18px", height: "1px", background: COURT, display: "inline-block" }} />
            Mercado de cartas
          </div>
          {/* Mismo alto que el h1 clamp(36px, 10vw, 56px) con line-height 0.92 */}
          <div style={{ height: "clamp(33px, 9.2vw, 52px)" }} />
          <div style={{ height: "18px", marginTop: "12px" }} />
          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ height: "14px" }} />
            <div style={{ height: "14px" }} />
          </div>
        </div>
      </section>

      {/* Cuerpo */}
      <section className="mkl-body">
        <div className="mkl-layout">
          <aside className="mkl-sidebar">
            <div style={{ height: "520px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", animation: "fb-skel 1.6s ease-in-out infinite" }} />
          </aside>
          <div className="mkl-grid-area">
            <CardGridSkeleton className="mkl-cards-grid" count={20} />
            <div style={{ height: "80px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.1em" }}>Cargando market…</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
