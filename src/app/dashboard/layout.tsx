"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { House, UserRoundPen, HeartHandshake, LayoutGrid, Store, LogOut, User, Pencil } from "lucide-react";

const COURT = "#2ee6c1";
const BG1   = "#0a0e1a";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

/* Desktop sidebar items */
const SIDEBAR_ITEMS = [
  { href: "/dashboard",            label: "Inicio",     Icon: House },
  { href: "/dashboard/perfil",     label: "Perfil",     Icon: UserRoundPen },
  { href: "/dashboard/amigos",     label: "Amigos",     Icon: HeartHandshake },
  { href: "/dashboard/inventario", label: "Inventario", Icon: LayoutGrid },
  { href: "/dashboard/market",     label: "Market",     Icon: Store },
];

/* Mobile bottom-tab order: Inicio, Perfil, Inventario (highlighted), Amigos, Market */
const MOBILE_TABS = [
  { href: "/dashboard",            label: "Inicio",     Icon: House,          highlight: false },
  { href: "/dashboard/perfil",     label: "Perfil",     Icon: UserRoundPen,   highlight: false },
  { href: "/dashboard/inventario", label: "Inventario", Icon: LayoutGrid,     highlight: true  },
  { href: "/dashboard/amigos",     label: "Amigos",     Icon: HeartHandshake, highlight: false },
  { href: "/dashboard/market",     label: "Market",     Icon: Store,          highlight: false },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef    = useRef<HTMLDivElement>(null);
  const mobileRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("players").select("photo_url, username").eq("user_id", user.id).single();
      if (data?.photo_url) setPhotoUrl(data.photo_url);
      if (data?.username)  setUsername(data.username);
    }
    load();
  }, []);

  /* Close dropdown on outside click — checks both desktop and mobile refs */
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      const inDesktop = menuRef.current?.contains(e.target as Node);
      const inMobile  = mobileRef.current?.contains(e.target as Node);
      if (!inDesktop && !inMobile) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
  }

  /* Shared avatar dropdown content */
  const AvatarDropdown = ({ direction = "up" }: { direction?: "up" | "down" }) => (
    <div style={{
      position: "absolute",
      ...(direction === "up"
        ? { bottom: "calc(100% + 10px)", right: 0 }
        : { top: "calc(100% + 10px)", right: 0 }),
      width: 200,
      background: "#0d1520",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "14px", overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      zIndex: 200,
    }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontFamily: MONO, fontSize: "9px", color: INK2, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
          Mi cuenta
        </p>
      </div>
      {username && (
        <a href={`/${username}`} style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "10px 14px", textDecoration: "none", color: "rgba(245,247,251,0.75)",
        }}
          onMouseEnter={e => (e.currentTarget.style.background = `${COURT}12`)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <User size={14} color={COURT} strokeWidth={1.8} />
          <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.08em" }}>Ver perfil</span>
        </a>
      )}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
      <a href="/dashboard/perfil" style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 14px", textDecoration: "none", color: "rgba(245,247,251,0.75)",
      }}
        onMouseEnter={e => (e.currentTarget.style.background = `${COURT}12`)}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <Pencil size={14} color={COURT} strokeWidth={1.8} />
        <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.08em" }}>Editar perfil</span>
      </a>
      <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
      <button onClick={handleLogout} style={{
        width: "100%", display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 14px", background: "transparent", border: "none",
        cursor: "pointer", color: "rgba(255,79,79,0.7)",
      }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,79,79,0.08)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <LogOut size={14} color="#ff4f4f" strokeWidth={1.8} />
        <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.08em" }}>Cerrar sesión</span>
      </button>
    </div>
  );

  /* Shared avatar circle */
  const AvatarCircle = ({ size = 36 }: { size?: number }) => (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
      border: `2px solid ${COURT}50`,
    }}>
      {photoUrl ? (
        <Image src={photoUrl} alt="Avatar" width={size} height={size}
          style={{ objectFit: "cover", width: "100%", height: "100%" }} unoptimized />
      ) : (
        <div style={{ width: "100%", height: "100%", background: `${COURT}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <User size={size * 0.44} color={COURT} />
        </div>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        /* ── DESKTOP sidebar ── */
        .dash-sidebar {
          position: fixed; top: 0; left: 0;
          width: 260px; height: 100vh; z-index: 50;
          background: ${BG1};
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column;
        }
        .dash-main {
          margin-left: 260px;
          min-height: 100vh;
          background: #05070d;
          overflow-x: hidden;
          max-width: calc(100vw - 260px);
        }
        /* ── MOBILE top bar + bottom tabs ── */
        .mob-topbar  { display: none; }
        .mob-tabbar  { display: none; }
        .mob-content { padding-bottom: 0; }

        @media (max-width: 1023px) {
          /* Hide desktop sidebar entirely */
          .dash-sidebar { display: none; }
          .dash-main {
            margin-left: 0;
            max-width: 100vw;
            padding-bottom: 84px; /* space for tab bar */
          }

          /* Top bar */
          .mob-topbar {
            display: flex;
            position: fixed; top: 0; left: 0; right: 0; z-index: 60;
            align-items: center; justify-content: space-between;
            padding: 0 20px;
            height: 56px;
            background: rgba(10,14,26,0.92);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid rgba(255,255,255,0.06);
          }

          /* Bottom tab bar */
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

          /* Push content below top bar */
          .dash-main { padding-top: 56px; }
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: "#05070d" }}>

        {/* ══ DESKTOP SIDEBAR ══ */}
        <aside className="dash-sidebar">
          {/* Logo */}
          <div style={{
            padding: "20px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center",
          }}>
            <span style={{
              fontFamily: DISP, fontSize: "17px", fontWeight: 900, letterSpacing: "0.02em",
              background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text", userSelect: "none",
            }}>
              FaceBinder
            </span>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "16px 10px", overflowY: "auto" }}>
            {SIDEBAR_ITEMS.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "11px 14px", borderRadius: "10px", marginBottom: "4px",
                  textDecoration: "none",
                  background: active ? `${COURT}18` : "transparent",
                  border: active ? `1px solid ${COURT}33` : "1px solid transparent",
                  transition: "all 0.15s", whiteSpace: "nowrap",
                }}>
                  <Icon size={20} color={active ? COURT : INK2} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                  <span style={{
                    fontFamily: MONO, fontSize: "12px", letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: active ? COURT : INK2, fontWeight: active ? 600 : 400,
                  }}>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Avatar menu — desktop */}
          <div ref={menuRef} style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.06)", position: "relative" }}>
            {menuOpen && <AvatarDropdown direction="up" />}
            <button onClick={() => setMenuOpen(o => !o)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: "10px",
              padding: "8px 10px", borderRadius: "10px", background: "transparent",
              border: menuOpen ? `1px solid ${COURT}33` : "1px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
            }}
              onMouseEnter={e => { if (!menuOpen) (e.currentTarget.style.background = "rgba(255,255,255,0.04)"); }}
              onMouseLeave={e => { if (!menuOpen) (e.currentTarget.style.background = "transparent"); }}
            >
              <AvatarCircle size={36} />
              <div style={{ textAlign: "left", minWidth: 0, overflow: "hidden" }}>
                <p style={{ fontFamily: MONO, fontSize: "11px", color: INK0, letterSpacing: "0.06em", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {username ?? "Mi cuenta"}
                </p>
                <p style={{ fontFamily: MONO, fontSize: "9px", color: COURT, letterSpacing: "0.08em", margin: 0, textTransform: "uppercase" }}>
                  En línea
                </p>
              </div>
            </button>
          </div>
        </aside>

        {/* ══ MOBILE TOP BAR ══ */}
        <div className="mob-topbar">
          {/* Logo */}
          <span style={{
            fontFamily: DISP, fontSize: "17px", fontWeight: 900, letterSpacing: "0.02em",
            background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text", userSelect: "none",
          }}>
            FaceBinder
          </span>

          {/* Avatar button — top right */}
          <div ref={mobileRef} style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(o => !o)} style={{
              background: "transparent", border: "none", cursor: "pointer", padding: 0,
              display: "flex", alignItems: "center",
            }}>
              <div style={{ position: "relative" }}>
                <AvatarCircle size={34} />
                <span style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 9, height: 9, borderRadius: "50%",
                  background: "#22c55e", border: "2px solid #0a0e1a",
                }} />
              </div>
            </button>
            {menuOpen && <AvatarDropdown direction="down" />}
          </div>
        </div>

        {/* ══ MOBILE BOTTOM TAB BAR ══ */}
        <nav className="mob-tabbar">
          {MOBILE_TABS.map(({ href, label, Icon, highlight }) => {
            const active = pathname === href;
            const color  = active ? COURT : highlight ? `${COURT}80` : INK2;
            const iconSz = highlight ? 26 : 22;
            return (
              <Link key={href} href={href} style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "4px",
                textDecoration: "none", position: "relative",
                paddingBottom: "4px",
              }}>
                {/* Active indicator dot */}
                {active && (
                  <span style={{
                    position: "absolute", top: 8,
                    width: 4, height: 4, borderRadius: "50%",
                    background: COURT,
                  }} />
                )}
                <Icon size={iconSz} color={color} strokeWidth={active ? 2.2 : 1.7} style={{ position: "relative" }} />
                <span style={{
                  fontFamily: MONO, fontSize: "9px", letterSpacing: "0.06em",
                  textTransform: "uppercase", color,
                  fontWeight: active ? 600 : 400,
                  position: "relative",
                }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* ══ MAIN CONTENT ══ */}
        <main className="dash-main" style={{ flex: 1 }}>{children}</main>
      </div>
    </>
  );
}
