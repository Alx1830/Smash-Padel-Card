"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { usePushPermission, isPushDismissed, savePushDismiss } from "@/hooks/usePushPermission";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface PushPermissionBannerProps {
  onDismiss: () => void;
}

/** Detecta si la PWA está instalada (display-mode: standalone) */
function isPWAInstalled(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari
  if ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone) return true;
  // Android / Chrome
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function PushPermissionBanner({ onDismiss }: PushPermissionBannerProps) {
  const { permissionState, requestPermission } = usePushPermission();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (permissionState !== "default") return;
    if (isPushDismissed()) return;

    // En iOS, solo mostrar si la PWA está instalada
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && !isPWAInstalled()) return;

    // Pequeño delay para que la entrada sea visible
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, [permissionState]);

  function dismiss() {
    savePushDismiss();
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 280);
  }

  async function handleActivar() {
    await requestPermission();
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 280);
  }

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes push-banner-in {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes push-banner-out {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to   { opacity: 0; transform: translateX(-50%) translateY(20px); }
        }
        .push-banner {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 32px);
          max-width: 480px;
          z-index: 90;
          animation: push-banner-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .push-banner.leaving {
          animation: push-banner-out 0.28s ease forwards;
        }
        @media (min-width: 1024px) {
          .push-banner {
            bottom: 24px;
            left: calc(260px + 16px);
            transform: translateX(0);
          }
          .push-banner.leaving {
            animation: push-banner-out-desktop 0.28s ease forwards;
          }
        }
        @keyframes push-banner-out-desktop {
          from { opacity: 1; transform: translateX(0) translateY(0); }
          to   { opacity: 0; transform: translateX(0) translateY(16px); }
        }
        .push-btn-ghost {
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: ${MONO};
          font-size: 11px;
          color: ${INK2};
          padding: 8px 12px;
          border-radius: 8px;
          transition: color 0.15s, background 0.15s;
          letter-spacing: 0.06em;
        }
        .push-btn-ghost:hover {
          color: ${INK0};
          background: rgba(255,255,255,0.06);
        }
        .push-btn-activar {
          background: ${COURT};
          border: none;
          cursor: pointer;
          font-family: ${MONO};
          font-size: 11px;
          font-weight: 700;
          color: #05070d;
          padding: 8px 16px;
          border-radius: 8px;
          letter-spacing: 0.06em;
          transition: opacity 0.15s, transform 0.15s;
        }
        .push-btn-activar:hover {
          opacity: 0.88;
          transform: translateY(-1px);
        }
        .push-btn-x {
          position: absolute;
          top: 8px; right: 8px;
          width: 24px; height: 24px;
          border-radius: 6px;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: ${INK2};
          transition: background 0.15s, color 0.15s;
        }
        .push-btn-x:hover {
          background: rgba(255,255,255,0.08);
          color: ${INK0};
        }
      `}</style>

      <div className={`push-banner${leaving ? " leaving" : ""}`}>
        <div style={{
          background: "#0d1a2a",
          border: "1px solid rgba(46,230,193,0.3)",
          borderRadius: 16,
          padding: "16px",
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          position: "relative",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
        }}>
          {/* Botón X */}
          <button className="push-btn-x" onClick={dismiss} aria-label="Cerrar">
            <X size={14} strokeWidth={2} />
          </button>

          {/* Icono */}
          <div style={{
            width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
            background: "rgba(46,230,193,0.1)",
            border: "1px solid rgba(46,230,193,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Bell size={20} color={COURT} strokeWidth={1.8} />
          </div>

          {/* Texto + botones */}
          <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
            <p style={{
              fontFamily: DISP, fontSize: "13px", fontWeight: 700,
              color: INK0, margin: "0 0 4px", letterSpacing: "0.01em",
            }}>
              Activa las notificaciones
            </p>
            <p style={{
              fontFamily: MONO, fontSize: "11px", color: INK2,
              margin: "0 0 12px", letterSpacing: "0.04em", lineHeight: 1.5,
            }}>
              Entérate cuando una carta de tu wishlist esté disponible
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="push-btn-ghost" onClick={dismiss}>
                Ahora no
              </button>
              <button className="push-btn-activar" onClick={handleActivar}>
                Activar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
