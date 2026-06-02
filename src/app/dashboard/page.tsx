"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { AdminFeed } from "@/components/AdminFeed";
import { SCRYDEX_SET_CODES } from "@/hooks/useScrydexPrice";
import dynamic from "next/dynamic";
const MarketFeed = dynamic(() => import("@/components/MarketFeed").then(m => m.MarketFeed), { ssr: false });

const COURT = "#2ee6c1";
const BG_POPUP = "rgba(5,7,13,0.88)";

function LastNewsPopup({ currentUserId, currentUsername, isAdmin }: { currentUserId: string; currentUsername: string | null; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("last_news_dismissed") !== "1") {
      setOpen(true);
    }
  }, []);

  function handleClose() {
    sessionStorage.setItem("last_news_dismissed", "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: BG_POPUP,
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(600px, 96vw)",
          maxHeight: "80vh",
          background: "#0a0e1a",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 20, height: 1, background: COURT, display: "inline-block" }} />
            <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT }}>
              Last News
            </span>
          </div>
          {!isAdmin && (
            <button
              onClick={handleClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#7a8298",
                cursor: "pointer",
                fontSize: "14px",
                lineHeight: 1,
                padding: "4px 9px",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,79,79,0.12)"; e.currentTarget.style.color = "#ff6b6b"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#7a8298"; }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "24px" }}>
          <AdminFeed currentUserId={currentUserId} currentUsername={currentUsername} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
}
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

/* ── Main page ── */
export default function DashboardHome() {
  const supabase = createClient();
  const [userId,          setUserId]          = useState<string | null>(null);
  const [username,        setUsername]        = useState<string | null>(null);
  const [isAdmin,         setIsAdmin]         = useState(false);
  const [followerCount,   setFollowerCount]   = useState<number | null>(null);
  const [stockTotal,      setStockTotal]      = useState<number | null>(null);
  const [cardCount,       setCardCount]       = useState<number | null>(null);
  const [showFollowers,   setShowFollowers]   = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [
        { data: prof },
        { count: fc },
        { data: inv },
      ] = await Promise.all([
        supabase.from("players").select("username, role").eq("user_id", user.id).single(),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("card_inventory").select("card_id, set_id, version, quantity").eq("user_id", user.id).gt("quantity", 0),
      ]);

      setUsername(prof?.username ?? null);
      if (prof?.role === "admin") setIsAdmin(true);
      setFollowerCount(fc ?? 0);
      setCardCount((inv ?? []).reduce((sum, r) => sum + (r.quantity ?? 0), 0));

      // Calcular valor total del inventario en USD usando card_prices
      // card_inventory.card_id tiene formato "001:Name:Version", card_prices.card_id es "setCode-number"
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

      if (priceIds.length > 0) {
        const { data: priceRows } = await supabase
          .from("card_prices")
          .select("card_id, prices")
          .in("card_id", [...new Set(priceIds)]);

        const priceMap: Record<string, Record<string, number>> = {};
        for (const row of priceRows ?? []) {
          priceMap[row.card_id] = row.prices as Record<string, number>;
        }

        let total = 0;
        for (const r of invRows) {
          const sc = SCRYDEX_SET_CODES[r.set_id ?? ""];
          if (!sc) continue;
          const num = extractCardNumber(r.card_id);
          if (isNaN(num)) continue;
          const pid = `${sc}-${num}`;
          const prices = priceMap[pid];
          if (!prices) continue;
          const version = r.version ?? "normal";
          const price =
            prices[version] ??
            prices[version.charAt(0).toUpperCase() + version.slice(1)] ??
            prices["normal"] ??
            0;
          total += price * (r.quantity ?? 1);
        }
        setStockTotal(total);
      } else {
        setStockTotal(0);
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
        .feed-wrap {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          width: 100%;
          align-items: start;
        }
        @media (max-width: 767px) {
          .feed-wrap {
            grid-template-columns: 1fr;
          }
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

      {/* Market feed */}
      {userId && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT }}>
            <span style={{ width: 20, height: 1, background: COURT, display: "inline-block" }} />
            Market · Feed en vivo
          </div>
          <div className="feed-wrap">
            <MarketFeed />
          </div>
        </>
      )}

      {/* Last News popup */}
      {userId && <LastNewsPopup currentUserId={userId} currentUsername={username} isAdmin={isAdmin} />}

      {/* Popup seguidores */}
      {showFollowers && userId && (
        <FollowersPopup userId={userId} onClose={() => setShowFollowers(false)} />
      )}
    </div>
  );
}
