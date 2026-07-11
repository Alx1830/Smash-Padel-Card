"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const COURT = "#2ee6c1";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

function formatUSD(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USD";
}

export type Snapshot       = { date: string; total_usd: number; card_count: number };
export type HourlySnapshot = { hour_bucket: string; total_usd: number; card_count: number };
type Range = "1D" | "1M" | "3M" | "6M" | "1Y";

function ChartSVG({ chartData, xLabel, height = 160 }: {
  chartData: { label: string; value: number }[];
  xLabel?: (d: { label: string; value: number }, idx: number, arr: { label: string; value: number }[]) => string;
  height?: number;
}) {
  const vals   = chartData.map(s => s.value);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const range_ = maxVal - minVal || 1;

  const W = 600, H = height, PAD = { t: 16, r: 16, b: 32, l: 64 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  const px = (i: number) => PAD.l + (i / (chartData.length - 1 || 1)) * iW;
  const py = (v: number) => PAD.t + iH - ((v - minVal) / range_) * iH;

  const polyline = chartData.map((s, i) => `${px(i)},${py(s.value)}`).join(" ");
  const area = `M${px(0)},${py(chartData[0].value)} ` +
    chartData.slice(1).map((s, i) => `L${px(i + 1)},${py(s.value)}`).join(" ") +
    ` L${px(chartData.length - 1)},${PAD.t + iH} L${px(0)},${PAD.t + iH} Z`;

  const yTicks = height > 240 ? 6 : 4;
  const xTicks = Math.min(chartData.length, 6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
      <defs>
        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COURT} stopOpacity="0.25" />
          <stop offset="100%" stopColor={COURT} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid lines y ticks Y */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const v = minVal + (range_ * i) / yTicks;
        const y = py(v);
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize="9" fontFamily="monospace" fill={INK2}>
              ${v.toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* Ticks X */}
      {Array.from({ length: xTicks }, (_, i) => {
        const idx = Math.round((i / (xTicks - 1 || 1)) * (chartData.length - 1));
        const d = chartData[idx];
        const x = px(idx);
        const label = xLabel ? xLabel(d, idx, chartData) : d.label;
        return (
          <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="9" fontFamily="monospace" fill={INK2}>
            {label}
          </text>
        );
      })}

      {/* Área rellena */}
      <path d={area} fill="url(#chart-grad)" />

      {/* Línea */}
      <polyline points={polyline} fill="none" stroke={COURT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* Punto final */}
      <circle cx={px(chartData.length - 1)} cy={py(chartData[chartData.length - 1].value)} r="4" fill={COURT} />
      <circle cx={px(chartData.length - 1)} cy={py(chartData[chartData.length - 1].value)} r="8" fill={COURT} fillOpacity="0.2" />
    </svg>
  );
}

