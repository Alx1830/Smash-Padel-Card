import { CATEGORIA_COLOR, NIVEL_COLORES, nivelDe, type Logro } from "@/data/logros";

/**
 * Insignia hexagonal de un logro. Es un SVG y no clip-path para que el brillo
 * no se recorte. Los bloqueados se pintan en gris, con el mismo dibujo.
 */
export function Insignia({ logro, ganado, size = 56 }: { logro: Logro; ganado: boolean; size?: number }) {
  const nivel = nivelDe(logro.orden);
  const [claro, oscuro] = ganado ? NIVEL_COLORES[nivel] : ["#3a4150", "#232834"];
  const tinte = ganado ? CATEGORIA_COLOR[logro.categoria] : "#59606f";
  const Icono = logro.icono;
  const id = `ins-${logro.id}-${ganado ? 1 : 0}`;
  const alto = size * 1.1;

  return (
    <span style={{
      position: "relative", display: "inline-block", width: size, height: alto, flexShrink: 0,
      filter: ganado ? `drop-shadow(0 0 10px ${tinte}55)` : undefined,
    }}>
      <svg width={size} height={alto} viewBox="0 0 100 110" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id={`${id}-marco`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={claro} />
            <stop offset="100%" stopColor={oscuro} />
          </linearGradient>
          <radialGradient id={`${id}-fondo`} cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor={tinte} stopOpacity={ganado ? 0.32 : 0.12} />
            <stop offset="100%" stopColor="#05070d" stopOpacity={0.95} />
          </radialGradient>
        </defs>
        <polygon points="50,3 95,29 95,81 50,107 5,81 5,29" fill={`url(#${id}-marco)`} />
        <polygon points="50,10 89,32.5 89,77.5 50,100 11,77.5 11,32.5" fill="#070a12" />
        <polygon points="50,10 89,32.5 89,77.5 50,100 11,77.5 11,32.5" fill={`url(#${id}-fondo)`} />
        {nivel === "leyenda" && ganado && (
          <polygon points="50,14 85,34.5 85,75.5 50,96 15,75.5 15,34.5" fill="none" stroke={GOLD_LEYENDA} strokeOpacity={0.5} strokeWidth={1.2} />
        )}
      </svg>
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icono size={Math.round(size * 0.4)} color={ganado ? tinte : "#6b7280"} strokeWidth={1.8} />
      </span>
    </span>
  );
}

const GOLD_LEYENDA = "#ffd24f";
