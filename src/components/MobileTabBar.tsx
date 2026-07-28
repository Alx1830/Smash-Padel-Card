"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  House, UserRoundPen, LayoutGrid, Store, Gamepad2,
  Swords, WalletCards, ArrowLeftRight, BookSearch,
} from "lucide-react";

const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";

/**
 * Barra inferior móvil compartida por el dashboard y las páginas públicas.
 * Es la única definición: si cambian las pestañas, cambian en toda la app.
 */
export function MobileTabBar({ username: initialUsername }: { username?: string | null } = {}) {
  const pathname = usePathname();

  const [username, setUsername] = useState<string | null>(initialUsername ?? null);
  const [ready, setReady]       = useState(!!initialUsername);
  const [marketOpen, setMarketOpen]           = useState(false);
  const [interactivoOpen, setInteractivoOpen] = useState(false);

  const mktRef = useRef<HTMLDivElement>(null);
  const intRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialUsername) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("players").select("username").eq("user_id", user.id).maybeSingle();
      setUsername(data?.username ?? null);
      setReady(true);
    });
  }, [initialUsername]);

  /* Cerrar los popups al tocar fuera */
  useEffect(() => {
    function onOutside(e: MouseEvent | TouchEvent) {
      if (!mktRef.current?.contains(e.target as Node)) setMarketOpen(false);
      if (!intRef.current?.contains(e.target as Node)) setInteractivoOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
    };
  }, []);

  if (!ready) return null;

  const marketActive = pathname === "/dashboard/market" || pathname === "/market"
                    || pathname === "/dashboard/market/wishlist";
  const intActive    = pathname.startsWith("/dashboard/decks")
                    || pathname.startsWith("/dashboard/my-sets")
                    || pathname.startsWith("/dashboard/trades");
  const invActive    = pathname === "/dashboard/inventario"
                    || pathname === "/dashboard/inventario/cards"
                    || pathname === "/dashboard/inventario/agregar";
  const perfilHref   = username ? `/${username}` : "/dashboard/perfil";
  const perfilActive = pathname === perfilHref || pathname === "/dashboard/perfil";
  const inicioActive = pathname === "/dashboard";

  return (
    <>
      <style>{`
        .mob-tabbar { display: none; }
        @media (max-width: 1023px) {
          .mob-tabbar {
            display: flex;
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 60;
            align-items: stretch;
            height: 72px;
            background: rgba(10,14,26,0.95);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid rgba(255,255,255,0.07);
            padding-bottom: env(safe-area-inset-bottom);
          }
          body { padding-bottom: 72px; }
        }
      `}</style>

      <nav className="mob-tabbar">
        <TabLink href="/dashboard" label="Inicio" Icon={House} active={inicioActive} />
        <TabLink href={perfilHref} label="Perfil" Icon={UserRoundPen} active={perfilActive} />
        <TabLink href="/dashboard/inventario" label="Inventario" Icon={LayoutGrid} active={invActive} highlight />

        {/* Interactivo — despliega su submenú */}
        <div ref={intRef} style={cellStyle}>
          {interactivoOpen && (
            <Popup title="Interactivo">
              <PopupLink href="/dashboard/decks"   Icon={Swords}         label="Decks"        onClick={() => setInteractivoOpen(false)} />
              <PopupLink href="/dashboard/my-sets" Icon={WalletCards}    label="Mis Sets"     onClick={() => setInteractivoOpen(false)} />
              <PopupLink href="/dashboard/trades"  Icon={ArrowLeftRight} label="Intercambios" onClick={() => setInteractivoOpen(false)} />
            </Popup>
          )}
          <TabButton label="Interactivo" Icon={Gamepad2} active={intActive}
            onClick={() => { setInteractivoOpen(o => !o); setMarketOpen(false); }} />
        </div>

        {/* Market — despliega su submenú */}
        <div ref={mktRef} style={cellStyle}>
          {marketOpen && (
            <Popup title="Market">
              <PopupLink href="/dashboard/market/wishlist" Icon={BookSearch} label="Mi Wishlist" onClick={() => setMarketOpen(false)} />
              <Divider />
              <PopupLink href="/dashboard/market" Icon={Store} label="En venta" onClick={() => setMarketOpen(false)} />
              <Divider />
              <PopupLink href="/market" Icon={Store} label="Market local" color={LIME} onClick={() => setMarketOpen(false)} />
            </Popup>
          )}
          <TabButton label="Market" Icon={Store} active={marketActive}
            onClick={() => { setMarketOpen(o => !o); setInteractivoOpen(false); }} />
        </div>
      </nav>
    </>
  );
}

/* ── Piezas ─────────────────────────────────────────────────── */

const cellStyle: React.CSSProperties = {
  flex: 1, position: "relative",
  display: "flex", alignItems: "center", justifyContent: "center",
};

type IconType = React.ComponentType<{
  size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties;
}>;

function TabInner({ label, Icon, active, highlight }: {
  label: string; Icon: IconType; active: boolean; highlight?: boolean;
}) {
  const color  = active ? COURT : highlight ? `${COURT}80` : INK2;
  const iconSz = highlight ? 26 : 22;
  return (
    <>
      {active && (
        <span style={{
          position: "absolute", top: 8,
          width: 4, height: 4, borderRadius: "50%", background: COURT,
        }} />
      )}
      <Icon size={iconSz} color={color} strokeWidth={active ? 2.2 : 1.7} style={{ position: "relative" }} />
      <span style={{
        fontFamily: MONO, fontSize: "9px", letterSpacing: "0.06em",
        textTransform: "uppercase", color,
        fontWeight: active ? 600 : 400, position: "relative",
      }}>
        {label}
      </span>
    </>
  );
}

function TabLink({ href, label, Icon, active, highlight }: {
  href: string; label: string; Icon: IconType; active: boolean; highlight?: boolean;
}) {
  return (
    <Link href={href} style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: "4px",
      textDecoration: "none", position: "relative", paddingBottom: "4px",
    }}>
      <TabInner label={label} Icon={Icon} active={active} highlight={highlight} />
    </Link>
  );
}

function TabButton({ label, Icon, active, onClick }: {
  label: string; Icon: IconType; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: "4px",
      background: "transparent", border: "none", cursor: "pointer",
      position: "relative", paddingBottom: "4px",
    }}>
      <TabInner label={label} Icon={Icon} active={active} />
    </button>
  );
}

function Popup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
      width: 180, background: "#0d1520",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "12px", overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,0,0,0.6)", zIndex: 200,
    }}>
      <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{
          fontFamily: MONO, fontSize: "9px", color: INK2,
          textTransform: "uppercase", letterSpacing: "0.15em", margin: 0,
        }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function PopupLink({ href, Icon, label, color = COURT, onClick }: {
  href: string; Icon: IconType; label: string; color?: string; onClick: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "10px 14px", textDecoration: "none", color: "rgba(245,247,251,0.75)",
    }}>
      <Icon size={14} color={color} strokeWidth={1.8} />
      <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.08em" }}>{label}</span>
    </Link>
  );
}

function Divider() {
  return <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />;
}
