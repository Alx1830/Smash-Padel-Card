"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { AdminFeed } from "@/components/AdminFeed";

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

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
    if (window.matchMedia("(display-mode: standalone)").matches) setIsInstalled(true);
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
            {isInstalled ? "Ya tienes FaceBinder instalado" : "Accede como app nativa desde tu inicio"}
          </p>
        </div>
        {!isInstalled && (
          <button onClick={handleInstall} style={{
            marginTop: "auto", padding: "9px 16px", borderRadius: "9px",
            background: `linear-gradient(90deg, ${COURT}, #d6ff3d)`,
            border: "none", cursor: "pointer",
            fontFamily: MONO, fontSize: "11px", fontWeight: 700, color: BG0,
            letterSpacing: "0.08em", alignSelf: "flex-start",
          }}>
            {isIOS ? "Ver instrucciones" : "Instalar →"}
          </button>
        )}
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
        { data: listings },
        { data: inv },
      ] = await Promise.all([
        supabase.from("players").select("username").eq("user_id", user.id).single(),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("market_listings").select("price_cop").eq("user_id", user.id).eq("status", "active"),
        supabase.from("card_inventory").select("quantity").eq("user_id", user.id),
      ]);

      setUsername(prof?.username ?? null);
      setFollowerCount(fc ?? 0);
      setStockTotal((listings ?? []).reduce((sum, l) => sum + (l.price_cop ?? 0), 0));
      setCardCount((inv ?? []).reduce((sum, r) => sum + (r.quantity ?? 0), 0));
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
          max-width: 620px;
          margin: 0 auto;
          width: 100%;
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
            {stockTotal === null ? "—" : stockTotal === 0 ? "$0 COP" : formatCOP(stockTotal)}
          </p>
          <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: 0, lineHeight: 1.5 }}>
            Valor total de tus cartas en venta
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

      {/* Feed de posts del admin — centrado y angosto */}
      {userId && (
        <div className="feed-wrap">
          <AdminFeed currentUserId={userId} currentUsername={username} />
        </div>
      )}

      {/* Popup seguidores */}
      {showFollowers && userId && (
        <FollowersPopup userId={userId} onClose={() => setShowFollowers(false)} />
      )}
    </div>
  );
}
