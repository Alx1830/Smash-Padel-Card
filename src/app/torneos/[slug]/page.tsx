const COURT = "#2ee6c1"; const INK0 = "#f5f7fb"; const INK2 = "#7a8298"; const MONO = "var(--font-jetbrains)"; const DISP = "var(--font-archivo)";
export default async function TorneoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main style={{ minHeight: "100vh", background: "#05070d", padding: "80px 48px" }}>
      <div style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px" }}>Torneo</div>
      <h1 style={{ fontFamily: DISP, fontSize: "48px", color: INK0, margin: "0 0 48px" }}>{slug.replace(/-/g, " ").toUpperCase()}</h1>
      <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px", padding: "80px 40px", textAlign: "center" }}>
        <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase" }}>Página del torneo — Próximamente</p>
      </div>
    </main>
  );
}
