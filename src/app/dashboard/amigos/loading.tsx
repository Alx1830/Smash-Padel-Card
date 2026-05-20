export default function AmigosLoading() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#05070d",
      gap: "32px",
    }}>
      <style>{`
        @keyframes fb-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fb-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fb-bar {
          0%   { width: 0%; }
          30%  { width: 45%; }
          60%  { width: 72%; }
          85%  { width: 88%; }
          100% { width: 95%; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <span style={{
          fontFamily: "var(--font-archivo)",
          fontSize: "28px",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "fb-pulse 2s ease-in-out infinite",
        }}>
          FaceBinder
        </span>
        <span style={{
          fontFamily: "var(--font-jetbrains)",
          fontSize: "9px",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "#7a8298",
        }}>
          Pokémon Card Collector
        </span>
      </div>

      <div style={{ position: "relative", width: "56px", height: "56px" }}>
        <div style={{
          position: "absolute", inset: 0,
          border: "2px solid rgba(46,230,193,0.08)",
          borderRadius: "50%",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          border: "2px solid transparent",
          borderTopColor: "#2ee6c1",
          borderRightColor: "#4ff0ff",
          borderRadius: "50%",
          animation: "fb-spin 0.9s linear infinite",
        }} />
        <div style={{
          position: "absolute", inset: "10px",
          border: "2px solid transparent",
          borderTopColor: "#d6ff3d",
          borderRadius: "50%",
          animation: "fb-spin 0.6s linear infinite reverse",
        }} />
      </div>

      <div style={{ width: "160px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
        <div style={{
          width: "100%", height: "2px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "2px",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            background: "linear-gradient(90deg, #2ee6c1, #4ff0ff)",
            borderRadius: "2px",
            animation: "fb-bar 3s ease-out forwards",
          }} />
        </div>
        <p style={{
          fontFamily: "var(--font-jetbrains)",
          fontSize: "10px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#7a8298",
          margin: 0,
        }}>
          Cargando...
        </p>
      </div>
    </div>
  );
}
