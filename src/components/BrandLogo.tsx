import type { CSSProperties } from "react";

/* El logo vive en R2; el sufijo -v2 evita que el CDN sirva la versión vieja */
export const BRAND_LOGO_URL =
  "https://pub-01b8e296fe944e688fd2100376d4af4a.r2.dev/brand/logo-v2.webp";

/* Proporción del archivo original: 2172 x 724 */
const RATIO = 2172 / 724;

/**
 * Wordmark de FaceBinder. Reemplaza al texto con gradiente que había antes,
 * así que se dimensiona por altura y el ancho sale de la proporción.
 */
export function BrandLogo({
  height = 24,
  className,
  style,
}: {
  height?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <img
      src={BRAND_LOGO_URL}
      alt="FaceBinder"
      width={Math.round(height * RATIO)}
      height={height}
      draggable={false}
      className={className}
      style={{ height, width: "auto", display: "block", userSelect: "none", ...style }}
    />
  );
}
