/**
 * Iconos de redes sociales dibujados a mano.
 *
 * lucide-react ya no incluye logos de marcas (los quitó por licencia), y la CSP
 * del proyecto no permite traerlos de un CDN. Están trazados con el mismo
 * lenguaje que lucide — 24x24, sin relleno, trazo redondeado — para que encajen
 * con los demás iconos de la app.
 */

interface IconProps {
  size?: number;
  strokeWidth?: number;
  color?: string;
}

const base = (size: number, color: string, strokeWidth: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/** Círculo con la "f" */
export function FacebookIcon({ size = 18, strokeWidth = 1.8, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth)} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M14.5 7.5h-1.3a2 2 0 0 0-2 2v7.5" />
      <path d="M9.8 12.4h3.9" />
    </svg>
  );
}

/** Cuadrado redondeado, lente y punto del flash */
export function InstagramIcon({ size = 18, strokeWidth = 1.8, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth)} aria-hidden="true">
      <rect x="2.8" y="2.8" width="18.4" height="18.4" rx="5.2" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill={color} stroke="none" />
    </svg>
  );
}

/** Globo de chat con el auricular dentro */
export function WhatsappIcon({ size = 18, strokeWidth = 1.8, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth)} aria-hidden="true">
      <path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.4A8.5 8.5 0 1 1 20.5 11.6Z" />
      <path d="M9.2 8.8c-.5.5-.6 1.3-.2 2a8 8 0 0 0 3.9 3.6c.7.3 1.4.1 1.9-.4l.4-.5-1.9-1.2-.7.6a5.4 5.4 0 0 1-1.7-1.7l.6-.7-1.2-1.9Z" />
    </svg>
  );
}
