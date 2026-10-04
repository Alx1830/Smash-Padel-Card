"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, Home, CloudOff } from "lucide-react";

const COURT = "#2ee6c1";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

/**
 * Cuando una página falla en el servidor o lanza un error al cargar (por
 * ejemplo, fetchAllRows no pudo leer todas las filas), se ve esto en vez de la
 * pantalla genérica de Next. Casi siempre es un corte de red pasajero: el botón
 * vuelve a pedir la página.
 */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div style={{ minHeight: "70vh", background: BG0, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 16, padding: "40px 24px" }}>
        <CloudOff size={30} color={COURT} strokeWidth={1.6} />
        <h1 style={{ fontFamily: DISP, fontSize: "clamp(20px, 4vw, 26px)", color: INK0, margin: "16px 0 8px" }}>
          No pudimos cargar esta página
        </h1>
        <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, lineHeight: 1.7, margin: "0 0 24px" }}>
          Suele ser un corte de conexión pasajero. Tus cartas están a salvo: vuelve a intentarlo.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => retry()} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10, border: "none", background: COURT, color: BG0, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
            <RotateCw size={13} /> Reintentar
          </button>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", color: INK0, fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
            <Home size={13} /> Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
