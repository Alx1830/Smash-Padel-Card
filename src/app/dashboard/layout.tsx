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

const NAV_ITEMS = [
  { href: "/dashboard",             label: "Inicio",     Icon: House },
  { href: "/dashboard/perfil",      label: "Perfil",     Icon: UserRoundPen },
  { href: "/dashboard/amigos",      label: "Amigos",     Icon: HeartHandshake },
  { href: "/dashboard/inventario",  label: "Inventario", Icon: LayoutGrid },
  { href: "/dashboard/market",      label: "Market",     Icon: Store },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const supabase  = createClient();
  const [collapsed, setCollapsed] = useState(true);
  const [photoUrl, setPhotoUrl]   = useState<string | null>(null);
  const [username, setUsername]   = useState<string | null>(null);
  const [menuOpen, setMenuOpen]   = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <style>{`
        .dash-sidebar {
          position: fixed;
          top: 0; left: 0;
          width: 260px;
          height: 100vh;
          z-index: 50;
          background: ${BG1};
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
        }
        .dash-main {
          margin-left: 260px;
          min-height: 100vh;
          background: #05070d;
          overflow-x: hidden;
          max-width: calc(100vw - 260px);
        }
        .dash-label { display: inline; }
        .dash-logo-text { display: inline; }
        .dash-toggle { display: none; }
        .dash-avatar-name { display: inline; }

        @media (max-width: 767px) {
          .dash-sidebar {
            width: ${collapsed ? "64px" : "220px"};
            transition: width 0.25s ease;
            overflow: hidden;
          }
          .dash-main {
            margin-left: ${collapsed ? "64px" : "220px"};
            max-width: calc(100vw - ${collapsed ? "64px" : "220px"});
            transition: margin-left 0.25s ease, max-width 0.25s ease;
          }
          .dash-label      { display: ${collapsed ? "none" : "inline"}; }
          .dash-logo-text  { display: ${collapsed ? "none" : "inline"}; }
          .dash-toggle     { display: flex; }
          .dash-avatar-name { display: ${collapsed ? "none" : "inline"}; }
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: "#05070d" }}>
        <aside className="dash-sidebar">

          {/* Logo + toggle */}
          <div style={{
            padding: "20px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
          }}>
            <span style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
              <span className="dash-logo-text" style={{ fontFamily: DISP, fontSize: "14px", letterSpacing: "0.06em", color: INK0, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                FACEBINDER
              </span>
            </span>
            <button
              className="dash-toggle"
              onClick={() => setCollapsed(v => !v)}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: INK2, fontSize: "18px", padding: "0", flexShrink: 0,
                alignItems: "center", justifyContent: "center",
              }}
              aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {collapsed ? "›" : "‹"}
            </button>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "16px 10px", overflowY: "auto" }}>
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setCollapsed(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "11px 14px", borderRadius: "10px", marginBottom: "4px",
                    textDecoration: "none",
                    background: active ? `${COURT}18` : "transparent",
                    border: active ? `1px solid ${COURT}33` : "1px solid transparent",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon size={20} color={active ? COURT : INK2} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                  <span className="dash-label" style={{
                    fontFamily: MONO, fontSize: "12px",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: active ? COURT : INK2, fontWeight: active ? 600 : 400,
                  }}>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Avatar menu */}
          <div ref={menuRef} style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.06)", position: "relative" }}>

            {/* Dropdown — aparece hacia arriba */}
            {menuOpen && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 8px)", left: "10px", right: "10px",
                background: "#0d1520", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px", overflow: "hidden",
                boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
              }}>
                <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ fontFamily: MONO, fontSize: "9px", color: INK2, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Mi cuenta</p>
                </div>
                {username && (
                  <Link href={`/${username}`} onClick={() => setMenuOpen(false)} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 14px", textDecoration: "none",
                    color: "rgba(245,247,251,0.75)",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${COURT}12`)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <User size={15} color={COURT} strokeWidth={1.8} />
                    <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.08em" }}>Ver perfil</span>
                  </Link>
                )}
                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
                <Link href="/dashboard/perfil" onClick={() => setMenuOpen(false)} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 14px", textDecoration: "none",
                  color: "rgba(245,247,251,0.75)",
                  transition: "background 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${COURT}12`)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <Pencil size={15} color={COURT} strokeWidth={1.8} />
                  <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.08em" }}>Editar perfil</span>
                </Link>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
                <button onClick={handleLogout} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 14px", background: "transparent", border: "none",
                  cursor: "pointer", color: "rgba(255,79,79,0.7)", transition: "background 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,79,79,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut size={15} color="#ff4f4f" strokeWidth={1.8} />
                  <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.08em" }}>Cerrar sesión</span>
                </button>
              </div>
            )}

            {/* Avatar trigger */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "10px",
                padding: "8px 10px", borderRadius: "10px", background: "transparent",
                border: menuOpen ? `1px solid ${COURT}33` : "1px solid transparent",
                cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { if (!menuOpen) (e.currentTarget.style.background = "rgba(255,255,255,0.04)"); }}
              onMouseLeave={e => { if (!menuOpen) (e.currentTarget.style.background = "transparent"); }}
            >
              {/* Avatar circle */}
              <div style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
                border: `2px solid ${COURT}40`,
              }}>
                {photoUrl ? (
                  <Image src={photoUrl} alt="Avatar" width={36} height={36}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }} unoptimized />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: `${COURT}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User size={16} color={COURT} />
                  </div>
                )}
              </div>

              {/* Name + status */}
              <div className="dash-avatar-name" style={{ textAlign: "left", minWidth: 0 }}>
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

        <main className="dash-main" style={{ flex: 1 }}>{children}</main>
      </div>
    </>
  );
}
