"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isDisposableEmail } from "@/lib/disposable-emails";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

function IconGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.386-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.85l3.25-3.138C18.189 1.186 15.479 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.885 0 11.954-4.823 11.954-12.015 0-.795-.084-1.588-.239-2.356H12.24z"/>
    </svg>
  );
}

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode]       = useState<Mode>("login");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);

  const supabase = createClient();

  async function handleGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { setError("Correo o contraseña incorrectos"); return; }
      window.location.href = "/dashboard";
    } else {
      if (isDisposableEmail(email)) {
        setError("No se permiten correos temporales o desechables.");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (error) { setError(error.message); return; }
      setDone(true);
    }
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
    <main style={{
      minHeight: "100vh", background: BG0,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes gridPan { from { background-position: 0 0; } to { background-position: 80px 80px; } }
        .login-input:focus { border-color: ${COURT}80 !important; }
        .tab-btn { transition: color 0.2s, border-color 0.2s; }
      `}</style>

      {/* Fondo */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 50% 20%, rgba(46,230,193,0.22), transparent 60%),
          radial-gradient(ellipse 60% 40% at 85% 75%, rgba(255,79,216,0.15), transparent 70%),
          radial-gradient(ellipse 60% 40% at 15% 65%, rgba(79,240,255,0.12), transparent 70%),
          linear-gradient(180deg, #0a1320 0%, ${BG0} 100%)
        `,
      }} />
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
        WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 80%)",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 80%)",
        animation: "gridPan 6s linear infinite",
      }} />

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
          <span style={{
            fontFamily: DISP, fontSize: "22px",
            background: `linear-gradient(135deg, #4ff0ff, ${COURT}, ${BALL})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text", userSelect: "none",
          }}>
            FaceBinder
          </span>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.08em", margin: "6px 0 0" }}>
            Tu binder digital de Pokémon TCG
          </p>
        </div>

        {done ? (
          /* Registro exitoso */
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>📬</div>
            <p style={{ fontFamily: MONO, fontSize: "13px", color: INK0, marginBottom: "8px" }}>
              ¡Cuenta creada!
            </p>
            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, lineHeight: 1.7 }}>
              Revisa tu correo <b style={{ color: COURT }}>{email}</b> para confirmar tu cuenta y luego inicia sesión.
            </p>
            <button
              onClick={() => { setDone(false); setMode("login"); }}
              style={{
                marginTop: "20px", fontFamily: MONO, fontSize: "12px",
                color: COURT, background: "none", border: "none",
                cursor: "pointer", letterSpacing: "0.08em",
              }}
            >
              ← Ir al inicio de sesión
            </button>
          </div>
        ) : (
          <>
            {/* Tabs login / registro */}
            <div style={{
              display: "flex", marginBottom: "24px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}>
              {(["login", "register"] as Mode[]).map(m => (
                <button
                  key={m}
                  className="tab-btn"
                  onClick={() => { setMode(m); setError(""); }}
                  style={{
                    flex: 1, padding: "10px 0",
                    fontFamily: MONO, fontSize: "11px", letterSpacing: "0.12em",
                    textTransform: "uppercase", background: "none", border: "none",
                    cursor: "pointer",
                    color: mode === m ? COURT : INK2,
                    borderBottom: `2px solid ${mode === m ? COURT : "transparent"}`,
                    marginBottom: "-1px",
                    transition: "color 0.2s",
                  }}
                >
                  {m === "login" ? "Iniciar sesión" : "Registrarse"}
                </button>
              ))}
            </div>

            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: "10px", padding: "12px 20px", borderRadius: "10px",
                background: `linear-gradient(90deg, ${COURT}, ${BALL})`,
                border: "none", cursor: "pointer",
                fontFamily: MONO, fontSize: "13px", fontWeight: 700,
                color: BG0, letterSpacing: "0.05em",
                opacity: loading ? 0.7 : 1, marginBottom: "16px",
                transition: "opacity 0.2s",
              }}
            >
              <IconGoogle />
              Continuar con Google
            </button>

            {/* Separador */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.1em" }}>O</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
            </div>

            {/* Formulario email + contraseña */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                className="login-input"
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
              <input
                className="login-input"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                style={inputStyle}
              />

              {error && (
                <p style={{ fontFamily: MONO, fontSize: "11px", color: "#ff4f4f", margin: 0 }}>
                  ✕ {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                style={{
                  width: "100%", padding: "12px 20px", borderRadius: "10px",
                  background: loading || !email || !password
                    ? "rgba(255,255,255,0.08)"
                    : `linear-gradient(90deg, ${COURT}, ${BALL})`,
                  border: "none",
                  cursor: loading || !email || !password ? "not-allowed" : "pointer",
                  fontFamily: MONO, fontSize: "13px", fontWeight: 700,
                  color: loading || !email || !password ? INK2 : BG0,
                  letterSpacing: "0.05em", transition: "all 0.2s",
                  marginTop: "4px",
                }}
              >
                {loading
                  ? mode === "login" ? "Entrando..." : "Creando cuenta..."
                  : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            </form>

            {/* Términos */}
            <p style={{
              fontFamily: MONO, fontSize: "10px", color: INK2,
              textAlign: "center", marginTop: "20px",
              letterSpacing: "0.05em", lineHeight: 1.6,
            }}>
              Al continuar aceptas nuestros{" "}
              <span style={{ color: COURT, cursor: "pointer" }}>Términos de Uso</span>{" "}
              y{" "}
              <span style={{ color: COURT, cursor: "pointer" }}>Política de Privacidad</span>
            </p>
          </>
        )}
      </div>

      <div style={{
        position: "absolute", bottom: "24px",
        fontFamily: MONO, fontSize: "10px",
        letterSpacing: "0.2em", textTransform: "uppercase", color: INK2,
      }}>
        FACEBINDER · POKÉMON TCG
      </div>
    </main>
  );
}
