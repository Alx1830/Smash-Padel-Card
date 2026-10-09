"use client";

import { useEffect, useState, useRef, useCallback, useSyncExternalStore } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useDashboardUser } from "./DashboardUserContext";
import { valorActualDe, type ValorActual } from "@/lib/valor-portafolio";
import { useErrorDeCarga } from "@/hooks/useErrorDeCarga";
import { PortfolioChart, type Snapshot, type HourlySnapshot } from "@/components/PortfolioChart";
import { TopLocalCards } from "@/components/TopLocalCards";
import { MuroActividad } from "@/components/feed/MuroActividad";
import { usePushPermission } from "@/hooks/usePushPermission";
import { MuroNoticias } from "@/components/feed/MuroNoticias";
import { BuscadorPanel } from "@/components/dashboard/BuscadorPanel";
import Link from "next/link";
import { Bell, Check, ChevronRight, Plus, RectangleVertical, Smartphone, TrendingDown, TrendingUp, Users, X } from "lucide-react";

const COURT = "#2ee6c1";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const ROJO  = "#ff5d5d";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";


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
      // Desempate único: con fechas iguales el scroll repetía o se saltaba seguidores.
      .order("follower_id", { ascending: true })
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
          <button onClick={onClose} style={{ background: "none", border: "none", color: INK2, fontSize: "20px", cursor: "pointer", lineHeight: 1 }} aria-label="Cerrar"><X size={18} aria-hidden /></button>
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

/* ── Tarjeta de dato de arriba ── */

