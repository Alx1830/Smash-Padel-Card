"use client";

/**
 * Las noticias del sitio, dentro del panel.
 *
 * Trae seis y, al llegar al final, las seis siguientes. La paginación va por
 * fecha —"lo publicado antes de esta"— y no por número de página: con notas
 * entrando todo el tiempo, saltar por página repite o saltea.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Newspaper } from "lucide-react";

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";

const DE_A = 6;

interface Nota {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  category: string;
  published_at: string | null;
  created_at: string;
}

export function MuroNoticias() {
  const [notas, setNotas]   = useState<Nota[]>([]);
  const [quedan, setQuedan] = useState(true);
  const [primera, setPrimera] = useState(true);

  /* El centinela: cuando entra en pantalla, se piden seis más. */
  const fondo = useRef<HTMLDivElement>(null);
  const pidiendo = useRef(false);
  const ultima = useRef<string | null>(null);

  const traer = useCallback(async () => {
    if (pidiendo.current) return;
    pidiendo.current = true;

    const supabase = createClient();
    let q = supabase
      .from("admin_posts")
      .select("id, slug, title, excerpt, cover_url, category, published_at, created_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(DE_A);

    if (ultima.current) q = q.lt("published_at", ultima.current);

    const { data } = await q;
    const llegaron = (data ?? []) as Nota[];

    if (llegaron.length) {
      ultima.current = llegaron[llegaron.length - 1].published_at
        ?? llegaron[llegaron.length - 1].created_at;
      setNotas((antes) => [...antes, ...llegaron]);
    }
    if (llegaron.length < DE_A) setQuedan(false);
    setPrimera(false);
    pidiendo.current = false;
  }, []);

  useEffect(() => {
    const centinela = fondo.current;
    if (!centinela) return;
    /* El propio observador dispara la primera tanda: el centinela arranca a la
       vista, así que no hace falta pedirla aparte. */
    const ojo = new IntersectionObserver((entradas) => {
      if (entradas[0].isIntersecting) traer();
    }, { rootMargin: "220px" });
    ojo.observe(centinela);
    return () => ojo.disconnect();
  }, [traer]);

  return (
    <section className="mu-caja">
      <header className="mu-cabeza">
        <Newspaper size={14} color={COURT} strokeWidth={1.8} />
        <h2 className="mu-titulo">Noticias</h2>
        <Link href="/post" className="mu-vertodo">Ver todas →</Link>
      </header>

      <div className="mu-lista">
        {notas.map((n) => (
          <Link key={n.id} href={`/post/${n.slug}`} className="mn-nota">
            {n.cover_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={n.cover_url} alt="" loading="lazy" decoding="async" className="mn-foto" />
            )}
            <div style={{ minWidth: 0 }}>
              <span className="mn-cat">{n.category}</span>
              <p className="mn-tit">{n.title}</p>
              {n.excerpt && <p className="mn-baj">{n.excerpt}</p>}
            </div>
          </Link>
        ))}

        {primera && (
          <>
            <style>{`@keyframes mu-late{0%,100%{opacity:.3}50%{opacity:.65}}`}</style>
            {[0, 1, 2].map((i) => (
              <div key={i} className="mu-hueco" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </>
        )}

        {!primera && notas.length === 0 && (
          <p className="mu-vacio">Todavía no hay noticias publicadas.</p>
        )}

        <div ref={fondo} style={{ height: 1 }} />

        {!quedan && notas.length > 0 && (
          <p className="mu-fin">Hasta acá llegan las noticias</p>
        )}
      </div>

      <style>{`
        .mn-nota { display: grid; grid-template-columns: 74px minmax(0, 1fr); gap: 11px;
          padding: 9px; border-radius: 11px; text-decoration: none;
          border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);
          transition: border-color 0.15s, background 0.15s; }
        .mn-nota:hover { border-color: rgba(46,230,193,0.35); background: rgba(255,255,255,0.04); }
        .mn-foto { width: 74px; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 7px; }
        .mn-cat { font-family: ${MONO}; font-size: 8.5px; letter-spacing: 0.16em;
          text-transform: uppercase; color: ${COURT}; }
        .mn-tit { font-family: ${DISP}; font-size: 13px; font-weight: 700; color: ${INK0};
          margin: 4px 0 0; line-height: 1.35;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .mn-baj { font-family: ${MONO}; font-size: 10px; color: ${INK2}; margin: 5px 0 0;
          line-height: 1.6;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .mu-hueco { height: 74px; border-radius: 11px; background: rgba(255,255,255,0.05);
          animation: mu-late 1.4s ease-in-out infinite; }
        .mu-vacio, .mu-fin { font-family: ${MONO}; font-size: 10px; color: ${INK2};
          margin: 0; text-align: center; padding: 10px 0; }
        .mu-caja { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 18px; display: flex; flex-direction: column;
          min-width: 0; }
        .mu-cabeza { display: flex; align-items: center; gap: 9px; margin-bottom: 14px; }
        .mu-titulo { font-family: ${MONO}; font-size: 9px; letter-spacing: 0.18em;
          text-transform: uppercase; color: ${INK2}; margin: 0; font-weight: 400; }
        .mu-vertodo { margin-left: auto; font-family: ${MONO}; font-size: 9px;
          letter-spacing: 0.1em; text-transform: uppercase; color: ${COURT};
          text-decoration: none; }
        /* Se recorre por dentro: así las dos columnas quedan parejas y el panel
           no se estira hasta el infinito a medida que se cargan más. */
        .mu-lista { display: flex; flex-direction: column; gap: 9px;
          max-height: 560px; overflow-y: auto; padding-right: 4px; }
        .mu-lista::-webkit-scrollbar { width: 5px; }
        .mu-lista::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
        .mu-caja p, .mu-caja span { color: ${INK1}; }
      `}</style>
    </section>
  );
}
