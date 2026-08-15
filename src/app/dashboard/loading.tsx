const COURT = "#2ee6c1";
const MONO  = "var(--font-jetbrains)";

/**
 * Esqueleto del dashboard. Antes era un spinner centrado a 100vh: como el
 * contenido real se pinta desde arriba, el reemplazo movía la página entera
 * (CLS 0.3 en móvil). Ahora ocupa el mismo espacio, alineado arriba y con los
 * mismos paddings (24px móvil / 48px escritorio) y la misma grilla de tarjetas
 * que /dashboard.
 */
export default function DashboardLoading() {
  return (
    <div className="dash-skel-wrap" style={{ minHeight: "100vh" }}>
      <style>{`
        @keyframes fb-skel { 0%,100% { opacity: 0.5; } 50% { opacity: 0.85; } }
        .dash-skel-wrap { padding: 24px; }
        @media (min-width: 768px) { .dash-skel-wrap { padding: 48px; } }
        .dash-skel-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 40px;
        }
        @media (max-width: 900px) { .dash-skel-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .dash-skel-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 1100px) { .dash-skel-row { grid-template-columns: minmax(0, 1fr) 320px; } }
        .dash-skel-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          animation: fb-skel 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* Antetítulo — mismo alto y margen que el del panel real */}
      <div style={{ marginBottom: "16px", fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
        Cargando…
      </div>

      {/* 4 tarjetas de estadística — mismo alto que las reales */}
      <div className="dash-skel-stats">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="dash-skel-card" style={{ height: "168px", animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>

      {/* Gráfico + top local */}
      <div className="dash-skel-row">
        <div className="dash-skel-card" style={{ height: "320px" }} />
        <div className="dash-skel-card" style={{ height: "420px" }} />
      </div>
    </div>
  );
}
