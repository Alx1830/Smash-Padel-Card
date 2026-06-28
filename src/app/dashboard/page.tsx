"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { SCRYDEX_SET_CODES } from "@/hooks/useScrydexPrice";

const COURT = "#2ee6c1";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";


function formatCOP(n: number) {
  return "$" + n.toLocaleString("es-CO") + " COP";
}

function formatUSD(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USD";
}

/* ── Followers popup with infinite scroll ── */
interface Follower {
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
}

function FollowersPopup({ userId, onClose }: { userId: string; onClose: () => void }) {
  const supabase  = createClient();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading]     = useState(false);
  const [hasMore, setHasMore]     = useState(true);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const offsetRef  = useRef(0);
  const hasMoreRef = useRef(true);
  const PAGE = 50;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const { data: followRows } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", userId)
      .order("created_at", { ascending: false })
      .range(offsetRef.current, offsetRef.current + PAGE - 1);

    if (!followRows || followRows.length === 0) {
      hasMoreRef.current = false;
      setHasMore(false);
      loadingRef.current = false;
      setLoading(false);
      return;
    }
    if (followRows.length < PAGE) { hasMoreRef.current = false; setHasMore(false); }

    const ids = followRows.map(r => r.follower_id);
    const { data: players } = await supabase
      .from("players")
      .select("username, first_name, last_name, photo_url")
      .in("user_id", ids);

    setFollowers(prev => [...prev, ...(players ?? [])]);
    offsetRef.current += followRows.length;
    loadingRef.current = false;
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadMore(); }, []);

  /* IntersectionObserver para infinite scroll */
  useEffect(() => {
    if (!bottomRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { threshold: 0.1 });
    obs.observe(bottomRef.current);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(5,7,13,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(400px, 92vw)", background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "80vh" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontFamily: MONO, fontSize: "9px", color: INK2, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 4px" }}>Tus seguidores</p>
            <p style={{ fontFamily: DISP, fontSize: "18px", color: INK0, margin: 0 }}>{followers.length}{hasMore ? "+" : ""} seguidores</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: INK2, fontSize: "20px", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        {/* Lista */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {followers.map(f => (
            <a key={f.username} href={`/${f.username}`} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 24px", textDecoration: "none", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: `${COURT}22`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISP, fontSize: "14px", fontWeight: 700, color: COURT }}>
                {f.photo_url
                  ? <Image src={f.photo_url} alt="" fill style={{ objectFit: "cover" }} unoptimized />
                  : `${f.first_name?.[0] ?? ""}${f.last_name?.[0] ?? ""}`}
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: "12px", color: INK0, fontWeight: 500 }}>{f.first_name} {f.last_name}</div>
                <div style={{ fontFamily: MONO, fontSize: "10px", color: INK2 }}>@{f.username}</div>
              </div>
            </a>
          ))}
          {/* Trigger de carga */}
          <div ref={bottomRef} style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {loading && <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.1em" }}>Cargando…</span>}
            {!hasMore && followers.length === 0 && <span style={{ fontFamily: MONO, fontSize: "11px", color: INK2 }}>Aún no tienes seguidores</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── PWA Install Widget ── */
function InstallWidget() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS]                   = useState(false);
  const [isInstalled, setIsInstalled]       = useState(false);
  const [showIOSGuide, setShowIOSGuide]     = useState(false);
  const [notifState, setNotifState]         = useState<NotificationPermission | "unsupported">("unsupported");
  const [subscribing, setSubscribing]       = useState(false);
  const [subscribed, setSubscribed]         = useState(false);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
    if (window.matchMedia("(display-mode: standalone)").matches) setIsInstalled(true);
    if ("Notification" in window) setNotifState(Notification.permission);
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  }

  async function handleActivarNotifs() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    setSubscribing(true);
    try {
      // Limpiar dismiss anterior
      localStorage.removeItem("push_permission_dismissed");

      const result = await Notification.requestPermission();
      setNotifState(result);

      if (result === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        // Cancelar suscripción anterior si existe
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) await existingSub.unsubscribe();

        const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
        const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
        const raw = window.atob(base64);
        const key = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key.buffer as ArrayBuffer,
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });

        setSubscribed(true);
      }
    } catch (e) {
      console.error("[Push]", e);
    } finally {
      setSubscribing(false);
    }
  }

  const showNotifButton = isInstalled && notifState !== "unsupported" && notifState !== "denied";

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "12px" }}>
        <div>
          <p style={{ fontFamily: MONO, fontSize: "9px", color: INK2, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 6px" }}>
            {isInstalled ? "App instalada" : "Instalar app"}
          </p>
          <p style={{ fontFamily: DISP, fontSize: "18px", color: INK0, margin: "0 0 4px" }}>
            {isIOS ? "Guardar en iOS" : "Instalar en Android"}
          </p>
          <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: 0, lineHeight: 1.5 }}>
            {isInstalled ? "App instalada correctamente" : "Accede como app nativa desde tu inicio"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
          {!isInstalled && (
            <button onClick={handleInstall} style={{
              padding: "9px 16px", borderRadius: "9px",
              background: `linear-gradient(90deg, ${COURT}, #d6ff3d)`,
              border: "none", cursor: "pointer",
              fontFamily: MONO, fontSize: "11px", fontWeight: 700, color: BG0,
              letterSpacing: "0.08em",
            }}>
              {isIOS ? "Ver instrucciones" : "Instalar →"}
            </button>
          )}
          {showNotifButton && (
            <button onClick={handleActivarNotifs} disabled={subscribing || subscribed || notifState === "granted"} style={{
              padding: "9px 16px", borderRadius: "9px",
              background: subscribed || notifState === "granted" ? "rgba(46,230,193,0.1)" : "rgba(46,230,193,0.15)",
              border: `1px solid ${subscribed || notifState === "granted" ? "rgba(46,230,193,0.4)" : "rgba(46,230,193,0.3)"}`,
              cursor: subscribing || subscribed || notifState === "granted" ? "default" : "pointer",
              fontFamily: MONO, fontSize: "11px", fontWeight: 600, color: COURT,
              letterSpacing: "0.06em", transition: "opacity 0.2s",
              opacity: subscribing ? 0.6 : 1,
            }}>
              {subscribing ? "Activando..." : subscribed || notifState === "granted" ? "✓ Notificaciones activas" : "Activar notificaciones"}
            </button>
          )}
        </div>
      </div>

      {/* iOS guide modal */}
      {showIOSGuide && (
        <div onClick={() => setShowIOSGuide(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(5,7,13,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(400px, 92vw)", background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "28px 24px" }}>
            <p style={{ fontFamily: DISP, fontSize: "18px", color: INK0, margin: "0 0 16px" }}>Agregar a inicio en iPhone</p>
            {[
              { n: "1", t: "Abre Safari (no Chrome ni otro navegador)" },
              { n: "2", t: 'Toca el botón Compartir ↑ en la barra inferior' },
              { n: "3", t: '"Agregar a pantalla de inicio"' },
              { n: "4", t: 'Toca "Agregar" en la esquina superior derecha' },
            ].map(s => (
              <div key={s.n} style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <span style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.1em", flexShrink: 0 }}>{s.n}.</span>
                <span style={{ fontFamily: MONO, fontSize: "11px", color: INK1, lineHeight: 1.6 }}>{s.t}</span>
              </div>
            ))}
            <button onClick={() => setShowIOSGuide(false)} style={{ marginTop: "8px", width: "100%", padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: INK2, fontFamily: MONO, fontSize: "11px", cursor: "pointer" }}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Portfolio History Chart ── */
type Snapshot = { date: string; total_usd: number; card_count: number };
type HourlySnapshot = { hour_bucket: string; total_usd: number; card_count: number };
type Range = "1D" | "1M" | "3M" | "6M" | "1Y";

function ChartSVG({ chartData, xLabel }: {
  chartData: { label: string; value: number }[];
  xLabel?: (d: { label: string; value: number }, idx: number, arr: { label: string; value: number }[]) => string;
}) {
  const vals   = chartData.map(s => s.value);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const range_ = maxVal - minVal || 1;

  const W = 600, H = 160, PAD = { t: 16, r: 16, b: 32, l: 64 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  const px = (i: number) => PAD.l + (i / (chartData.length - 1 || 1)) * iW;
  const py = (v: number) => PAD.t + iH - ((v - minVal) / range_) * iH;

  const polyline = chartData.map((s, i) => `${px(i)},${py(s.value)}`).join(" ");
  const area = `M${px(0)},${py(chartData[0].value)} ` +
    chartData.slice(1).map((s, i) => `L${px(i + 1)},${py(s.value)}`).join(" ") +
    ` L${px(chartData.length - 1)},${PAD.t + iH} L${px(0)},${PAD.t + iH} Z`;

  const yTicks = 4;
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

function PortfolioChart({ snapshots, hourlySnapshots }: { snapshots: Snapshot[]; hourlySnapshots: HourlySnapshot[] }) {
  const [range, setRange] = useState<Range>("1D");

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

  if (data.length === 0) return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <p style={{ fontFamily: MONO, fontSize: "9px", color: INK2, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>
          Historial de valor del inventario
        </p>
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
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "160px" }}>
        <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.1em" }}>{emptyMsg}</p>
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
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 30px)", color: COURT }}>
              {formatUSD(last.value)}
            </span>
            <span style={{ fontFamily: MONO, fontSize: "12px", color: isUp ? "#4ade80" : "#f87171", letterSpacing: "0.06em" }}>
              {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{formatUSD(Math.abs(delta))} ({isUp ? "+" : ""}{pct.toFixed(1)}%)
            </span>
          </div>
        </div>
        {/* Filtros */}
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
      </div>

      <ChartSVG chartData={data} xLabel={xLabel} />
    </div>
  );
}

/* ── Main page ── */
export default function DashboardHome() {
  const supabase = createClient();
  const [userId,          setUserId]          = useState<string | null>(null);
  const [followerCount,   setFollowerCount]   = useState<number | null>(null);
  const [stockTotal,      setStockTotal]      = useState<number | null>(null);
  const [cardCount,       setCardCount]       = useState<number | null>(null);
  const [showFollowers,   setShowFollowers]   = useState(false);
  const [snapshots,       setSnapshots]       = useState<Snapshot[]>([]);
  const [hourlySnapshots, setHourlySnapshots] = useState<HourlySnapshot[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [
        { data: prof },
        { data: followRows },
        { data: inv },
        { data: snaps },
        { data: hourly },
      ] = await Promise.all([
        supabase.from("players").select("username").eq("user_id", user.id).single(),
        supabase.from("follows").select("follower_id").eq("following_id", user.id),
        supabase.from("card_inventory").select("card_id, set_id, version, quantity").eq("user_id", user.id).gt("quantity", 0),
        supabase.from("portfolio_snapshots").select("date, total_usd, card_count").eq("user_id", user.id).order("date", { ascending: false }).limit(366),
        supabase.from("portfolio_hourly_snapshots").select("hour_bucket, total_usd, card_count").eq("user_id", user.id).order("hour_bucket", { ascending: true }),
      ]);

      setFollowerCount(followRows?.length ?? 0);
      setSnapshots(snaps ?? []);

      const todayUTC = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }); // YYYY-MM-DD en hora Colombia
      const hourlyRows = hourly ?? [];

      // Consolidar snapshots horarios de días anteriores en portfolio_snapshots y eliminarlos
      const pastHourly = hourlyRows.filter(h => h.hour_bucket.slice(0, 10) < todayUTC);
      if (pastHourly.length > 0) {
        const byDay: Record<string, typeof pastHourly> = {};
        for (const h of pastHourly) {
          const day = h.hour_bucket.slice(0, 10);
          if (!byDay[day]) byDay[day] = [];
          byDay[day].push(h);
        }
        for (const [day, rows] of Object.entries(byDay)) {
          const lastRow = rows[rows.length - 1];
          const existingSnap = (snaps ?? []).find(s => s.date === day);
          if (!existingSnap) {
            await supabase.from("portfolio_snapshots").insert({ user_id: user.id, date: day, total_usd: lastRow.total_usd, card_count: lastRow.card_count });
          }
        }
        // Borrar todos los horarios de días anteriores
        const pastBuckets = pastHourly.map(h => h.hour_bucket);
        await supabase.from("portfolio_hourly_snapshots").delete().eq("user_id", user.id).in("hour_bucket", pastBuckets);
        // Recargar snapshots diarios actualizados
        const { data: freshSnaps } = await supabase.from("portfolio_snapshots").select("date, total_usd, card_count").eq("user_id", user.id).order("date", { ascending: false }).limit(366);
        setSnapshots(freshSnaps ?? []);
      }

      const todayHourly = hourlyRows.filter(h => h.hour_bucket.slice(0, 10) === todayUTC);
      setHourlySnapshots(todayHourly);
      setCardCount((inv ?? []).reduce((sum, r) => sum + (r.quantity ?? 0), 0));

      const invRows = inv ?? [];

      function extractCardNumber(cardId: string | number): number {
        if (typeof cardId === "number") return cardId;
        return parseInt(String(cardId).split(":")[0], 10);
      }

      const priceIds = invRows
        .map(r => {
          const sc = SCRYDEX_SET_CODES[r.set_id ?? ""];
          const num = extractCardNumber(r.card_id);
          return sc && !isNaN(num) ? `${sc}-${num}` : null;
        })
        .filter((id): id is string => id !== null);

      let priceMap: Record<string, Record<string, number>> = {};

      if (priceIds.length > 0) {
        const { data: priceRows } = await supabase
          .from("card_prices")
          .select("card_id, prices")
          .in("card_id", [...new Set(priceIds)]);

        for (const row of priceRows ?? []) {
          priceMap[row.card_id] = row.prices as Record<string, number>;
        }
      }

      let total = 0;

      for (const r of invRows) {
        const sc  = SCRYDEX_SET_CODES[r.set_id ?? ""];
        const num = extractCardNumber(r.card_id);
        const pid = sc && !isNaN(num) ? `${sc}-${num}` : null;
        const prices = pid ? priceMap[pid] : null;
        const version = r.version ?? "normal";
        const price: number | null = prices
          ? (prices[version] ?? prices[version.charAt(0).toUpperCase() + version.slice(1)] ?? prices["normal"] ?? null)
          : null;

        if (price !== null) total += price * (r.quantity ?? 1);
      }

      setStockTotal(total);

      if (total > 0) {
        const cards = (inv ?? []).reduce((sum, r) => sum + (r.quantity ?? 0), 0);

        // Snapshot diario: upsert del día de hoy
        const todaySnap = (snaps ?? []).find(s => s.date === todayUTC);
        if (!todaySnap) {
          const { data: inserted } = await supabase.from("portfolio_snapshots").insert({ user_id: user.id, date: todayUTC, total_usd: total, card_count: cards }).select("date, total_usd, card_count").single();
          if (inserted) setSnapshots(prev => [inserted, ...prev]);
        } else if (Math.abs(todaySnap.total_usd - total) > 0.01) {
          await supabase.from("portfolio_snapshots").update({ total_usd: total, card_count: cards }).eq("user_id", user.id).eq("date", todayUTC);
          setSnapshots(prev => prev.map(s => s.date === todayUTC ? { ...s, total_usd: total, card_count: cards } : s));
        }

        // Snapshot horario: upsert de la hora actual en zona Colombia (UTC-5)
        const now = new Date();
        const bogotaHour = parseInt(now.toLocaleString("en-US", { timeZone: "America/Bogota", hour: "numeric", hour12: false }), 10);
        const bogotaDate = now.toLocaleDateString("en-CA", { timeZone: "America/Bogota" }); // YYYY-MM-DD
        const [bogY, bogM, bogD] = bogotaDate.split("-").map(Number);
        const hourBucket = new Date(Date.UTC(bogY, bogM - 1, bogD, bogotaHour)).toISOString();
        const thisHourSnap = todayHourly.find(h => h.hour_bucket === hourBucket);
        if (!thisHourSnap) {
          const { data: insertedH } = await supabase.from("portfolio_hourly_snapshots").insert({ user_id: user.id, hour_bucket: hourBucket, total_usd: total, card_count: cards }).select("hour_bucket, total_usd, card_count").single();
          if (insertedH) setHourlySnapshots(prev => [...prev, insertedH].sort((a, b) => a.hour_bucket.localeCompare(b.hour_bucket)));
        } else if (Math.abs(thisHourSnap.total_usd - total) > 0.01) {
          await supabase.from("portfolio_hourly_snapshots").update({ total_usd: total, card_count: cards }).eq("user_id", user.id).eq("hour_bucket", hourBucket);
          setHourlySnapshots(prev => prev.map(h => h.hour_bucket === hourBucket ? { ...h, total_usd: total, card_count: cards } : h));
        }
      }
    })();
  }, []);

  const CARD_STYLE: React.CSSProperties = {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  };

  return (
    <div className="dash-home-wrap" style={{ minHeight: "100vh" }}>
      <style>{`
        .dash-home-wrap { padding: 24px; }
        @media (min-width: 768px) { .dash-home-wrap { padding: 48px; } }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 40px;
        }
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* Header dentro del área del grid */}
      <div style={{ marginBottom: "16px", fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
        Panel de control
      </div>

      {/* 4 en fila */}
      <div className="stats-grid">

        {/* Seguidores */}
        <div style={CARD_STYLE}>
          <p style={{ fontFamily: MONO, fontSize: "9px", color: INK2, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>Seguidores</p>
          <p style={{ fontFamily: DISP, fontSize: "clamp(28px, 5vw, 40px)", color: INK0, margin: 0, lineHeight: 1 }}>
            {followerCount ?? "—"}
          </p>
          <button
            onClick={() => setShowFollowers(true)}
            style={{ marginTop: "auto", alignSelf: "flex-start", fontFamily: MONO, fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: COURT, background: "none", border: `1px solid ${COURT}44`, borderRadius: "7px", padding: "6px 14px", cursor: "pointer" }}
          >
            Ver todos →
          </button>
        </div>

        {/* Dinero en stock */}
        <div style={CARD_STYLE}>
          <p style={{ fontFamily: MONO, fontSize: "9px", color: INK2, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>Dinero en stock</p>
          <p style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", color: COURT, margin: 0, lineHeight: 1.1 }}>
            {stockTotal === null ? "—" : stockTotal === 0 ? "$0.00 USD" : formatUSD(stockTotal)}
          </p>
          <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: 0, lineHeight: 1.5 }}>
            Valor total de tus cartas
          </p>
        </div>

        {/* Cartas en inventario */}
        <div style={CARD_STYLE}>
          <p style={{ fontFamily: MONO, fontSize: "9px", color: INK2, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>Cartas en inventario</p>
          <p style={{ fontFamily: DISP, fontSize: "clamp(28px, 5vw, 40px)", color: INK0, margin: 0, lineHeight: 1 }}>
            {cardCount ?? "—"}
          </p>
          <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: 0 }}>
            {cardCount === 1 ? "carta registrada" : "cartas registradas"}
          </p>
        </div>

        {/* Instalar app */}
        <div style={CARD_STYLE}>
          <InstallWidget />
        </div>

      </div>

      {/* Gráfico histórico */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "24px",
        marginBottom: "40px",
      }}>
        <PortfolioChart snapshots={snapshots} hourlySnapshots={hourlySnapshots} />
      </div>

      {/* Popup seguidores */}
      {showFollowers && userId && (
        <FollowersPopup userId={userId} onClose={() => setShowFollowers(false)} />
      )}
    </div>
  );
}
