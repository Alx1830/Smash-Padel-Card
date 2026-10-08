import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Enlace de vuelta al catálogo, arriba de cada juego */
export function VolverAJuegos() {
  return (
    <Link href="/dashboard/juegos" style={{
      display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
      fontFamily: "var(--font-jetbrains)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
      color: "#7a8298", marginBottom: 12,
    }}>
      <ArrowLeft size={13} /> Juegos
    </Link>
  );
}
