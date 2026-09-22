import type { ReactNode } from "react";
import { PieLegal } from "@/components/PieLegal";
import { MobileTabBar } from "@/components/MobileTabBar";

/**
 * El molde de las páginas que son solo texto: quiénes somos, contacto,
 * privacidad y condiciones.
 *
 * Siguen el patrón de página del sitio (antetítulo, título, bajada) pero con la
 * columna angosta: un texto de 1400px de ancho no lo lee nadie. Los estilos de
 * los párrafos se aplican por descendencia para no tener que decorar cada
 * etiqueta a mano.
 */

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";

export function PaginaTexto({
  antetitulo,
  titulo,
  bajada,
  actualizado,
  children,
}: {
  antetitulo: string;
  titulo: string;
  bajada: string;
  actualizado?: string;
  children: ReactNode;
}) {
  return (
    <div className="tx-page">
      <style>{`
        .tx-page { min-height: 100vh; background: #05070d; padding: 40px 24px; }
        .tx-wrap { max-width: 720px; }
        @media (max-width: 767px) { .tx-page { padding: 28px 16px; } }

        .tx-cuerpo h2 {
          font-family: ${DISP}; font-size: 17px; font-weight: 700; color: ${INK0};
          margin: 34px 0 10px; letter-spacing: -0.01em;
        }
        .tx-cuerpo p, .tx-cuerpo li {
          font-family: ${MONO}; font-size: 12px; line-height: 1.95; color: #c9cfdd;
          margin: 0 0 12px;
        }
        .tx-cuerpo ul { margin: 0 0 12px; padding-left: 18px; }
        .tx-cuerpo li { margin-bottom: 7px; }
        .tx-cuerpo a { color: ${COURT}; text-decoration: none; }
        .tx-cuerpo a:hover { text-decoration: underline; }
        .tx-cuerpo strong { color: ${INK0}; font-weight: 700; }
      `}</style>

      <div className="tx-wrap">
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
            {antetitulo}
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            {titulo}
          </h1>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.06em", margin: "8px 0 0", lineHeight: 1.7 }}>
            {bajada}
          </p>
          {actualizado && (
            <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: "10px 0 0", opacity: 0.75 }}>
              Última actualización: {actualizado}
            </p>
          )}
        </div>

        <div className="tx-cuerpo">{children}</div>
      </div>

      <PieLegal />
      <MobileTabBar />
    </div>
  );
}
