"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const NotificationsDrawer = dynamic(
  () => import("@/components/NotificationsDrawer").then(m => ({ default: m.NotificationsDrawer })),
  { ssr: false }
);

const NAV_LINKS_GUEST = [
  { label: "INICIO",     href: "/" },
  { label: "INVENTARIO", href: "/dashboard/inventario" },
  { label: "MARKET",     href: "/market" },
];

interface NavbarProps {
  initialLoggedIn?: boolean;
  initialPhotoUrl?: string | null;
  initialUsername?: string | null;
}

export function Navbar({ initialLoggedIn, initialPhotoUrl, initialUsername }: NavbarProps = {}) {
  const supabase      = createClient();
  const router        = useRouter();
  const pathname      = usePathname();
  const avatarRef     = useRef<HTMLDivElement>(null);

  const [photoUrl, setPhotoUrl]     = useState<string | null>(initialPhotoUrl ?? null);
  const [username, setUsername]     = useState<string | null>(initialUsername ?? null);
  const [userId, setUserId]         = useState<string | null>(null);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedIn, setLoggedIn]     = useState(initialLoggedIn ?? false);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [notifAnchor, setNotifAnchor] = useState<DOMRect | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const { unreadCount, notifications, markAllRead, markRead, loading: notifLoading } = useNotifications(userId);

  useEffect(() => {
    if (initialLoggedIn) {
      router.prefetch("/dashboard");
      router.prefetch("/dashboard/inventario");
    }
    if (initialLoggedIn !== undefined) {
      // Still need userId for notifications
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setUserId(user.id);
      });
      return;
    }
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setLoggedIn(true);
      setUserId(user.id);
      router.prefetch("/dashboard");
      router.prefetch("/dashboard/inventario");
      const { data } = await supabase
        .from("players").select("photo_url, username, role").eq("user_id", user.id).single();
      if (data?.photo_url) setPhotoUrl(data.photo_url);
      if (data?.username)  setUsername(data.username);
      if (data?.role === "admin") setIsAdmin(true);
    }
    load();
  }, []);


  // Close desktop avatar dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node))
        setAvatarOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    sessionStorage.removeItem("last_news_dismissed");
    setLoggedIn(false); setPhotoUrl(null);
    setAvatarOpen(false); setMobileOpen(false);
    router.push("/");
  }

  const AvatarCircle = ({ size = 36 }: { size?: number }) => (
    <div
      className="rounded-full overflow-hidden border-2 border-[#2ee6c1]/40 hover:border-[#2ee6c1]/80 transition-colors"
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      {photoUrl ? (
        <Image src={photoUrl} alt="Avatar" width={size} height={size}
          className="object-cover w-full h-full" unoptimized />
      ) : (
        <div className="w-full h-full bg-[#2ee6c1]/10 flex items-center justify-center text-[#2ee6c1] text-sm font-bold">
          ?
        </div>
      )}
    </div>
  );

  // Dashboard has its own sidebar — don't render the public Navbar there
  if (pathname.startsWith("/dashboard")) return null;

  // Build auth nav links dynamically (needs username for Perfil)
  const NAV_LINKS_AUTH = [
    { label: "INICIO",     href: "/dashboard" },
    { label: "PERFIL",     href: username ? `/${username}` : "/dashboard/perfil" },
    { label: "INVENTARIO", href: "/dashboard/inventario" },
    { label: "AMIGOS",     href: "/dashboard/amigos" },
    { label: "WISHLIST",   href: "/dashboard/market/wishlist" },
    { label: "MARKET",     href: "/market" },
  ];

  return (
    <>
      <nav className={`flex fixed left-0 right-0 z-50 items-center justify-between px-6 py-4 border-b border-[#2ee6c1]/10 bg-[#05070d]/90 backdrop-blur-md ${pathname === "/" ? "top-8" : "top-0"}`}>

        {/* Logo */}
        <Link href={loggedIn ? "/dashboard" : "/"} className="flex items-center shrink-0">
          <span style={{
            fontFamily: "var(--font-archivo)", fontSize: "17px", fontWeight: 900,
            letterSpacing: "0.02em",
            background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text", userSelect: "none", pointerEvents: "none",
          }}>
            FaceBinder
          </span>
        </Link>

        {/* Links — hidden on mobile/tablet, visible on desktop */}
        <div className="hidden lg:flex items-center gap-8">
          {(loggedIn ? NAV_LINKS_AUTH : NAV_LINKS_GUEST).map(({ label, href }) => (
            <Link key={label} href={href}
              className="text-xs font-medium tracking-[0.15em] text-white/60 hover:text-[#2ee6c1] transition-colors duration-200"
              style={{ fontFamily: "var(--font-jetbrains)" }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">

          {/* Bell — only when logged in */}
          {loggedIn && (
            <button
              ref={bellRef}
              onClick={() => {
                setNotifAnchor(bellRef.current?.getBoundingClientRect() ?? null);
                setNotifOpen(o => !o);
              }}
              className="relative p-1.5 text-white/50 hover:text-[#2ee6c1] transition-colors"
              style={{ background: "transparent", border: "none", cursor: "pointer" }}
            >
              <Bell size={18} strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-[#2ee6c1] text-[#05070d] text-[9px] font-bold flex items-center justify-center px-0.5"
                  style={{ fontFamily: "var(--font-jetbrains)" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* Avatar dropdown (logged in) or CTA button */}
          {loggedIn ? (
            <div ref={avatarRef} className="relative">
              <button onClick={() => setAvatarOpen(o => !o)}
                className="relative cursor-pointer focus:outline-none"
                aria-label="Menú de usuario">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#2ee6c1]/40 hover:border-[#2ee6c1]/80 transition-colors">
                  {photoUrl ? (
                    <Image src={photoUrl} alt="Avatar" width={36} height={36}
                      className="object-cover w-full h-full" unoptimized />
                  ) : (
                    <div className="w-full h-full bg-[#2ee6c1]/10 flex items-center justify-center text-[#2ee6c1] text-sm font-bold">
                      ?
                    </div>
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#05070d]" />
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-full mt-3 w-52 rounded-xl border border-white/10 bg-[#0a1410]/95 backdrop-blur-md shadow-2xl overflow-hidden z-[200]">
                  <div className="px-4 py-3 border-b border-white/8">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest"
                      style={{ fontFamily: "var(--font-jetbrains)" }}>Mi cuenta</p>
                  </div>
                  {username && (
                    <Link href={`/${username}`} onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-xs text-white/80 hover:bg-[#2ee6c1]/10 hover:text-[#2ee6c1] transition-colors"
                      style={{ fontFamily: "var(--font-jetbrains)", letterSpacing: "0.08em" }}>
                      <span>◉</span> Ver perfil
                    </Link>
                  )}
                  <div className="h-px bg-white/8" />
                  <Link href="/dashboard/perfil" onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-xs text-white/80 hover:bg-[#2ee6c1]/10 hover:text-[#2ee6c1] transition-colors"
                    style={{ fontFamily: "var(--font-jetbrains)", letterSpacing: "0.08em" }}>
                    <span>✎</span> Editar mi perfil
                  </Link>
                  {isAdmin && (
                    <>
                      <div className="h-px bg-white/8" />
                      <Link href="/dashboard/admin/usuarios" onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-xs hover:bg-[#2ee6c1]/10 hover:text-[#2ee6c1] transition-colors"
                        style={{ fontFamily: "var(--font-jetbrains)", letterSpacing: "0.08em", color: "#f59e0b" }}>
                        <span>⚙</span> Ver usuarios
                      </Link>
                      <Link href="/dashboard/admin/feed" onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-xs hover:bg-[#2ee6c1]/10 hover:text-[#2ee6c1] transition-colors"
                        style={{ fontFamily: "var(--font-jetbrains)", letterSpacing: "0.08em", color: "#f59e0b" }}>
                        <span>📝</span> Feed post
                      </Link>
                    </>
                  )}
                  <div className="h-px bg-white/8" />
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-xs text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    style={{ fontFamily: "var(--font-jetbrains)", letterSpacing: "0.08em" }}>
                    <span>→</span> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login"
              className="inline-flex px-4 py-2 rounded-full border border-white/30 text-white text-xs font-medium tracking-wider hover:bg-white hover:text-[#05070d] transition-all duration-200"
              style={{ fontFamily: "var(--font-jetbrains)" }}>
              Crear mi Facebinder
            </Link>
          )}
        </div>
      </nav>

      {/* Notifications drawer */}
      {notifOpen && userId && (
        <NotificationsDrawer
          notifications={notifications}
          unreadCount={unreadCount}
          loading={notifLoading}
          markAllRead={markAllRead}
          markRead={markRead}
          onClose={() => setNotifOpen(false)}
          anchorRect={notifAnchor}
          isMobile={typeof window !== "undefined" && window.innerWidth < 768}
        />
      )}

      {/* Mobile full-screen menu — only for non-dashboard pages on small screens */}
      <div className={`fixed inset-0 z-40 bg-[#05070d]/98 backdrop-blur-lg transition-all duration-300 flex flex-col lg:hidden ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
          {loggedIn ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <AvatarCircle size={40} />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[#05070d]" />
              </div>
              <span className="text-white/60 text-xs" style={{ fontFamily: "var(--font-jetbrains)" }}>En línea</span>
            </div>
          ) : (
            <span className="text-white/40 text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-jetbrains)" }}>
              Menú
            </span>
          )}
          <button onClick={() => setMobileOpen(false)}
            className="ml-auto text-white/60 hover:text-white text-2xl focus:outline-none">✕</button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col px-8 pt-8 gap-1 flex-1">
          {(loggedIn ? NAV_LINKS_AUTH : NAV_LINKS_GUEST).map(({ label, href }) => (
            <Link key={label} href={href} onClick={() => setMobileOpen(false)}
              className="text-xl font-bold tracking-widest text-white/70 hover:text-[#2ee6c1] transition-colors py-4 border-b border-white/6 uppercase"
              style={{ fontFamily: "var(--font-archivo)" }}>
              {label}
            </Link>
          ))}

          {loggedIn ? (
            <>
              <Link href="/dashboard/perfil" onClick={() => setMobileOpen(false)}
                className="text-xl font-bold tracking-widest text-[#2ee6c1]/80 hover:text-[#2ee6c1] transition-colors py-4 border-b border-white/6 uppercase"
                style={{ fontFamily: "var(--font-archivo)" }}>
                ✎ Mi perfil
              </Link>
              <button onClick={handleLogout}
                className="text-left text-xl font-bold tracking-widest text-red-400/70 hover:text-red-400 transition-colors py-4 uppercase"
                style={{ fontFamily: "var(--font-archivo)" }}>
                → Cerrar sesión
              </button>
            </>
          ) : (
            <Link href="/login" onClick={() => setMobileOpen(false)}
              className="mt-6 px-6 py-3 rounded-full border border-white/30 text-white text-sm font-medium tracking-wider text-center hover:bg-white hover:text-[#05070d] transition-all"
              style={{ fontFamily: "var(--font-jetbrains)" }}>
              Crear mi Facebinder
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
