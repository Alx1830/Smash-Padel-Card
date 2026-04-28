"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const COURT = "#2ee6c1";
const BG1   = "#0a0e1a";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const NAV_ITEMS = [
  { href: "/dashboard",             label: "Inicio",     icon: "⊞" },
  { href: "/dashboard/perfil",      label: "Perfil",     icon: "◉" },
  { href: "/dashboard/amigos",      label: "Amigos",     icon: "⊕" },
  { href: "/dashboard/inventario",  label: "Inventario", icon: "⬡" },
  { href: "/dashboard/market",      label: "Market",     icon: "◬" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const supabase  = createClient();
  const [collapsed, setCollapsed] = useState(true);

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
          width: 220px;
          height: 100vh;
          z-index: 50;
          background: ${BG1};
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
        }
        .dash-main {
          margin-left: 220px;
          min-height: 100vh;
          background: #05070d;
          overflow-x: hidden;
          max-width: calc(100vw - 220px);
        }
        .dash-label { display: inline; }
        .dash-logo-text { display: inline; }
        .dash-toggle { display: none; }

        @media (max-width: 767px) {
          .dash-sidebar {
            width: ${collapsed ? "56px" : "200px"};
            transition: width 0.25s ease;
            overflow: hidden;
          }
          .dash-main {
            margin-left: ${collapsed ? "56px" : "200px"};
            max-width: calc(100vw - ${collapsed ? "56px" : "200px"});
            transition: margin-left 0.25s ease, max-width 0.25s ease;
          }
          .dash-label    { display: ${collapsed ? "none" : "inline"}; }
          .dash-logo-text { display: ${collapsed ? "none" : "inline"}; }
          .dash-toggle   { display: flex; }
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
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", minWidth: 0 }}>
              <span style={{
                width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                background: COURT, boxShadow: `0 0 10px ${COURT}`, display: "inline-block",
              }} />
              <span className="dash-logo-text" style={{ fontFamily: DISP, fontSize: "12px", letterSpacing: "0.06em", color: INK0, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                FACEBINDER
              </span>
            </Link>
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

          {/* Nav — cierra el sidebar en móvil al hacer clic */}
          <nav style={{ flex: 1, padding: "12px 6px", overflowY: "auto" }}>
            {NAV_ITEMS.map(({ href, label, icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setCollapsed(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "9px 10px", borderRadius: "9px", marginBottom: "2px",
                    textDecoration: "none",
                    background: active ? `${COURT}18` : "transparent",
                    border: active ? `1px solid ${COURT}33` : "1px solid transparent",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ fontSize: "15px", color: active ? COURT : INK2, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                  <span className="dash-label" style={{
                    fontFamily: MONO, fontSize: "11px",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: active ? COURT : INK2, fontWeight: active ? 600 : 400,
                  }}>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Cerrar sesión */}
          <div style={{ padding: "12px 6px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={handleLogout} style={{
              width: "100%", display: "flex", alignItems: "center", gap: "10px",
              padding: "9px 10px", borderRadius: "9px",
              background: "transparent", border: "1px solid transparent", cursor: "pointer",
              whiteSpace: "nowrap",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,79,79,0.08)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,79,79,0.2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; }}
            >
              <span style={{ fontSize: "15px", color: "#ff4f4f", lineHeight: 1, flexShrink: 0 }}>⏻</span>
              <span className="dash-label" style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#ff4f4f88" }}>
                Cerrar sesión
              </span>
            </button>
          </div>
        </aside>

        <main className="dash-main" style={{ flex: 1 }}>{children}</main>
      </div>
    </>
  );
}