/** Línea chiquita de los últimos 30 días, sin ejes: solo la forma. */
function Sparkline({ valores }: { valores: number[] }) {
  if (valores.length < 2) return null;
  const W = 96, H = 34;
  const min = Math.min(...valores), max = Math.max(...valores);
  const rango = max - min || 1;
  const x = (i: number) => (i / (valores.length - 1)) * W;
  const y = (v: number) => H - 3 - ((v - min) / rango) * (H - 6);
  const linea = valores.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="kp-spark" aria-hidden>
      <defs>
        <linearGradient id="kp-spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COURT} stopOpacity="0.3" />
          <stop offset="100%" stopColor={COURT} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0,${H} L${linea.replace(/ /g, " L")} L${W},${H} Z`} fill="url(#kp-spark-grad)" />
      <polyline points={linea} fill="none" stroke={COURT} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Variacion({ sube, children }: { sube: boolean; children: React.ReactNode }) {
  return (
    <span className="kp-var" style={{ color: sube ? COURT : ROJO }}>
      {sube ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
      {children}
    </span>
  );
}

function Kpi({ Icono, rotulo, valor, pie, spark, href, onClick }: {
  Icono: typeof Users; rotulo: string; valor: React.ReactNode; pie: React.ReactNode;
  spark?: number[]; href?: string; onClick?: () => void;
}) {
  const flecha = <ChevronRight size={15} aria-hidden />;
  return (
    <div className="kp-card">
      <Icono size={26} color={COURT} strokeWidth={1.5} className="kp-icono" aria-hidden />
      <div className="kp-cuerpo">
        <p className="kp-rotulo">{rotulo}</p>
        <p className="kp-valor">{valor}</p>
        <p className="kp-pie">{pie}</p>
      </div>
      {href
        ? <Link href={href} className="kp-ir" aria-label={rotulo}>{flecha}</Link>
        : <button onClick={onClick} className="kp-ir" aria-label={rotulo}>{flecha}</button>}
      {spark && <Sparkline valores={spark} />}
    </div>
  );
}

/* ── Instalar la app ── */

/** El aviso de instalación que Chrome guarda para cuando se lo pida. */
interface AvisoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<unknown>;
}

const sinSuscripcion = () => () => {};
/** Abierta como app (desde el ícono del inicio) y no desde el navegador. */
const enModoApp = () => window.matchMedia("(display-mode: standalone)").matches
  || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const PASOS: Record<"ios" | "android", { titulo: string; pasos: string[] }> = {
  ios: {
    titulo: "Instalar en iPhone",
    pasos: [
      "Abre facebinder.com en Safari (no en Chrome ni en otro navegador).",
      "Toca el botón Compartir, el cuadrado con la flecha hacia arriba.",
      "Elige «Agregar a pantalla de inicio».",
      "Toca «Agregar» arriba a la derecha.",
    ],
  },
  android: {
    titulo: "Instalar en Android",
    pasos: [
      "Abre facebinder.com en Chrome.",
      "Toca el menú de los tres puntos, arriba a la derecha.",
      "Elige «Instalar app» o «Agregar a la pantalla principal».",
      "Confirma con «Instalar».",
    ],
  },
};

function InstalarApp() {
  /* Se lee del navegador sin efecto: en el servidor da "no instalada" y en el
     cliente el valor real, sin pasar por un setState al montar. */
  const instalada = useSyncExternalStore(sinSuscripcion, enModoApp, () => false);
  const { permissionState, requestPermission } = usePushPermission();
  const [aviso, setAviso] = useState<AvisoInstalar | null>(null);
  const [guia, setGuia] = useState<"ios" | "android" | null>(null);
  const [activando, setActivando] = useState(false);

  useEffect(() => {
    const guardar = (e: Event) => { e.preventDefault(); setAviso(e as AvisoInstalar); };
    window.addEventListener("beforeinstallprompt", guardar);
    return () => window.removeEventListener("beforeinstallprompt", guardar);
  }, []);

  /* En Android, si Chrome ya ofreció instalar, se instala directo; si no
     (otro navegador, o ya la rechazó), se muestran los pasos. */
  const android = async () => {
    if (!aviso) { setGuia("android"); return; }
    await aviso.prompt();
    await aviso.userChoice;
    setAviso(null);
  };

  const activar = async () => {
    setActivando(true);
    try { await requestPermission(); } finally { setActivando(false); }
  };

  return (
    <div className="kp-card">
      <Smartphone size={26} color={COURT} strokeWidth={1.5} className="kp-icono" aria-hidden />
      <div className="kp-cuerpo" style={{ paddingRight: 0 }}>
        <p className="kp-rotulo">{instalada ? "App instalada" : "Instalar la app"}</p>
        {instalada ? (
          <>
            <p className="kp-pie" style={{ paddingRight: 0 }}>Ya la estás usando como app.</p>
            {permissionState === "granted" ? (
              <p className="kp-var" style={{ color: COURT, fontFamily: MONO, fontSize: 11, marginTop: 10 }}>
                <Check size={12} aria-hidden /> Notificaciones activas
              </p>
            ) : permissionState === "default" && (
              <div className="ia-botones">
                <button className="ia-boton" onClick={activar} disabled={activando}>
                  <Bell size={13} aria-hidden /> {activando ? "Activando…" : "Activar notificaciones"}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="kp-pie" style={{ paddingRight: 0 }}>Tenla en tu inicio, como una app.</p>
            <div className="ia-botones">
              <button className="ia-boton" onClick={() => setGuia("ios")}>
                <Smartphone size={13} aria-hidden /> iPhone
              </button>
              <button className="ia-boton" onClick={android}>
                <Smartphone size={13} aria-hidden /> Android
              </button>
            </div>
          </>
        )}
      </div>

      {guia && (
        <div onClick={() => setGuia(null)} className="ia-fondo" role="dialog" aria-label={PASOS[guia].titulo}>
          <div onClick={e => e.stopPropagation()} className="ia-guia">
            <p style={{ fontFamily: DISP, fontSize: 18, color: INK0, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <Smartphone size={18} color={COURT} aria-hidden /> {PASOS[guia].titulo}
            </p>
            {PASOS[guia].pasos.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: COURT, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: INK1, lineHeight: 1.6 }}>{t}</span>
              </div>
            ))}
            <button onClick={() => setGuia(null)} className="ia-cerrar">Cerrar</button>
          </div>
        </div>
      )}

      <style>{`
        .ia-botones { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
        .ia-boton { display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
          padding: 7px 12px; border-radius: 9px; font-family: ${MONO}; font-size: 11px; font-weight: 600;
          color: ${COURT}; background: ${COURT}14; border: 1px solid ${COURT}55;
          transition: background 0.15s; }
        .ia-boton:hover { background: ${COURT}26; }
        .ia-boton:disabled { opacity: 0.6; cursor: default; }
        .ia-fondo { position: fixed; inset: 0; z-index: 300; background: rgba(5,7,13,0.85);
          display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ia-guia { width: min(400px, 92vw); background: #0a0e1a; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px; padding: 28px 24px; }
        .ia-cerrar { margin-top: 8px; width: 100%; padding: 10px; border-radius: 10px; cursor: pointer;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          color: ${INK2}; font-family: ${MONO}; font-size: 11px; }
        @media (max-width: 767px) {
          .ia-boton { padding: 6px 9px; font-size: 10px; }
        }
      `}</style>
    </div>
  );
}

/* ── Main page ── */
export default function DashboardHome() {
  const supabase = createClient();
  const { userId: ctxUserId, username } = useDashboardUser();
  const [userId,          setUserId]          = useState<string | null>(null);
  const [followerCount,   setFollowerCount]   = useState<number | null>(null);
  const [seguidoresSemana, setSeguidoresSemana] = useState<number | null>(null);
  const [showFollowers,   setShowFollowers]   = useState(false);
  const [snapshots,       setSnapshots]       = useState<Snapshot[]>([]);
  const [hourlySnapshots, setHourlySnapshots] = useState<HourlySnapshot[]>([]);
  const [chartLoading,    setChartLoading]    = useState(true);
  const [valorActual,     setValorActual]     = useState<ValorActual | null>(null);
  const fallar = useErrorDeCarga();

  /* El historial lo escribe solo la base: snapshot_hourly_portfolios cada hora
     y consolidar_portfolio_diario cada noche, con el inventario completo. Antes
     esta página también escribía (y consolidaba) con su propia cuenta, que se
     cortaba en 1000 filas y llegó a grabar un valor falso. Ahora solo lee, y el
     valor de este momento sale de la misma función que usa el perfil. */
  useEffect(() => {
    if (!ctxUserId) return;
    let cancelado = false;
    (async () => {
      setUserId(ctxUserId);
      const todayUTC = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }); // YYYY-MM-DD en hora Colombia
      const haceUnaSemana = new Date(Date.now() - 7 * 86400000).toISOString();

      const [{ count: seguidores }, { count: nuevos }, { data: snaps }, { data: hourly }, valor] = await Promise.all([
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", ctxUserId),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", ctxUserId).gte("created_at", haceUnaSemana),
        supabase.from("portfolio_snapshots").select("date, total_usd, card_count").eq("user_id", ctxUserId).order("date", { ascending: false }).limit(366),
        supabase.from("portfolio_hourly_snapshots").select("hour_bucket, total_usd, card_count").eq("user_id", ctxUserId).gte("hour_bucket", `${todayUTC}T00:00:00Z`).order("hour_bucket", { ascending: true }),
        valorActualDe(supabase, ctxUserId),
      ]);
      if (cancelado) return;

      setFollowerCount(seguidores ?? 0);
      setSeguidoresSemana(nuevos ?? 0);
      setSnapshots(snaps ?? []);
      setHourlySnapshots(hourly ?? []);
      setValorActual(valor);
      setChartLoading(false);
    })().catch(e => { if (!cancelado) fallar(e); });
    return () => { cancelado = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxUserId]);

  /* ── Lo que dicen las tarjetas de arriba, sacado del mismo historial ── */
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const corte = new Date(`${hoy}T12:00:00Z`);
  corte.setUTCDate(corte.getUTCDate() - 30);
  const hace30 = corte.toISOString().slice(0, 10);
  const inicioMes = hoy.slice(0, 8) + "01";
  const total = valorActual?.total_usd ?? (chartLoading ? null : 0);

  // Un punto por día de los últimos 30, y el de hoy con el valor de ahora.
  const serie30 = snapshots
    .filter(s => s.date >= hace30 && s.date !== hoy)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => s.total_usd);
  if (total) serie30.push(total);
  const delta30 = serie30.length >= 2 && serie30[0] > 0 ? serie30[serie30.length - 1] - serie30[0] : null;
  const pct30 = delta30 != null ? (delta30 / serie30[0]) * 100 : null;

  /* Las cartas del mes se comparan contra el mismo conteo de la base (el del
     último cierre antes del día 1), no contra el de `valorActualDe`: ese suma
     también los sets sin precio y la resta daría cartas que nadie agregó. */
  const conteoAhora = hourlySnapshots.length
    ? hourlySnapshots[hourlySnapshots.length - 1].card_count
    : snapshots[0]?.card_count;
  const conteoMes = snapshots.find(s => s.date < inicioMes)?.card_count;
  const cartasMes = conteoAhora != null && conteoMes != null ? conteoAhora - conteoMes : null;

  const fmtNum = (n: number) => n.toLocaleString("es-CO");

  return (
    <div className="dh-page">
      <style>{`
        .dh-page { background: ${BG0}; min-height: 100vh; padding: 40px 24px; }
        .dh-wrap { display: flex; flex-direction: column; gap: 16px; }
        @media (max-width: 767px) { .dh-page { padding: 28px 16px; } .dh-wrap { gap: 12px; } }

        /* ── Cabecera con el arte de fondo ── */
        .dh-hero { position: relative; overflow: hidden; border-radius: 18px;
          padding: 28px 28px 30px; display: flex; align-items: flex-end;
          justify-content: space-between; gap: 20px; flex-wrap: wrap;
          border: 1px solid rgba(255,255,255,0.06); background: #070a12; }
        /* El arte se apaga hacia la izquierda, donde va el texto, y hacia
           abajo, para que la cabecera se funda con el resto del panel. */
        .dh-hero-arte { position: absolute; inset: 0; pointer-events: none;
          background: url(/covers/megaevo.webp) right center / cover no-repeat;
          opacity: 0.5;
          -webkit-mask-image: linear-gradient(to left, #000 15%, transparent 85%);
                  mask-image: linear-gradient(to left, #000 15%, transparent 85%); }
        .dh-hero-arte::after { content: ""; position: absolute; inset: 0;
          background: linear-gradient(to bottom, transparent 40%, #070a12 100%); }
        .dh-hero > *:not(.dh-hero-arte) { position: relative; }
        .dh-ante { font-family: ${MONO}; font-size: 11px; letter-spacing: 0.22em;
          text-transform: uppercase; color: ${COURT}; display: flex; align-items: center;
          gap: 10px; margin: 0 0 12px; }
        .dh-ante::before { content: ""; width: 22px; height: 1px; background: ${COURT}; }
        .dh-titulo { font-family: ${DISP}; font-size: clamp(22px, 4vw, 32px); color: ${INK0};
          margin: 0; line-height: 1.15; overflow-wrap: anywhere; }
        .dh-bajada { font-family: ${MONO}; font-size: 11px; color: ${INK2}; margin: 8px 0 0; }
        .dh-acciones { display: flex; align-items: center; gap: 12px; flex: 1 1 380px;
          justify-content: flex-end; min-width: 0; }
        .dh-registrar { display: inline-flex; align-items: center; gap: 8px; height: 44px;
          padding: 0 18px; border-radius: 12px; flex-shrink: 0; text-decoration: none;
          background: ${COURT}; color: ${BG0}; font-family: ${MONO}; font-size: 12px; font-weight: 700;
          box-shadow: 0 0 24px ${COURT}40; transition: box-shadow 0.15s; }
        .dh-registrar:hover { box-shadow: 0 0 32px ${COURT}70; }
        @media (max-width: 767px) {
          .dh-hero { padding: 22px 16px; }
          .dh-acciones { flex-basis: 100%; }
          .dh-registrar { padding: 0 14px; }
        }

        /* ── Las cuatro tarjetas de datos ── */
        .kp-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        @media (max-width: 1240px) { .kp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 767px)  { .kp-grid { gap: 10px; } }
        .kp-card { position: relative; display: flex; gap: 14px; min-width: 0;
          padding: 18px 18px 16px; border-radius: 16px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); }
        .kp-icono { flex-shrink: 0; margin-top: 2px; }
        .kp-cuerpo { min-width: 0; flex: 1; padding-right: 30px; }
        .kp-rotulo { font-family: ${MONO}; font-size: 9px; color: ${INK2}; letter-spacing: 0.2em;
          text-transform: uppercase; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .kp-valor { font-family: ${DISP}; font-size: clamp(22px, 2.4vw, 30px); color: ${INK0};
          margin: 8px 0 0; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* El pie deja lugar a la línea de la derecha. */
        .kp-pie { font-family: ${MONO}; font-size: 11px; color: ${INK2}; margin: 8px 0 0;
          min-height: 1.4em; padding-right: 70px; }
        .kp-var { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
        .kp-ir { position: absolute; top: 14px; right: 14px; width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          color: ${INK1}; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          transition: border-color 0.15s, color 0.15s; }
        .kp-ir:hover { border-color: ${COURT}66; color: ${COURT}; }
        .kp-spark { position: absolute; right: 16px; bottom: 14px; }

        /* En el celular: el icono arriba, más apretado, y sin la línea. */
        @media (max-width: 767px) {
          .kp-card { flex-direction: column; gap: 8px; padding: 13px; border-radius: 13px; }
          .kp-icono { width: 20px; height: 20px; }
          .kp-cuerpo { padding-right: 0; }
          .kp-rotulo { font-size: 8.5px; letter-spacing: 0.14em; }
          .kp-valor { font-size: 20px; margin-top: 5px; }
          .kp-pie { font-size: 9.5px; padding-right: 0; margin-top: 5px; }
          .kp-ir { top: 10px; right: 10px; width: 26px; height: 26px; }
          .kp-spark { display: none; }
        }

        /* ── El tablero: gráfico, actividad y top a la izquierda; noticias al costado ── */
        .dh-tablero { display: grid; gap: 16px;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.95fr);
          grid-template-areas: "graf act noti" "top top noti"; }
        .dh-graf { grid-area: graf; min-width: 0; display: flex; flex-direction: column;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 20px 22px; }
        .dh-graf > * { flex: 1; min-height: 0; display: flex; flex-direction: column; }
        .dh-top  { grid-area: top; min-width: 0; }
        /* Los dos muros no estiran el tablero: la actividad toma el alto del
           gráfico, las noticias el de las dos filas, y se recorren por dentro.
           Sin esto cada publicación nueva alargaba la fila entera. */
        .dh-act  { grid-area: act;  min-width: 0; min-height: 0; contain: size; }
        .dh-noti { grid-area: noti; min-width: 0; min-height: 0; contain: size; }
        .dh-act .mu-caja, .dh-noti .mu-caja { padding: 20px; }

        @media (max-width: 1240px) {
          .dh-tablero { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            grid-template-areas: "graf graf" "act noti" "top top"; }
          .dh-act, .dh-noti { contain: none; }
        }
        @media (max-width: 767px) {
          .dh-tablero { grid-template-columns: minmax(0, 1fr); gap: 12px;
            grid-template-areas: "graf" "act" "top" "noti"; }
          .dh-graf { padding: 16px; }
        }
      `}</style>

      <div className="dh-wrap">
        {/* Cabecera */}
        <header className="dh-hero">
          <div className="dh-hero-arte" aria-hidden />
          <div style={{ minWidth: 0 }}>
            <p className="dh-ante">Panel de control</p>
            <h1 className="dh-titulo">¡Hola, {username ?? "coleccionista"}!</h1>
            <p className="dh-bajada">Aquí tienes un resumen de tu actividad en FaceBinder.</p>
          </div>
          <div className="dh-acciones">
            <BuscadorPanel userId={userId} />
            <Link href="/dashboard/inventario" className="dh-registrar">
              <Plus size={16} aria-hidden /> Registrar carta
            </Link>
          </div>
        </header>

        {/* Las cuatro tarjetas */}
        <div className="kp-grid">
          <Kpi
            Icono={Users} rotulo="Seguidores"
            valor={followerCount == null ? "—" : fmtNum(followerCount)}
            pie={seguidoresSemana ? <Variacion sube>+{fmtNum(seguidoresSemana)} esta semana</Variacion> : followerCount == null ? "" : "Sin nuevos esta semana"}
            onClick={() => setShowFollowers(true)}
          />
          <Kpi
            Icono={TrendingUp} rotulo="Variación del inventario"
            valor={pct30 == null ? "—" : `${pct30 >= 0 ? "+" : ""}${pct30.toFixed(1)}%`}
            pie={delta30 != null
              ? <Variacion sube={delta30 >= 0}>{delta30 >= 0 ? "+" : "−"}${Math.abs(delta30).toFixed(2)} en 30 días</Variacion>
              : "Últimos 30 días"}
            spark={serie30} href="/dashboard/inventario"
          />
          <Kpi
            Icono={RectangleVertical} rotulo="Cartas registradas"
            valor={valorActual ? fmtNum(valorActual.copias) : chartLoading ? "—" : "0"}
            pie={cartasMes && cartasMes > 0
              ? <Variacion sube>+{fmtNum(cartasMes)} este mes</Variacion>
              : valorActual ? `${fmtNum(valorActual.unicas)} distintas` : ""}
            href="/dashboard/inventario"
          />
          <InstalarApp />
        </div>

        {/* El tablero */}
        <div className="dh-tablero">
          <div className="dh-graf">
            <PortfolioChart
              snapshots={snapshots} hourlySnapshots={hourlySnapshots}
              loading={chartLoading} defaultRange="1M" estirar chartHeight={260} panel
              valorActual={valorActual?.total_usd}
            />
          </div>
          <div className="dh-act"><MuroActividad /></div>
          <div className="dh-top"><TopLocalCards enFila /></div>
          <div className="dh-noti"><MuroNoticias /></div>
        </div>
      </div>

      {/* Popup seguidores */}
      {showFollowers && userId && (
        <FollowersPopup userId={userId} onClose={() => setShowFollowers(false)} />
      )}
    </div>
  );
}
