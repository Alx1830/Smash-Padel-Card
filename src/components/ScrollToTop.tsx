"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

const COURT = "#2ee6c1";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() { setVisible(window.scrollY > 300); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Volver arriba"
      style={{
        position: "fixed",
        bottom: "96px", /* above mobile tab bar */
        right: "20px",
        zIndex: 100,
        width: 40, height: 40,
        borderRadius: "50%",
        background: "rgba(10,14,26,0.9)",
        border: `1px solid ${COURT}50`,
        backdropFilter: "blur(12px)",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 12px ${COURT}20`,
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${COURT}99`;
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 24px rgba(0,0,0,0.5), 0 0 20px ${COURT}40`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${COURT}50`;
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 20px rgba(0,0,0,0.4), 0 0 12px ${COURT}20`;
      }}
    >
      <ChevronUp size={18} color={COURT} strokeWidth={2} />
    </button>
  );
}
