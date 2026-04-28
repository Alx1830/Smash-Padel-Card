"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
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

function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [sent, setSent]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [error, setError]       = useState("");

  const supabase = createClient();

  async function handleGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: BG0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* [BG] gradientes */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 50% 20%, rgba(46,230,193,0.22), transparent 60%),
          radial-gradient(ellipse 60% 40% at 85% 75%, rgba(255,79,216,0.15), transparent 70%),
          radial-gradient(ellipse 60% 40% at 15% 65%, rgba(79,240,255,0.12), transparent 70%),
          linear-gradient(180deg, #0a1320 0%, ${BG0} 100%)
        `,
      }} />

      {/* [BG-GRID] rejilla animada */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
        WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 80%)",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 80%)",
        animation: "gridPan 6s linear infinite",
      }} />

      {/* [CARD] formulario */}
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: "400px",
        margin: "0 24px",
        background: "rgba(10,14,26,0.85)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "20px",
        padding: "40px 36px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(46,230,193,0.1)",
      }}>

        {/* Logo + título */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ marginBottom: "20px" }}>
            <span style={{
              fontFamily: DISP, fontSize: "20px", letterSpacing: "0.08em",
              color: "#f5f7fb", textTransform: "uppercase",
            }}>FACEBINDER</span>
          </div>
          <h1 style={{
            fontFamily: DISP, fontSize: "22px", color: "#f5f7fb",
            margin: "0 0 8px", letterSpacing: "-0.01em",
          }}>
            Bienvenido coleccionista
          </h1>
          <p style={{
            fontFamily: MONO, fontSize: "12px", color: INK2,
            letterSpacing: "0.08em", margin: 0,
          }}>
            Tu binder digital de Pokémon TCG
          </p>
        </div>

        {sent ? (
          /* Confirmación magic link */
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "40px", marginBottom: "16px",
            }}>📬</div>
            <p style={{ fontFamily: MONO, fontSize: "13px", color: "#f5f7fb", marginBottom: "8px" }}>
              Revisa tu correo
            </p>
            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2 }}>
              Te enviamos un enlace mágico a <b style={{ color: COURT }}>{email}</b>
            </p>
          </div>
        ) : (
          <>
            {/* Botón Google */}
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
                transition: "opacity 0.2s",
                opacity: loading ? 0.7 : 1,
                marginBottom: "16px",
              }}
            >
              <IconGoogle />
              Continuar con Google
            </button>

            {/* Separador */}
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              marginBottom: "16px",
            }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.1em" }}>O</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
            </div>

            {/* Email */}
            {!showEmail ? (
              <button
                onClick={() => setShowEmail(true)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  gap: "10px", padding: "12px 20px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer",
                  fontFamily: MONO, fontSize: "13px", fontWeight: 600,
                  color: "#f5f7fb", letterSpacing: "0.05em",
                  transition: "background 0.2s",
                }}
              >
                <IconMail />
                Continuar con Correo
              </button>
            ) : (
              <form onSubmit={handleEmail}>
                <input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: "10px",
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${error ? "#ff4f4f" : "rgba(255,255,255,0.12)"}`,
                    color: "#f5f7fb", fontFamily: MONO, fontSize: "13px",
                    outline: "none", marginBottom: "12px",
                    boxSizing: "border-box",
                  }}
                />
                {error && (
                  <p style={{ fontFamily: MONO, fontSize: "11px", color: "#ff4f4f", marginBottom: "12px" }}>
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || !email}
                  style={{
                    width: "100%", padding: "12px 20px", borderRadius: "10px",
                    background: loading || !email
                      ? "rgba(255,255,255,0.1)"
                      : `linear-gradient(90deg, ${COURT}, ${BALL})`,
                    border: "none", cursor: loading || !email ? "not-allowed" : "pointer",
                    fontFamily: MONO, fontSize: "13px", fontWeight: 700,
                    color: loading || !email ? INK2 : BG0,
                    letterSpacing: "0.05em", transition: "all 0.2s",
                  }}
                >
                  {loading ? "Enviando..." : "Enviar enlace mágico"}
                </button>
              </form>
            )}

            {/* Términos */}
            <p style={{
              fontFamily: MONO, fontSize: "10px", color: INK2,
              textAlign: "center", marginTop: "24px",
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

      {/* Strip inferior */}
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
