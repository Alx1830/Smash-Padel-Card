"use client";

/**
 * Moderación de las referencias de la comunidad (la pestaña Reseñas de cada
 * perfil). Las referencias salen publicadas al instante; las que alguien
 * reporta llegan acá, y el admin decide si ocultarla o dejarla. Volver a
 * mostrar una la deja sin reportes.
 *
 * Los datos salen de referencias_admin(), que rechaza a quien no sea admin.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Estrellas, fechaCorta } from "@/components/Resenas";
import { Flag, Eye, EyeOff, ShieldCheck } from "lucide-react";

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const CRIT  = "#ff5d5d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";

interface Fila {
  id: string;
  perfil: string;
  autor: string;
  estrellas: number;
  comentario: string;
  creada: string;
  editada: string | null;
  oculta: boolean;
  reportes: number;
  motivos: string[];
}

export default function ReferenciasAdminPage() {
  const router = useRouter();
  const [soloReportadas, setSoloReportadas] = useState(true);
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);

  const cargar = useCallback((solo: boolean) =>
    createClient().rpc("referencias_admin", { p_solo_reportadas: solo }).then(({ data, error }) => {
      if (error) { router.replace("/dashboard"); return; }
      setFilas((data ?? []) as Fila[]);
    }), [router]);

  useEffect(() => {
    let vigente = true;
    createClient().rpc("referencias_admin", { p_solo_reportadas: soloReportadas }).then(({ data, error }) => {
      if (!vigente) return;
      if (error) { router.replace("/dashboard"); return; }
      setFilas((data ?? []) as Fila[]);
    });
    return () => { vigente = false; };
  }, [router, soloReportadas]);

  const moderar = async (f: Fila, ocultar: boolean) => {
    setTrabajando(f.id);
    await createClient().rpc("referencia_moderar", { p_referencia: f.id, p_ocultar: ocultar });
    setTrabajando(null);
    cargar(soloReportadas);
  };

  return (
    <div className="rf-page">
      <style>{`
        .rf-page { min-height: 100vh; background: #05070d; padding: 40px 24px; }
        .rf-wrap { max-width: 1400px; }
        .rf-pildora { font-family: ${MONO}; font-size: 11px; padding: 8px 14px; border-radius: 999px; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1); background: transparent; color: ${INK1}; }
        .rf-pildora.on { border-color: ${COURT}; color: ${COURT}; background: rgba(46,230,193,0.08); }
        .rf-lista { display: flex; flex-direction: column; gap: 10px; max-width: 900px; }
        .rf-fila { padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02); }
        .rf-fila.oculta { opacity: 0.55; }
        .rf-btn { display: inline-flex; align-items: center; gap: 6px; font-family: ${MONO}; font-size: 11px;
          padding: 8px 13px; border-radius: 999px; cursor: pointer; background: transparent; }
        .rf-btn:disabled { opacity: 0.5; cursor: default; }
        @media (max-width: 767px) { .rf-page { padding: 28px 16px; } }
      `}</style>

      <div className="rf-wrap">
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
            Moderación
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0 }}>
            Referencias
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: "8px 0 0" }}>
            Salen publicadas al instante; las reportadas esperan acá tu decisión
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button className={"rf-pildora" + (soloReportadas ? " on" : "")} onClick={() => setSoloReportadas(true)}>Reportadas</button>
          <button className={"rf-pildora" + (!soloReportadas ? " on" : "")} onClick={() => setSoloReportadas(false)}>Todas</button>
        </div>

        {filas === null ? null : filas.length === 0 ? (
          <div style={{ border: "1px dashed rgba(255,255,255,0.14)", borderRadius: 12, padding: "30px 22px", maxWidth: 520, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <ShieldCheck size={24} color={COURT} strokeWidth={1.6} />
            <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: 0, textAlign: "center" }}>
              {soloReportadas ? "No hay referencias reportadas. Cuando alguien reporte una, te llega una notificación." : "Todavía nadie ha dejado referencias."}
            </p>
          </div>
        ) : (
          <div className="rf-lista">
            {filas.map(f => (
              <div key={f.id} className={"rf-fila" + (f.oculta ? " oculta" : "")}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <p style={{ fontFamily: MONO, fontSize: 11, color: INK1, margin: 0 }}>
                    <Link href={`/${f.autor}`} style={{ color: INK0, textDecoration: "none" }}>@{f.autor}</Link>
                    {" → "}
                    <Link href={`/${f.perfil}/resenas`} style={{ color: INK0, textDecoration: "none" }}>@{f.perfil}</Link>
                  </p>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Estrellas n={f.estrellas} />
                    <span style={{ fontFamily: MONO, fontSize: 9, color: INK2 }}>{fechaCorta(f.creada)}{f.editada ? " · editada" : ""}</span>
                  </span>
                </div>
                <p style={{ fontFamily: MONO, fontSize: 12, color: INK0, lineHeight: 1.6, margin: "10px 0 0", overflowWrap: "anywhere" }}>{f.comentario}</p>
                {f.reportes > 0 && (
                  <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(255,93,93,0.06)", border: "1px solid rgba(255,93,93,0.2)" }}>
                    <p style={{ fontFamily: MONO, fontSize: 10, color: CRIT, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                      <Flag size={11} /> {f.reportes} {f.reportes === 1 ? "reporte" : "reportes"}
                    </p>
                    {f.motivos.map((m, i) => (
                      <p key={i} style={{ fontFamily: MONO, fontSize: 10, color: INK1, margin: "5px 0 0", overflowWrap: "anywhere" }}>“{m}”</p>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {f.oculta ? (
                    <button className="rf-btn" style={{ border: `1px solid ${COURT}`, color: COURT }} disabled={trabajando === f.id} onClick={() => moderar(f, false)}>
                      <Eye size={13} /> Volver a mostrar
                    </button>
                  ) : (
                    <>
                      <button className="rf-btn" style={{ border: `1px solid ${CRIT}`, color: CRIT }} disabled={trabajando === f.id} onClick={() => moderar(f, true)}>
                        <EyeOff size={13} /> Ocultar
                      </button>
                      {f.reportes > 0 && (
                        <button className="rf-btn" style={{ border: "1px solid rgba(255,255,255,0.14)", color: INK1 }} disabled={trabajando === f.id} onClick={() => moderar(f, false)}>
                          <ShieldCheck size={13} /> Está bien, quitar reportes
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
