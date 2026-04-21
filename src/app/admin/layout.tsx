"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG1   = "#0a0e1a";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const NAV_ITEMS = [
  { href: "/admin",             label: "Inicio",    icon: "⊞" },
  { href: "/admin/jugadores",   label: "Jugadores", icon: "⊕" },
  { href: "/admin/clubs",       label: "Clubs",     icon: "⬡" },
  { href: "/admin/ligas",       label: "Ligas",     icon: "◈" },
  { href: "/admin/torneos",     label: "Torneos",   icon: "◇" },
  { href: "/admin/mercado",     label: "Mercado",   icon: "◬" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#05070d" }}>

      <aside style={{
        width: "220px", flexShrink: 0,
        background: BG1,
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
      }}>

        {/* Logo + badge */}
        <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", marginBottom: "10px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: COURT, boxShadow: `0 0 10px ${COURT}`, display: "inline-block" }} />
            <span style={{ fontFamily: DISP, fontSize: "12px", letterSpacing: "0.06em", color: INK0, textTransform: "uppercase" }}>
              SMASH PADEL
            </span>
          </Link>
          <span style={{
            display: "inline-block", padding: "2px 10px", borderRadius: "999px",
            background: `${BALL}22`, border: `1px solid ${BALL}44`,
            fontFamily: MONO, fontSize: "9px", color: BALL, letterSpacing: "0.15em",
          }}>
            ADMINISTRADOR
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "9px 12px", borderRadius: "9px", marginBottom: "2px",
                textDecoration: "none",
                background: active ? `${COURT}18` : "transparent",
                border: active ? `1px solid ${COURT}33` : "1px solid transparent",
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: "15px", color: active ? COURT : INK2, lineHeight: 1 }}>{icon}</span>
                <span style={{
                  fontFamily: MONO, fontSize: "11px",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: active ? COURT : INK2, fontWeight: active ? 600 : 400,
                }}>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Ir a panel usuario + cerrar sesión */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/dashboard" style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "9px 12px", borderRadius: "9px", textDecoration: "none",
            marginBottom: "4px",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
          >
            <span style={{ fontSize: "13px", color: INK2 }}>←</span>
            <span style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Panel usuario
            </span>
          </Link>
          <button onClick={handleLogout} style={{
            width: "100%", display: "flex", alignItems: "center", gap: "10px",
            padding: "9px 12px", borderRadius: "9px",
            background: "transparent", border: "1px solid transparent", cursor: "pointer",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,79,79,0.08)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,79,79,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; }}
          >
            <span style={{ fontSize: "15px", color: "#ff4f4f", lineHeight: 1 }}>⏻</span>
            <span style={{ fontFamily: MONO, fontSize: "11px", color: "#ff4f4f88", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
