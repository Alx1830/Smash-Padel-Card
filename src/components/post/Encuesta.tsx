"use client";

/**
 * La encuesta de una noticia.
 *
 * Votar exige sesión —la RLS de `post_poll_votes` no acepta otra cosa— pero
 * los resultados los ve cualquiera: alguien que llega desde WhatsApp tiene que
 * poder ver en qué anda la comunidad aunque no vote.
 *
 * Los conteos se arman en el navegador a partir de la lista de votos. Con las
 * cantidades de una encuesta de una nota alcanza de sobra; si algún día una
 * junta miles, conviene una vista agregada en la base.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const COURT = "#2ee6c1";
const ERR   = "#ff5d5d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export interface EncuestaDatos {
  id: string;
  question: string;
  closes_at: string | null;
  opciones: { id: string; label: string }[];
}

export function Encuesta({ datos }: { datos: EncuestaDatos }) {
  const supabase = createClient();

  const [usuario, setUsuario] = useState<string | null>(null);
  const [votos, setVotos]     = useState<{ option_id: string; user_id: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const cerrada = Boolean(datos.closes_at && new Date(datos.closes_at) <= new Date());

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("post_poll_votes")
      .select("option_id, user_id")
      .eq("poll_id", datos.id);
    setVotos(data ?? []);
    setCargando(false);
  }, [supabase, datos.id]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!vivo) return;
      setUsuario(user?.id ?? null);
      await cargar();
    })();
    return () => { vivo = false; };
  }, [supabase, cargar]);

  const miVoto = usuario ? votos.find((v) => v.user_id === usuario)?.option_id ?? null : null;
  const total  = votos.length;

  /** Cambiar de opinión es un upsert sobre (poll_id, user_id), no una fila nueva. */
  async function votar(optionId: string) {
    if (!usuario || cerrada) return;
    setEnviando(true);
    setError(null);
    const { error: err } = await supabase
      .from("post_poll_votes")
      .upsert({ poll_id: datos.id, user_id: usuario, option_id: optionId },
              { onConflict: "poll_id,user_id" });
    setEnviando(false);
    if (err) { setError(`No se pudo votar: ${err.message}`); return; }
    await cargar();
  }

  // Los resultados aparecen cuando ya votaste o cuando la encuesta cerró: si
  // se ven antes, el primer resultado arrastra a los que siguen.
  const mostrarResultados = Boolean(miVoto) || cerrada;

  return (
    <section style={{
      margin: "34px 0", padding: "22px 24px", borderRadius: 14,
      border: `1px solid ${COURT}33`, background: "rgba(46,230,193,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
        <BarChart3 size={15} color={COURT} />
        <span style={{
          fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em",
          textTransform: "uppercase", color: COURT,
        }}>
          {cerrada ? "Encuesta cerrada" : "Encuesta"}
        </span>
      </div>

      <h3 style={{ fontFamily: DISP, fontSize: 18, fontWeight: 700, color: INK0, margin: "0 0 16px", lineHeight: 1.3 }}>
        {datos.question}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {datos.opciones.map((o) => {
          const cuantos = votos.filter((v) => v.option_id === o.id).length;
          const pct = total ? Math.round((cuantos / total) * 100) : 0;
          const elegida = miVoto === o.id;

          return (
            <button
              key={o.id}
              type="button"
              disabled={!usuario || cerrada || enviando}
              onClick={() => votar(o.id)}
              style={{
                position: "relative", overflow: "hidden", textAlign: "left",
                padding: "12px 14px", borderRadius: 10,
                border: `1px solid ${elegida ? COURT : "rgba(255,255,255,0.1)"}`,
                background: "rgba(255,255,255,0.02)",
                cursor: !usuario || cerrada ? "default" : "pointer",
              }}
            >
              {/* La barra vive detrás del texto, no al lado: así la opción
                  ocupa el mismo lugar antes y después de votar. */}
              {mostrarResultados && (
                <span style={{
                  position: "absolute", inset: 0, width: `${pct}%`,
                  background: elegida ? "rgba(46,230,193,0.20)" : "rgba(255,255,255,0.06)",
                  transition: "width 420ms ease",
                }} />
              )}

              <span style={{
                position: "relative", display: "flex", alignItems: "center", gap: 9,
                fontFamily: MONO, fontSize: 12.5, color: INK0,
              }}>
                {elegida && <Check size={13} color={COURT} />}
                <span style={{ flex: 1 }}>{o.label}</span>
                {mostrarResultados && (
                  <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: elegida ? COURT : INK2 }}>
                    {pct}%
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p style={{ fontFamily: MONO, fontSize: 11.5, color: ERR, margin: "12px 0 0" }}>{error}</p>}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        {enviando && <Loader2 size={12} color={INK2} className="pd-girando" />}
        <span style={{ fontFamily: MONO, fontSize: 10.5, color: INK2 }}>
          {cargando ? "Cargando votos…" : total === 1 ? "1 voto" : `${total} votos`}
          {miVoto && !cerrada && " · podés cambiar tu voto"}
        </span>

        {!usuario && !cargando && (
          <Link href="/login" style={{
            fontFamily: MONO, fontSize: 10.5, color: COURT, textDecoration: "underline",
          }}>
            Entrá con tu cuenta para votar
          </Link>
        )}
      </div>
    </section>
  );
}
