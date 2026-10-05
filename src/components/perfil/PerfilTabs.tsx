"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, Layers, Heart, Tag, Star, Trophy } from "lucide-react";
import { COURT, INK0, INK2, MONO } from "./tokens";

/** Las pestañas del perfil. Cada una es su propia ruta: se comparte por enlace. */
export const PESTANAS = [
  { slug: "",           label: "Resumen",    Icon: House },
  { slug: "inventario", label: "Inventario", Icon: LayoutGrid },
  { slug: "wishlist",   label: "Wishlist",   Icon: Heart },
  { slug: "market",     label: "En venta",   Icon: Tag },
  { slug: "resenas",    label: "Reseñas",    Icon: Star },
  { slug: "decks",      label: "Decks",      Icon: Layers },
  { slug: "logros",     label: "Logros",     Icon: Trophy },
] as const;

export function PerfilTabs({ username }: { username: string }) {
  const pathname = usePathname();
  const base = `/${username}`;
  const actual = decodeURIComponent(pathname).replace(new RegExp(`^/${username}`, "i"), "").replace(/^\//, "").split("/")[0];
  const fila = useRef<HTMLDivElement>(null);

  /* En el celular y la tableta no entran las siete pestañas: la activa se
     corre al centro de la fila para que siempre se vea dónde está uno (al
     entrar directo a Logros quedaba escondida a la derecha). Se mueve solo
     la fila, nunca la página. */
  useEffect(() => {
    const caja = fila.current;
    const on = caja?.querySelector<HTMLElement>(".pf-tab.on");
    if (!caja || !on || caja.scrollWidth <= caja.clientWidth) return;
    const desde = on.getBoundingClientRect().left - caja.getBoundingClientRect().left + caja.scrollLeft;
    caja.scrollTo({ left: desde - (caja.clientWidth - on.offsetWidth) / 2, behavior: "smooth" });
  }, [actual]);

  return (
    <nav className="pf-tabs-wrap" aria-label="Secciones del perfil">
      <style>{`
        .pf-tabs-wrap { max-width: 1400px; margin: 28px auto 0; padding: 0 clamp(16px, 3vw, 46px); }
        .pf-tabs {
          display: flex; border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06);
          overflow-x: auto; scrollbar-width: none;
        }
        .pf-tabs::-webkit-scrollbar { display: none; }
        .pf-tab {
          position: relative; flex: 1 0 auto; display: flex; align-items: center; gap: 10px;
          padding: 13px 18px; text-decoration: none; white-space: nowrap;
          font-family: ${MONO}; font-size: 12px; letter-spacing: 0.02em; color: ${INK2}; transition: color .15s;
        }
        .pf-tab:hover { color: ${INK0}; }
        .pf-tab.on { color: ${INK0}; font-weight: 600; background: linear-gradient(to top, rgba(46,230,193,0.06), transparent); }
        .pf-tab.on::after {
          content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 3px; border-radius: 2px;
          background: ${COURT}; box-shadow: 0 0 10px rgba(46,230,193,0.6);
        }
        /* Con la fila desbordada (celular y tableta) el borde derecho se
           desvanece para avisar que hay más pestañas al deslizar. */
        @media (max-width: 1023px), (pointer: coarse) {
          .pf-tabs { -webkit-mask-image: linear-gradient(90deg, #000 88%, transparent); mask-image: linear-gradient(90deg, #000 88%, transparent); }
          .pf-tab { flex: 0 0 auto; min-height: 44px; }
        }
        @media (max-width: 767px) {
          .pf-tabs-wrap { margin-top: 22px; }
          .pf-tab { padding: 12px 14px; gap: 8px; }
        }
      `}</style>
      <div className="pf-tabs" ref={fila}>
        {PESTANAS.map(({ slug, label, Icon }) => {
          const on = actual === slug;
          return (
            <Link key={slug} href={slug ? `${base}/${slug}` : base} className={`pf-tab${on ? " on" : ""}`} aria-current={on ? "page" : undefined} scroll={false}>
              <Icon size={15} color={on ? COURT : undefined} strokeWidth={1.9} /> {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
