export default function AmigosLoading() {
  return (
    <div style={{ minHeight: "100vh", padding: "24px" }}>
      <style>{`
        @media (min-width: 768px) { .amigos-load-wrap { padding: 48px; } }
        @keyframes fb-spin { to { transform: rotate(360deg); } }
        @keyframes amigos-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .amigos-skel {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.08) 50%,
            rgba(255,255,255,0.04) 75%
          );
          background-size: 200% 100%;
          animation: amigos-shimmer 1.4s infinite;
          border-radius: 8px;
        }
        .amigos-skel-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 1023px) {
          .amigos-skel-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        }
      `}</style>

      <div className="amigos-load-wrap">
        {/* Header skeleton */}
        <div style={{ marginBottom: 48 }}>
          <div className="amigos-skel" style={{ width: 120, height: 11, marginBottom: 14 }} />
          <div className="amigos-skel" style={{ width: 200, height: 36 }} />
        </div>

        {/* Cards skeleton */}
        <div className="amigos-skel-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="amigos-skel" style={{ height: 320, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
