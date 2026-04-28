"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { House, UserRoundPen, LayoutGrid, HeartHandshake, Store } from "lucide-react";

const COURT = "#2ee6c1";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";

const TABS = [
  { href: "/dashboard",            label: "Inicio",     Icon: House,          highlight: false },
  { href: "/dashboard/perfil",     label: "Perfil",     Icon: UserRoundPen,   highlight: false },
  { href: "/dashboard/inventario", label: "Inventario", Icon: LayoutGrid,     highlight: true  },
  { href: "/dashboard/amigos",     label: "Amigos",     Icon: HeartHandshake, highlight: false },
  { href: "/dashboard/market",     label: "Market",     Icon: Store,          highlight: false },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user);
    });
  }, []);

  if (!loggedIn) return null;

  return (
    <>
      <style>{`
        .mob-profile-tabbar {
          display: none;
        }
        @media (max-width: 1023px) {
          .mob-profile-tabbar {
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
          /* add bottom padding to page so content isn't hidden behind tab bar */
          body { padding-bottom: 72px; }
        }
      `}</style>
      <nav className="mob-profile-tabbar">
        {TABS.map(({ href, label, Icon, highlight }) => {
          const active = pathname === href;
          const color  = active ? COURT : highlight ? `${COURT}80` : INK2;
          const iconSz = highlight ? 26 : 22;
          return (
            <Link key={href} href={href} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "4px",
              textDecoration: "none", position: "relative", paddingBottom: "4px",
            }}>
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
            </Link>
          );
        })}
      </nav>
    </>
  );
}
