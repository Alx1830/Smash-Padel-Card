"use client";

import { motion } from "motion/react";
import { Home, Compass } from "lucide-react";
import Link from "next/link";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: BG0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      textAlign: "center",
      padding: "24px",
    }}>

      {/* [BG] gradiente base */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: `
          radial-gradient(circle at center, rgba(46,230,193,0.08), transparent 70%),
          linear-gradient(180deg, #0a1320 0%, ${BG0} 100%)
        `,
      }} />

      {/* [BG-GRID] rejilla animada */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
        WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 80%)",
        maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 80%)",
        animation: "gridPan 6s linear infinite",
      }} />

      {/* [ORB-1] turquesa */}
      <motion.div
        aria-hidden
        animate={{
          x: [0, 40, -40, 0],
          y: [0, 20, -20, 0],
          rotate: [0, 10, -10, 0],
        }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "35%", left: "30%",
          width: "320px", height: "320px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COURT}28, transparent 70%)`,
          filter: "blur(40px)",
          zIndex: 0,
        }}
      />

      {/* [ORB-2] amarillo-verde */}
      <motion.div
        aria-hidden
        animate={{
          x: [0, -40, 40, 0],
          y: [0, -20, 20, 0],
        }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        style={{
          position: "absolute",
          bottom: "30%", right: "25%",
          width: "280px", height: "280px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${BALL}18, transparent 70%)`,
          filter: "blur(40px)",
          zIndex: 0,
        }}
      />

      {/* [CONTENT] */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: "520px" }}>

        {/* Logo */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "10px",
          marginBottom: "48px",
        }}>
          <span style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: COURT, boxShadow: `0 0 12px ${COURT}`,
            display: "inline-block",
            animation: "dot-pulse 2s ease-in-out infinite",
          }} />
          <span style={{
            fontFamily: DISP, fontSize: "17px", fontWeight: 900, letterSpacing: "0.02em",
            background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            FaceBinder
          </span>
        </div>

        {/* 404 */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            fontFamily: DISP,
            fontSize: "clamp(80px, 18vw, 140px)",
            lineHeight: 0.85,
            margin: "0 0 24px",
            letterSpacing: "-0.04em",
            background: `linear-gradient(135deg, #4ff0ff, ${COURT}, ${BALL})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}
        >
          404
        </motion.h1>

        {/* Título */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            fontFamily: DISP, fontSize: "clamp(20px, 4vw, 28px)",
            color: INK0, margin: "0 0 12px", letterSpacing: "-0.01em",
          }}
        >
          Página no encontrada
        </motion.p>

        {/* Descripción */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            fontFamily: MONO, fontSize: "13px",
            color: INK1, lineHeight: 1.8, letterSpacing: "0.04em",
            margin: "0 0 40px",
          }}
        >
          La página que buscas fue movida,<br />
          eliminada o nunca existió.
        </motion.p>

        {/* Botones */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}
        >
          <Link href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "11px 24px", borderRadius: "10px",
            background: `linear-gradient(90deg, ${COURT}, ${BALL})`,
            color: BG0, fontFamily: MONO, fontSize: "12px",
            fontWeight: 700, letterSpacing: "0.08em",
            textDecoration: "none",
            boxShadow: `0 0 24px ${COURT}44`,
            transition: "opacity 0.2s",
          }}>
            <Home size={15} />
            Ir al dashboard
          </Link>

          <Link href="/market" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "11px 24px", borderRadius: "10px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)",
            color: INK1, fontFamily: MONO, fontSize: "12px",
            fontWeight: 600, letterSpacing: "0.08em",
            textDecoration: "none",
            transition: "border-color 0.2s, color 0.2s",
          }}>
            <Compass size={15} />
            Ver market
          </Link>
        </motion.div>

        {/* Código de error */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{
            fontFamily: MONO, fontSize: "10px",
            color: INK2, marginTop: "48px",
            letterSpacing: "0.15em", textTransform: "uppercase",
          }}
        >
          Error 404 · Recurso no encontrado
        </motion.p>
      </div>
    </div>
  );
}
