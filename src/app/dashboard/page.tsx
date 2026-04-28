"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FollowersWidget } from "@/components/FollowersWidget";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export default function DashboardHome() {
  const router   = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState<string | null>(null);
  const [userId,   setUserId]   = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("players")
        .select("username")
        .eq("user_id", user.id)
        .single();
      setUsername(data?.username ?? null);
      setLoading(false);
    }
    load();
  }, []);

  function handleVerPerfil() {
    if (username) {
      window.location.href = `/${username}`;
    }
  }

  return (
    <div className="page-container" style={{ minHeight: "100vh" }}>
      <style>{`
        .page-container { padding: 24px; }
        @media (min-width: 768px) { .page-container { padding: 48px; } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "48px" }}>
        <div style={{
          fontFamily: MONO, fontSize: "11px",
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: COURT, display: "flex", alignItems: "center", gap: "10px",
          marginBottom: "12px",
        }}>
          <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
          Panel de control
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "36px", color: INK0, margin: 0 }}>
          Inicio
        </h1>
      </div>

      {/* Fila de widgets */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "flex-start" }}>

      {/* Tarjeta ver perfil */}
      <div style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px", padding: "32px 36px",
        background: "rgba(255,255,255,0.02)",
        display: "inline-flex", flexDirection: "column",
        gap: "20px", minWidth: "280px",
      }}>
        <div>
          <p style={{
            fontFamily: MONO, fontSize: "10px", color: INK2,
            letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 8px",
          }}>
            Mi carta pública
          </p>
          <p style={{ fontFamily: DISP, fontSize: "20px", color: INK0, margin: 0 }}>
            {loading ? "Cargando…" : username ? `@${username}` : "Sin usuario asignado"}
          </p>
          {!loading && username && (
            <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: "4px 0 0", letterSpacing: "0.08em" }}>
              facebinder.com/<span style={{ color: COURT }}>{username}</span>
            </p>
          )}
        </div>

        {!loading && (
          username ? (
            /* ── Tiene username: mostrar botón ── */
            <button
              onClick={handleVerPerfil}
              style={{
                padding: "11px 24px", borderRadius: "10px",
                background: `linear-gradient(90deg, ${COURT}, ${BALL})`,
                border: "none", cursor: "pointer",
                fontFamily: MONO, fontSize: "12px", fontWeight: 700,
                color: BG0, letterSpacing: "0.08em",
                alignSelf: "flex-start",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
            >
              Ver perfil →
            </button>
          ) : (
            /* ── Sin username: advertencia + link a perfil ── */
            <div style={{
              padding: "14px 18px", borderRadius: "10px",
              background: "rgba(255,200,0,0.07)",
              border: "1px solid rgba(255,200,0,0.2)",
            }}>
              <p style={{
                fontFamily: MONO, fontSize: "11px", color: "#ffc800",
                margin: "0 0 10px", letterSpacing: "0.05em", lineHeight: 1.6,
              }}>
                ⚠ Primero debes asignar un usuario en tu perfil para poder ver tu carta pública.
              </p>
              <button
                onClick={() => router.push("/dashboard/perfil")}
                style={{
                  padding: "7px 16px", borderRadius: "7px",
                  background: "transparent",
                  border: "1px solid rgba(255,200,0,0.4)",
                  color: "#ffc800", cursor: "pointer",
                  fontFamily: MONO, fontSize: "11px", letterSpacing: "0.08em",
                }}
              >
                Ir a Mi Perfil →
              </button>
            </div>
          )
        )}
      </div>

      {/* Widget últimos seguidores — al lado de Mi carta pública */}
      {userId && <FollowersWidget userId={userId} />}

      </div>{/* fin fila widgets */}
    </div>
  );
}
