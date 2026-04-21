const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export default function ClubPage() {
  return (
    <div style={{ padding: "48px", minHeight: "100vh" }}>
      <div style={{ marginBottom: "48px" }}>
        <div style={{
          fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em",
          textTransform: "uppercase", color: COURT,
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
        }}>
          <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
          Directorio
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "36px", color: INK0, margin: 0 }}>Club</h1>
      </div>
      <div style={{
        border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px",
        padding: "80px 40px", textAlign: "center",
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>⬡</div>
        <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Los clubs aparecerán aquí cuando sean creados
        </p>
      </div>
    </div>
  );
}
