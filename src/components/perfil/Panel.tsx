import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { COURT, INK0, INK1, INK2, MONO, DISP, PANEL_BG, PANEL_BORDER } from "./tokens";

/**
 * Caja común de todas las secciones del perfil: icono de color, título y un
 * botón a la derecha ("Ver todas" lleva a la pestaña de esa sección).
 *
 * `alto`: los paneles que deben medir lo mismo. "referencia" es el que manda
 * (la Wishlist) y "igual" los que copian su alto; ver IgualarAltos.tsx.
 */
export function Panel({ icon: Icon, color, titulo, verTodas, accion, children, sinPadding, alto }: {
  icon: LucideIcon;
  color: string;
  titulo: string;
  verTodas?: string;
  /** Botón neutro en lugar de "Ver todas" (p. ej. Editar) */
  accion?: { label: string; href: string; icon?: LucideIcon };
  children: React.ReactNode;
  sinPadding?: boolean;
  alto?: "referencia" | "igual";
}) {
  return (
    <section
      className={alto === "igual" ? "pf-panel pf-igual" : "pf-panel"}
      data-alto-ref={alto === "referencia" ? "" : undefined}
      style={{ borderRadius: 14, border: PANEL_BORDER, background: PANEL_BG, padding: sinPadding ? "18px 0" : 18, minWidth: 0, boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 30, marginBottom: 14, padding: sinPadding ? "0 18px" : 0 }}>
        <Icon size={18} color={color} strokeWidth={1.9} />
        <h2 style={{ flex: 1, margin: 0, fontFamily: DISP, fontSize: 15, fontWeight: 600, color: INK0, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titulo}</h2>
        {verTodas && (
          <Link href={verTodas} scroll={false} className="pf-ver" style={{ position: "relative", flexShrink: 0, display: "inline-flex", alignItems: "center", height: 28, padding: "0 14px", borderRadius: 7, border: "1px solid rgba(46,230,193,0.22)", background: "rgba(46,230,193,0.04)", color: COURT, fontFamily: MONO, fontSize: 10.5, textDecoration: "none", whiteSpace: "nowrap" }}>
            Ver todas
          </Link>
        )}
        {accion && (
          <Link href={accion.href} className="pf-ver" style={{ position: "relative", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.18)", color: INK1, fontFamily: MONO, fontSize: 10.5, textDecoration: "none", whiteSpace: "nowrap" }}>
            {accion.icon && <accion.icon size={12} />} {accion.label}
          </Link>
        )}
      </div>
      <div className="pf-panel-cuerpo">{children}</div>
    </section>
  );
}

/** Estado vacío: borde punteado, icono de lucide y una línea de qué hacer. */
export function Vacio({ icon: Icon, color, texto }: { icon: LucideIcon; color: string; texto: string }) {
  return (
    <div className="pf-vacio" style={{ border: `1px dashed ${color}33`, borderRadius: 10, padding: "22px 16px", textAlign: "center" }}>
      <Icon size={22} color={color} strokeWidth={1.6} />
      <p style={{ margin: "8px 0 0", fontFamily: MONO, fontSize: 10.5, color: INK2, lineHeight: 1.6 }}>{texto}</p>
    </div>
  );
}