export function PortfolioChart({ snapshots, hourlySnapshots, loading, cardCount, defaultRange = "1D", chartHeight = 160 }: {
  snapshots: Snapshot[]; hourlySnapshots: HourlySnapshot[]; loading?: boolean;
  cardCount?: number | null;
  defaultRange?: Range;
  chartHeight?: number;
}) {
  const [range, setRange] = useState<Range>(defaultRange);

  // Vista diaria: datos horarios de hoy en hora Colombia
  const todayUTC = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const hourlyData = hourlySnapshots
    .filter(h => h.hour_bucket.slice(0, 10) === todayUTC)
    .sort((a, b) => a.hour_bucket.localeCompare(b.hour_bucket))
    .map(h => ({
      label: h.hour_bucket,
      value: h.total_usd,
    }));

  // Vista histórica: filtrada por rango
  const cutoff = (() => {
    const d = new Date();
    if (range === "1M") d.setMonth(d.getMonth() - 1);
    else if (range === "3M") d.setMonth(d.getMonth() - 3);
    else if (range === "6M") d.setMonth(d.getMonth() - 6);
    else d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const historicData = snapshots
    .filter(s => s.date >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({ label: s.date, value: s.total_usd }));

  const isDay = range === "1D";
  const data  = isDay ? hourlyData : historicData;

  const emptyMsg = isDay
    ? "Aún no hay datos de hoy. Vuelve en unos minutos."
    : "El historial se irá construyendo día a día con tus visitas";

  const rangeButtons = (
    <div style={{ display: "flex", gap: "6px" }}>
      {(["1D", "1M", "3M", "6M", "1Y"] as Range[]).map(r => (
        <button key={r} onClick={() => setRange(r)} style={{
          padding: "6px 14px", borderRadius: "8px", cursor: "pointer",
          fontFamily: MONO, fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em",
          background: range === r ? COURT : "rgba(255,255,255,0.04)",
          color: range === r ? BG0 : INK2,
          border: range === r ? "none" : "1px solid rgba(255,255,255,0.08)",
          transition: "all 0.15s",
        }}>{r}</button>
      ))}
    </div>
  );

  const cardCountBadge = cardCount != null && (
    <span style={{
      fontFamily: MONO, fontSize: "11px", color: INK0, letterSpacing: "0.06em",
      background: "rgba(46,230,193,0.08)", border: "1px solid rgba(46,230,193,0.25)",
      borderRadius: "7px", padding: "4px 10px", whiteSpace: "nowrap",
    }}>
      🃏 {cardCount.toLocaleString("es-CO")} {cardCount === 1 ? "carta" : "cartas"}
    </span>
  );

  if (data.length === 0) return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <p style={{ fontFamily: MONO, fontSize: "9px", color: INK2, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>
            Historial de valor del inventario
          </p>
          {cardCountBadge}
        </div>
        {rangeButtons}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: `${chartHeight}px` }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <style>{`@keyframes fb-pulse{0%,100%{opacity:.3}50%{opacity:.7}}`}</style>
            <div style={{ width: "180px", height: "60px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", animation: "fb-pulse 1.4s ease-in-out infinite" }} />
            <div style={{ width: "100px", height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.04)", animation: "fb-pulse 1.4s ease-in-out infinite 0.2s" }} />
          </div>
        ) : (
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.1em" }}>{emptyMsg}</p>
        )}
      </div>
    </div>
  );

  const last  = data[data.length - 1];
  const first = data[0];
  const delta = last.value - first.value;
  const pct   = first.value > 0 ? (delta / first.value) * 100 : 0;
  const isUp  = delta >= 0;

  const xLabel = isDay
    ? (d: { label: string }) => {
        const h = new Date(d.label);
        const hh = h.getUTCHours().toString().padStart(2, "0");
        return `${hh}:00`;
      }
    : (d: { label: string }) => d.label.slice(5); // MM-DD

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <p style={{ fontFamily: MONO, fontSize: "9px", color: INK2, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 6px" }}>
            {isDay ? `Hoy ${todayUTC} — por hora` : "Historial de valor del inventario"}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 30px)", color: COURT }}>
              {formatUSD(last.value)}
            </span>
            <span style={{ fontFamily: MONO, fontSize: "12px", color: isUp ? "#4ade80" : "#f87171", letterSpacing: "0.06em" }}>
              {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{formatUSD(Math.abs(delta))} ({isUp ? "+" : ""}{pct.toFixed(1)}%)
            </span>
            {cardCountBadge}
          </div>
        </div>
        {rangeButtons}
      </div>

      <ChartSVG chartData={data} xLabel={xLabel} height={chartHeight} />
    </div>
  );
}

/** Gráfico autónomo para el perfil: lee los snapshots del usuario (solo lectura) */
export function ProfilePortfolioChart({ userId, cardCount, fixedHeight }: { userId: string; cardCount?: number | null; fixedHeight?: number }) {
  const [snapshots,       setSnapshots]       = useState<Snapshot[]>([]);
  const [hourlySnapshots, setHourlySnapshots] = useState<HourlySnapshot[]>([]);
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const todayUTC = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
      const [{ data: snaps }, { data: hourly }] = await Promise.all([
        supabase.from("portfolio_snapshots").select("date, total_usd, card_count").eq("user_id", userId).order("date", { ascending: false }).limit(366),
        supabase.from("portfolio_hourly_snapshots").select("hour_bucket, total_usd, card_count").eq("user_id", userId).gte("hour_bucket", `${todayUTC}T00:00:00Z`).order("hour_bucket", { ascending: true }),
      ]);
      setSnapshots(snaps ?? []);
      setHourlySnapshots(hourly ?? []);
      setLoading(false);
    })();
  }, [userId]);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Header estilo "MIS CARTAS DESTACADAS" */}
      <div style={{
        fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em",
        textTransform: "uppercase", color: COURT,
        display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
      }}>
        <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
        Valor estimado del portafolio
      </div>

      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "24px",
        height: fixedHeight ? `${fixedHeight}px` : undefined,
        overflow: fixedHeight ? "hidden" : undefined,
        boxSizing: "border-box",
      }}>
        <PortfolioChart
          snapshots={snapshots} hourlySnapshots={hourlySnapshots} loading={loading}
          cardCount={cardCount} defaultRange="1M" chartHeight={300}
        />
      </div>
    </div>
  );
}
