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
import { ESTILOS_MURO } from "./estilos";

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";

/* Tres primero, que es lo que entra en pantalla, y de a seis despues. */
const PRIMERAS = 3;
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

    const cuantas = ultima.current === null ? PRIMERAS : DE_A;
    const supabase = createClient();
    let q = supabase
      .from("admin_posts")
      .select("id, slug, title, excerpt, cover_url, category, published_at, created_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(cuantas);

    if (ultima.current) q = q.lt("published_at", ultima.current);

    const { data } = await q;
    const llegaron = (data ?? []) as Nota[];

    if (llegaron.length) {
      ultima.current = llegaron[llegaron.length - 1].published_at
        ?? llegaron[llegaron.length - 1].created_at;
      setNotas((antes) => [...antes, ...llegaron]);
    }
    if (llegaron.length < cuantas) setQuedan(false);
    setPrimera(false);
    pidiendo.current = false;
  }, []);

  /* La primera tanda se pide al montar. Antes la disparaba el observador, pero
     el muro vive al final del panel: esperar a que viera el centinela sumaba la
     hidratacion de toda la pagina antes del primer pedido. */
  useEffect(() => { traer(); }, [traer]);

  /* El observador entra en juego recien con la primera tanda ya pintada. Si se
     montara antes veria el centinela a la vista y pediria la segunda tanda en
     paralelo con la primera, que es justo lo que se quiere evitar. */
  useEffect(() => {
    const centinela = fondo.current;
    if (!centinela || primera) return;
    const ojo = new IntersectionObserver((entradas) => {
      if (entradas[0].isIntersecting) traer();
    }, { rootMargin: "220px" });
    ojo.observe(centinela);
    return () => ojo.disconnect();
  }, [traer, primera]);

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
            <div className="mn-texto">
              <span className="mn-cat">{n.category}</span>
              <p className="mn-tit">{n.title}</p>
              {n.excerpt && <p className="mn-baj">{n.excerpt}</p>}
            </div>
          </Link>
        ))}

        {primera && (
          <>
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

      <style>{ESTILOS_MURO + `
        /* La foto ocupa todo el alto de la fila y el ancho sale de su propia
           proporción; el texto se acomoda con lo que queda. Antes era un
           recorte apaisado fijo que dejaba aire muerto arriba y abajo. */
        .mn-nota { display: flex; align-items: stretch; gap: 12px;
          padding: 0; border-radius: 11px; text-decoration: none; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);
          transition: border-color 0.15s, background 0.15s; flex-shrink: 0;
          min-height: 104px; }
        .mn-nota:hover { border-color: rgba(46,230,193,0.35); background: rgba(255,255,255,0.04); }
        .mn-foto { height: auto; width: auto; align-self: stretch; object-fit: cover;
          /* Entre estos dos anchos: ni una tira finita ni media fila de foto. */
          min-width: 84px; max-width: 128px; flex-shrink: 0; }
        .mn-texto { padding: 11px 12px 11px 0; min-width: 0; align-self: center; }
        .mn-cat { font-family: ${MONO}; font-size: 8.5px; letter-spacing: 0.16em;
          text-transform: uppercase; color: ${COURT}; }
        .mn-tit { font-family: ${DISP}; font-size: 13px; font-weight: 700; color: ${INK0};
          margin: 4px 0 0; line-height: 1.35;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .mn-baj { font-family: ${MONO}; font-size: 10px; color: ${INK2}; margin: 5px 0 0;
          line-height: 1.6;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </section>
  );
}
