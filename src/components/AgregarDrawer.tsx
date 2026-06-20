"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { PokemonSetsSection } from "@/components/PokemonSetsSection";

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface AgregarDrawerProps {
  userId: string;
  onClose: () => void;
}

export function AgregarDrawer({ userId, onClose }: AgregarDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  /* Lock body scroll while open */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* Animate in */
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    el.style.transform = "translateY(100%)";
    el.style.transition = "none";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform  = "translateY(0%)";
      });
    });
  }, []);

  function handleClose() {
    const el = panelRef.current;
    if (!el) { onClose(); return; }
    el.style.transition = "transform 0.28s cubic-bezier(0.4, 0, 1, 1)";
    el.style.transform  = "translateY(100%)";
    setTimeout(onClose, 280);
  }

  return (
    <>
      <style>{`
        .agregar-drawer-backdrop {
          animation: agregar-fadeIn 0.22s ease forwards;
        }
        @keyframes agregar-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .agregar-drawer-close {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: ${INK2};
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          width: 40px; height: 40px;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          flex-shrink: 0;
        }
        .agregar-drawer-close:hover {
          background: rgba(255,255,255,0.11);
          border-color: rgba(255,255,255,0.2);
          color: ${INK0};
        }
        .agregar-drawer-pill {
          width: 40px; height: 4px; border-radius: 2px;
          background: rgba(255,255,255,0.18);
          margin: 0 auto 0;
          flex-shrink: 0;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="agregar-drawer-backdrop"
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(5,7,13,0.8)",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          zIndex: 1101,
          height: "92dvh",
          background: "#080f18",
          borderRadius: "20px 20px 0 0",
          borderTop: "1px solid rgba(46,230,193,0.18)",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 -24px 80px rgba(0,0,0,0.6), 0 -1px 0 rgba(46,230,193,0.08)",
          willChange: "transform",
        }}
      >
        {/* Drag pill */}
        <div style={{ padding: "14px 0 0", flexShrink: 0, cursor: "grab" }} onClick={handleClose}>
          <div className="agregar-drawer-pill" />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <div>
            <p style={{
              fontFamily: MONO, fontSize: "10px", letterSpacing: "0.22em",
              textTransform: "uppercase", color: COURT,
              display: "flex", alignItems: "center", gap: "8px",
              margin: "0 0 6px",
            }}>
              <span style={{ width: "16px", height: "1px", background: COURT, display: "inline-block" }} />
              Mi Colección
            </p>
            <h2 style={{
              fontFamily: DISP, fontSize: "22px", color: INK0,
              fontWeight: 900, margin: 0, letterSpacing: "-0.01em",
            }}>
              Agregar al inventario
            </h2>
          </div>

          <button className="agregar-drawer-close" onClick={handleClose} aria-label="Cerrar">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          <PokemonSetsSection userId={userId} />
        </div>
      </div>
    </>
  );
}
