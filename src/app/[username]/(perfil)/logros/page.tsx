import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { Insignia } from "@/components/perfil/Insignia";
import { CATEGORIA_COLOR, CATEGORIA_NOMBRE, NIVEL_COLORES, NIVEL_NOMBRE, nivelDe, type Nivel } from "@/data/logros";
import { COURT, INK0, INK1, INK2, MONO, DISP, PANEL_BG, PANEL_BORDER } from "@/components/perfil/tokens";
import { traerPerfil } from "../datos";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `Logros de @${username} · FaceBinder` };
}

const NIVELES: Nivel[] = ["bronce", "plata", "oro", "platino", "leyenda"];

export default async function LogrosPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const perfil = await traerPerfil(username);
  if (!perfil) notFound();

  const ganados = perfil.logros.filter(l => l.ganado).length;

  return (
    <div>
      <style>{`
        .lg-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 1500px) { .lg-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
        @media (max-width: 1240px) { .lg-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 1023px) { .lg-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width:  767px) { .lg-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } }
        .lg-txt { margin: 0; font-family: ${MONO}; }
        /* Celular y tablet: cabecera y títulos de nivel centrados */
        @media (max-width: 1023px), (pointer: coarse) {
          .lg-cab { text-align: center; padding-top: 8px; }
          .lg-ante, .lg-nivel { justify-content: center; }
        }
        /* En 2 columnas la descripción sube un punto para leerse sin esfuerzo */
        @media (max-width: 767px) {
          .lg-desc { font-size: 10px !important; }
        }
      `}</style>

      <div className="lg-cab" style={{ marginBottom: 24 }}>
        <div className="lg-ante" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} /> Logros
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0 }}>
          {ganados} de 100 logros
        </h1>
        <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: "8px 0 0" }}>
          Del más fácil al más difícil. Cada uno se gana con datos reales de la colección, el market y la comunidad.
        </p>
      </div>

      {NIVELES.map(nivel => {
        const lista = perfil.logros.filter(l => nivelDe(l.logro.orden) === nivel);
        const hechos = lista.filter(l => l.ganado).length;
        const [claro] = NIVEL_COLORES[nivel];
        return (
          <section key={nivel} style={{ marginBottom: 32 }}>
            <h2 className="lg-nivel" style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "0 0 14px", fontFamily: DISP, fontSize: 18, fontWeight: 700, color: claro }}>
              {NIVEL_NOMBRE[nivel]}
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 400, color: INK2 }}>{hechos} / {lista.length}</span>
            </h2>
            <div className="lg-grid">
              {lista.map(({ logro, ganado, valor, progreso }) => (
                <div key={logro.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 10px 14px", borderRadius: 12, border: PANEL_BORDER, background: PANEL_BG, textAlign: "center", minWidth: 0, opacity: ganado ? 1 : 0.72 }}>
                  <Insignia logro={logro} ganado={ganado} size={58} />
                  <p className="lg-txt" style={{ fontSize: 11, fontWeight: 700, color: ganado ? INK0 : INK1, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {logro.nombre}
                  </p>
                  <p className="lg-txt lg-desc" style={{ fontSize: 9.5, color: INK2, lineHeight: 1.45, minHeight: 28, overflowWrap: "anywhere" }}>{logro.descripcion}</p>
                  <span className="lg-txt" style={{ fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: CATEGORIA_COLOR[logro.categoria] }}>
                    {CATEGORIA_NOMBRE[logro.categoria]} · #{logro.orden}
                  </span>
                  <div style={{ width: "100%", marginTop: "auto" }}>
                    {ganado ? (
                      <p className="lg-txt" style={{ fontSize: 9.5, fontWeight: 700, color: COURT }}>Conseguido</p>
                    ) : (
                      <>
                        <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)" }}>
                          <div style={{ width: `${progreso * 100}%`, height: "100%", borderRadius: 2, background: CATEGORIA_COLOR[logro.categoria] }} />
                        </div>
                        <p className="lg-txt" style={{ marginTop: 5, fontSize: 9, color: INK2, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <Lock size={9} /> {Math.min(valor, logro.umbral).toLocaleString("es-CO")} / {logro.umbral.toLocaleString("es-CO")}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
