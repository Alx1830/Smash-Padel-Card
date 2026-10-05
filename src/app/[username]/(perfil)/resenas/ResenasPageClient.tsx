"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import {
  cargarResenas, cartaDeResena, nombreDeSet, fechaCorta, Estrellas,
  type Resena, type Compradores,
} from "@/components/Resenas";

const BALL = "#d6ff3d";
const INK0 = "#f5f7fb";
const INK1 = "#c9cfdd";
const INK2 = "#7a8298";
const MONO = "var(--font-jetbrains)";
const DISP = "var(--font-archivo)";

export function ResenasPageClient({ vendedorId, username }: { vendedorId: string; username: string }) {
  const [datos, setDatos] = useState<{ resenas: Resena[]; compradores: Compradores } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    cargarResenas(vendedorId).then(setDatos).catch(() => setError(true));
  }, [vendedorId]);

  const resenas  = datos?.resenas ?? [];
  const promedio = resenas.length ? resenas.reduce((s, r) => s + r.estrellas, 0) / resenas.length : 0;

  return (
    <div className="rs-page">
      <style>{`
        .rs-page { background: #05070d; padding: 40px 24px; }
        .rs-wrap { max-width: 1400px; }
        .rs-txt  { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: ${MONO}; margin: 0; }
        .rs-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 1500px) { .rs-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
        @media (max-width: 1240px) { .rs-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 1023px) { .rs-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width:  767px) {
          .rs-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        }
        /* Celular y tablet: el marco del perfil ya pone los 16px a los lados, y la
           cabecera y el estado vacío van centrados */
        @media (max-width: 1023px), (pointer: coarse) {
          .rs-page { padding: 24px 0 8px; }
          .rs-cab { text-align: center; }
          .rs-ante { justify-content: center; }
          .rs-vacio { margin: 0 auto; }
        }
      `}</style>

      <div className="rs-wrap">
        <div className="rs-cab" style={{ marginBottom: "28px" }}>
          <div className="rs-ante" style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: "#2ee6c1", display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ width: "22px", height: "1px", background: "#2ee6c1", display: "inline-block" }} />
            Ventas confirmadas
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            Reseñas de @{username}
          </h1>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.06em", margin: "8px 0 0" }}>
            {resenas.length > 0
              ? `${promedio.toLocaleString("es-CO", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} de 5 · ${resenas.length} ${resenas.length === 1 ? "venta calificada" : "ventas calificadas"} por compradores de Facebinder`
              : "Solo cuentan las ventas que el comprador confirmó al recibir la carta"}
          </p>
        </div>

        {error ? (
          <p style={{ fontFamily: MONO, fontSize: "11px", color: "#ff5d5d" }}>No se pudieron cargar las reseñas. Recarga la página.</p>
        ) : !datos ? null : resenas.length === 0 ? (
          <div className="rs-vacio" style={{ border: "1px dashed rgba(214,255,61,0.2)", borderRadius: "12px", padding: "32px 24px", textAlign: "center", maxWidth: "520px" }}>
            <div style={{ marginBottom: "12px", display: "flex", justifyContent: "center" }}><Star size={28} color={BALL} strokeWidth={1.6} /></div>
            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, lineHeight: 1.6, margin: 0 }}>
              @{username} todavía no tiene ventas confirmadas. Cuando un comprador de Facebinder confirme una, su reseña aparece aquí.
            </p>
          </div>
        ) : (
          <div className="rs-grid">
            {resenas.map(r => {
              const carta = cartaDeResena(r);
              const comprador = datos.compradores[r.comprador_id];
              return (
                <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "8px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", minWidth: 0 }}>
                  {carta ? (
                    <img src={carta.image} alt={carta.name} loading="lazy" decoding="async" style={{ width: "100%", aspectRatio: "5 / 7", objectFit: "cover", borderRadius: "7px" }} />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "5 / 7", borderRadius: "7px", background: "rgba(255,255,255,0.04)" }} />
                  )}
                  <p className="rs-txt" style={{ fontSize: "11px", color: INK0, fontWeight: 600 }}>{carta?.name ?? `Carta #${r.card_id}`}</p>
                  <p className="rs-txt" style={{ fontSize: "9px", color: INK2 }}>{nombreDeSet(r.set_id)}</p>
                  <Estrellas n={r.estrellas} size={12} />
                  {r.comentario && (
                    <p style={{ margin: 0, fontFamily: MONO, fontSize: "10px", color: INK1, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>
                      {r.comentario}
                    </p>
                  )}
                  <div style={{ marginTop: "auto" }}>
                    <p className="rs-txt" style={{ fontSize: "9px", color: INK2 }}>
                      {comprador?.username
                        ? <Link href={`/${comprador.username}`} style={{ color: INK1, textDecoration: "none" }}>@{comprador.username}</Link>
                        : "Comprador"}
                    </p>
                    <p className="rs-txt" style={{ fontSize: "8px", color: INK2 }}>{fechaCorta(r.respondida_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
