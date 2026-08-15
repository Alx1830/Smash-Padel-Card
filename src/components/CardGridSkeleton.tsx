/**
 * Esqueleto de una grilla de cartas.
 *
 * Existe para el CLS: mientras llegan los listings hay que ocupar exactamente
 * el mismo alto que ocupará la grilla real, con la misma cantidad de columnas
 * en cada breakpoint. Por eso recibe la clase de la grilla del llamador
 * (`.mkt-cards-grid`, `.dmkt-cards-grid`, …) en vez de definir la suya: así el
 * esqueleto y el contenido final comparten las mismas media queries.
 *
 * `infoHeight` es el alto del bloque de texto bajo la imagen, medido sobre la
 * tarjeta real (padding + nombre + set/precio + vendedor + botones).
 */
export function CardGridSkeleton({
  count = 8,
  className,
  infoHeight = 124,
  radius = 16,
}: {
  count?: number;
  className?: string;
  infoHeight?: number;
  radius?: number;
}) {
  return (
    <div
      className={className}
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}
      aria-hidden="true"
    >
      <style>{`@keyframes fb-skel { 0%,100% { opacity: 0.55; } 50% { opacity: 0.9; } }`}</style>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: `${radius}px`,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: `fb-skel 1.6s ease-in-out infinite ${(i % 4) * 0.12}s`,
          }}
        >
          <div style={{ width: "100%", aspectRatio: "5 / 7", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ height: `${infoHeight}px`, padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px", boxSizing: "border-box" }}>
            <div style={{ height: "14px", width: "80%", borderRadius: "4px", background: "rgba(255,255,255,0.05)" }} />
            <div style={{ height: "18px", width: "60%", borderRadius: "4px", background: "rgba(255,255,255,0.05)" }} />
            <div style={{ height: "12px", width: "70%", borderRadius: "4px", background: "rgba(255,255,255,0.04)" }} />
            <div style={{ marginTop: "auto", display: "flex", gap: "6px" }}>
              <div style={{ flex: 1, height: "28px", borderRadius: "8px", background: "rgba(255,255,255,0.05)" }} />
              <div style={{ flex: 1, height: "28px", borderRadius: "8px", background: "rgba(255,255,255,0.05)" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
