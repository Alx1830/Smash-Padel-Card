export default function ProfileLoading() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#05070d" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "36px", height: "36px", border: "3px solid rgba(46,230,193,0.15)", borderTop: "3px solid #2ee6c1", borderRadius: "50%", animation: "fb-spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#7a8298", margin: 0 }}>Cargando perfil…</p>
      </div>
      <style>{`@keyframes fb-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
