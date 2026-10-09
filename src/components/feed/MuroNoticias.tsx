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
import { ArrowRight, FileText, Newspaper } from "lucide-react";
import { etiquetaCategoria } from "@/lib/posts";
import { ESTILOS_MURO } from "./estilos";

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";

/* Cada categoría con su color, para ubicarse en la lista sin leer. */
const COLOR_CATEGORIA: Record<string, string> = {
  novedades: "#b98cff",
  sets:      "#d6ff3d",
  market:    "#ffb547",
  guias:     "#6aa8ff",
  torneos:   COURT,
  comunidad: "#ff7ab6",
};

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** "8 Oct 2026", en hora de Colombia. */
function fecha(iso: string) {
  const [a, m, d] = new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Bogota" }).split("-");
  return `${parseInt(d, 10)} ${MESES[parseInt(m, 10) - 1]} ${a}`;
}

/* Cinco primero, que es lo que entra en la columna, y de a seis despues. */
const PRIMERAS = 5;
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
        <FileText size={18} color={COURT} strokeWidth={1.6} />
        <h2 className="mu-titulo mn-titulo">Noticias TCG</h2>
        <Link href="/noticias" className="mn-vertodas">Ver todas <ArrowRight size={12} aria-hidden /></Link>
      </header>

      <div className="mu-lista">
        {notas.map((n) => (
          <Link key={n.id} href={`/noticias/${n.slug}`} className="mn-nota">
            {n.cover_url
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={n.cover_url} alt="" loading="lazy" decoding="async" className="mn-foto" />
              : <span className="mn-foto mn-sinfoto"><Newspaper size={20} color={INK2} /></span>}
            <div className="mn-texto">
              <div className="mn-linea">
                <span className="mn-cat" style={{ color: COLOR_CATEGORIA[n.category] ?? COURT }}>
                  {etiquetaCategoria(n.category)}
                </span>
                <time className="mn-fecha" dateTime={n.published_at ?? n.created_at}>
                  {fecha(n.published_at ?? n.created_at)}
                </time>
              </div>
              <p className="mn-tit">{n.title}</p>
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
        .mn-titulo { font-size: 10px; letter-spacing: 0.2em; }
        .mn-vertodas { margin-left: auto; flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px;
          font-family: ${MONO}; font-size: 11px; color: ${COURT}; text-decoration: none;
          border: 1px solid ${COURT}44; border-radius: 8px; padding: 6px 12px; transition: background 0.15s; }
        .mn-vertodas:hover { background: ${COURT}14; }

        .mn-nota { display: flex; align-items: center; gap: 12px; padding: 6px;
          border-radius: 11px; text-decoration: none; flex-shrink: 0;
          border: 1px solid transparent; transition: border-color 0.15s, background 0.15s; }
        .mn-nota:hover { border-color: rgba(46,230,193,0.25); background: rgba(255,255,255,0.03); }
        .mn-foto { width: 96px; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 8px;
          flex-shrink: 0; background: rgba(255,255,255,0.05); }
        .mn-sinfoto { display: flex; align-items: center; justify-content: center; }
        .mn-texto { min-width: 0; flex: 1; }
        .mn-linea { display: flex; align-items: baseline; gap: 8px; }
        .mn-cat { font-family: ${MONO}; font-size: 9px; letter-spacing: 0.16em;
          text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mu-caja .mn-fecha { margin-left: auto; font-family: ${MONO}; font-size: 9px; color: ${INK2};
          white-space: nowrap; flex-shrink: 0; }
        .mu-caja .mn-tit { font-family: ${DISP}; font-size: 13px; font-weight: 700; color: ${INK0};
          margin: 5px 0 0; line-height: 1.35;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </section>
  );
}
