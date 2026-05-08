"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";

const NAV_LINKS_GUEST = [
  { label: "INICIO",     href: "/" },
  { label: "AMIGOS",     href: "/dashboard/amigos" },
  { label: "INVENTARIO", href: "/dashboard/inventario" },
  { label: "MARKET",     href: "/market" },
];
const NAV_LINKS_AUTH = [
  { label: "INICIO",     href: "/dashboard" },
  { label: "AMIGOS",     href: "/dashboard/amigos" },
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

  const [photoUrl, setPhotoUrl]       = useState<string | null>(initialPhotoUrl ?? null);
  const [username, setUsername]       = useState<string | null>(initialUsername ?? null);
  const [avatarOpen, setAvatarOpen]   = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [loggedIn, setLoggedIn]       = useState(initialLoggedIn ?? false);

  useEffect(() => {
    if (initialLoggedIn) {
      router.prefetch("/dashboard");
      router.prefetch("/dashboard/inventario");
    }
    // Skip client fetch if server already provided the data
    if (initialLoggedIn !== undefined) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setLoggedIn(true);
      router.prefetch("/dashboard");
      router.prefetch("/dashboard/inventario");
      const { data } = await supabase
        .from("players").select("photo_url, username").eq("user_id", user.id).single();
      if (data?.photo_url) setPhotoUrl(data.photo_url);
      if (data?.username)  setUsername(data.username);
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
    setLoggedIn(false); setPhotoUrl(null);
    setAvatarOpen(false); setMobileOpen(false);
    router.push("/");
  }

  /* Avatar circle — shared across mobile trigger and mobile menu header */
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

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-[#2ee6c1]/10 bg-[#05070d]/90 backdrop-blur-md">

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

        {/* Desktop links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-8">
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

          {/* ── DESKTOP: avatar dropdown (logged in) or CTA button ── */}
          {loggedIn ? (
            <div ref={avatarRef} className="hidden md:block relative">
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
              className="hidden md:inline-flex px-4 py-2 rounded-full border border-white/30 text-white text-xs font-medium tracking-wider hover:bg-white hover:text-[#05070d] transition-all duration-200"
              style={{ fontFamily: "var(--font-jetbrains)" }}>
              Crear mi Facebinder
            </Link>
          )}

          {/* ── MOBILE: avatar button (always visible, opens full-screen menu) ── */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden relative cursor-pointer focus:outline-none"
            aria-label="Menú"
          >
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
            {loggedIn && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#05070d]" />
            )}
          </button>
        </div>
      </nav>

      {/* ── Mobile full-screen menu ── */}
      <div className={`fixed inset-0 z-40 bg-[#05070d]/98 backdrop-blur-lg transition-all duration-300 flex flex-col md:hidden ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>

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
