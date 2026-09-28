"use client";

/** Tarjetas de cifra: número grande, su color, la variación y una mini tendencia */

import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight, Minus, Sparkles } from "lucide-react";
import { MONO, DISP, INK0, INK1, INK2, COURT, CRIT, Tarjeta, type IconType } from "./comun";
import { Chispa } from "./graficos";

export function Cifra({ Icon, label, valor, color, nota, cambio, tendencia, grande = false }: {
  Icon: IconType; label: string; valor: string; color: string;
  nota?: ReactNode; cambio?: ReactNode; tendencia?: number[]; grande?: boolean;
}) {
  return (
    <Tarjeta acento={color} className="ev-cifra">
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span className="ev-icono" style={{ ["--acento" as string]: color }}>
          <Icon size={14} color={color} strokeWidth={1.9} />
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: INK1, lineHeight: 1.3 }}>
          {label}
        </span>
      </div>
      {/* El tamaño sigue al ancho de la tarjeta (cqi) para que "4 min 23 s" no parta en dos renglones */}
      <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: grande ? "min(40px, 17cqi)" : "min(28px, 14cqi)", whiteSpace: "nowrap", color: INK0, marginTop: 14, lineHeight: 1, letterSpacing: "-0.01em" }}>
        {valor}
      </div>
      {cambio && <div style={{ marginTop: 8 }}>{cambio}</div>}
      {nota && <div style={{ fontFamily: MONO, fontSize: 9.5, color: INK2, marginTop: 8, lineHeight: 1.5 }}>{nota}</div>}
      {tendencia && <div style={{ marginTop: "auto" }}><Chispa valores={tendencia} color={color} /></div>}
    </Tarjeta>
  );
}

/** Variación contra el período anterior: flecha + signo + color, nunca solo color */
export function Cambio({ actual, previo, contra }: { actual: number; previo: number; contra: string }) {
  let Icon: IconType = Minus, color = INK2, texto = "igual";
  if (previo === 0 && actual > 0) {
    Icon = Sparkles; color = INK1; texto = "nuevo";
  } else if (previo > 0) {
    const pct = Math.round(((actual - previo) / previo) * 100);
    if (pct > 0) { Icon = ArrowUpRight; color = COURT; texto = `+${pct} %`; }
    else if (pct < 0) { Icon = ArrowDownRight; color = CRIT; texto = `${pct} %`; }
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontFamily: MONO, fontSize: 10 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 7px 3px 5px", borderRadius: 999,
        color, background: `color-mix(in srgb, ${color} 12%, transparent)`, fontWeight: 700,
      }}>
        <Icon size={12} strokeWidth={2.2} /> {texto}
      </span>
      <span style={{ color: INK2 }}>{contra}</span>
    </div>
  );
}
