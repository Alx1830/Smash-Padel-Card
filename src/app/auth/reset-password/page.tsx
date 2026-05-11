"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const [password, setPassword]   = useState("");
  const [confirm,  setConfirm]    = useState("");
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState("");
  const [done,     setDone]       = useState(false);
  const [ready,    setReady]      = useState(false);

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type      = searchParams.get("type");

    if (tokenHash && type === "recovery") {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
        .then(({ error }) => {
          if (!error) setReady(true);
          else setError("El enlace es inválido o ha expirado.");
        });
      return;
    }

    // Fallback: flujo antiguo con hash en URL (#access_token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    if (password.length < 6)  { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError("No se pudo actualizar la contraseña. Intenta de nuevo."); return; }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2500);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px", borderRadius: "10px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: INK0, fontFamily: MONO, fontSize: "13px",
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  return (
    <>
      {done ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>✅</div>
          <p style={{ fontFamily: MONO, fontSize: "13px", color: INK0, marginBottom: "8px" }}>¡Contraseña actualizada!</p>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, lineHeight: 1.7 }}>
            Redirigiendo a tu dashboard...
          </p>
        </div>
      ) : !ready ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>⏳</div>
          <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, lineHeight: 1.7 }}>
            {error || "Verificando enlace... Si llevas más de 10 segundos aquí, el enlace puede haber expirado."}
          </p>
          <button onClick={() => router.push("/login")}
            style={{ marginTop: "16px", fontFamily: MONO, fontSize: "12px", color: COURT, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.08em" }}>
            ← Volver al login
          </button>
        </div>
      ) : (
        <>
          <h2 style={{ fontFamily: DISP, fontSize: "18px", color: INK0, margin: "0 0 8px", textAlign: "center" }}>Nueva contraseña</h2>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, lineHeight: 1.7, margin: "0 0 24px", textAlign: "center" }}>
            Elige una contraseña segura para tu cuenta.
          </p>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              className="rp-input"
              type="password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
            <input
              className="rp-input"
              type="password"
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
            {error && <p style={{ fontFamily: MONO, fontSize: "11px", color: "#ff4f4f", margin: 0 }}>✕ {error}</p>}
            <button
              type="submit"
              disabled={loading || !password || !confirm}
              style={{
                width: "100%", padding: "12px 20px", borderRadius: "10px",
                background: loading || !password || !confirm ? "rgba(255,255,255,0.08)" : `linear-gradient(90deg, ${COURT}, ${BALL})`,
                border: "none", cursor: loading || !password || !confirm ? "not-allowed" : "pointer",
                fontFamily: MONO, fontSize: "13px", fontWeight: 700,
                color: loading || !password || !confirm ? INK2 : BG0,
                letterSpacing: "0.05em", transition: "all 0.2s", marginTop: "4px",
              }}
            >
              {loading ? "Guardando..." : "Guardar contraseña →"}
            </button>
          </form>
        </>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <main style={{ minHeight: "100vh", background: BG0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <style>{`.rp-input:focus { border-color: ${COURT}80 !important; }`}</style>

      {/* Fondo */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `radial-gradient(ellipse 80% 60% at 50% 20%, rgba(46,230,193,0.22), transparent 60%), linear-gradient(180deg, #0a1320 0%, ${BG0} 100%)` }} />

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: "400px", margin: "0 24px",
        background: "rgba(10,14,26,0.88)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "20px", padding: "40px 36px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(46,230,193,0.1)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <span style={{ fontFamily: DISP, fontSize: "22px", background: `linear-gradient(135deg, #4ff0ff, ${COURT}, ${BALL})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", userSelect: "none" }}>
            FaceBinder
          </span>
        </div>

        <Suspense fallback={
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>⏳</div>
            <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2 }}>Cargando...</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
