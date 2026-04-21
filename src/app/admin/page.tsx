const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export default function AdminHome() {
  return (
    <div style={{ padding: "48px" }}>
      <div style={{ marginBottom: "48px" }}>
        <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
          Panel de administración
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "36px", color: INK0, margin: 0 }}>Administrador</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
        {[
          { label: "Clubs", icon: "⬡", href: "/admin/clubs" },
          { label: "Ligas", icon: "◈", href: "/admin/ligas" },
          { label: "Torneos", icon: "◉", href: "/admin/torneos" },
          { label: "Mercado", icon: "◬", href: "/admin/mercado" },
        ].map(item => (
          <a key={item.href} href={item.href} style={{
            display: "flex", flexDirection: "column", gap: "12px",
            padding: "24px", borderRadius: "14px", textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
            transition: "border-color 0.2s, background 0.2s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = `${COURT}44`; (e.currentTarget as HTMLAnchorElement).style.background = `${COURT}08`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.02)"; }}
          >
            <span style={{ fontSize: "28px" }}>{item.icon}</span>
            <span style={{ fontFamily: MONO, fontSize: "12px", color: INK0, letterSpacing: "0.1em", textTransform: "uppercase" }}>{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
