/**
 * Banderas como SVG inline (no emoji): los emoji de bandera no se renderizan
 * en Windows/muchos navegadores de escritorio y salen como "US", "ES", etc.
 * Esto garantiza que la bandera se vea igual en todos los dispositivos.
 * Idiomas: es (España), en (US), ja (Japón), zh (China).
 */
export function FlagIcon({ code, width = 20 }: { code?: string | null; width?: number }) {
  const height = Math.round((width * 2) / 3);
  const common: React.SVGProps<SVGSVGElement> = {
    width, height, viewBox: "0 0 30 20",
    style: { display: "inline-block", verticalAlign: "middle", borderRadius: 3, boxShadow: "0 0 0 1px rgba(0,0,0,0.15)" },
    preserveAspectRatio: "xMidYMid slice",
  };

  switch (code) {
    case "es":
      return (
        <svg {...common} aria-label="Español">
          <rect width="30" height="20" fill="#c60b1e" />
          <rect y="5" width="30" height="10" fill="#ffc400" />
        </svg>
      );
    case "en":
      return (
        <svg {...common} aria-label="Inglés">
          <rect width="30" height="20" fill="#b22234" />
          {[1, 3, 5, 7, 9, 11].map(i => (
            <rect key={i} y={i * 1.538} width="30" height="1.538" fill="#fff" />
          ))}
          <rect width="13" height="10.77" fill="#3c3b6e" />
          <text x="6.5" y="5.4" fontSize="7" fill="#fff" textAnchor="middle" dominantBaseline="central">★</text>
        </svg>
      );
    case "ja":
      return (
        <svg {...common} aria-label="Japonés">
          <rect width="30" height="20" fill="#fff" />
          <circle cx="15" cy="10" r="6" fill="#bc002d" />
        </svg>
      );
    case "zh":
      return (
        <svg {...common} aria-label="Chino">
          <rect width="30" height="20" fill="#de2910" />
          <text x="9" y="10" fontSize="13" fill="#ffde00" textAnchor="middle" dominantBaseline="central">★</text>
        </svg>
      );
    default:
      return null;
  }
}
