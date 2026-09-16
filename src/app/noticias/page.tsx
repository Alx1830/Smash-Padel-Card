/**
 * Portada de noticias. Pública: se puede compartir sin sesión.
 *
 * Arriba, las cinco del momento en un carrusel que gira solo. Debajo, todas las
 * demás en una sola lista, de la más nueva a la más vieja, con la columna de
 * categorías al costado para quedarse con una sola.
 *
 * Las cinco de arriba no se repiten en la lista mientras no haya filtro puesto;
 * al elegir una categoría sí aparecen, porque ahí lo que se espera es la lista
 * completa de esa categoría y no el resto de la portada.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Newspaper, ArrowLeft } from "lucide-react";
import { fechaLarga, etiquetaCategoria, POST_CATEGORIAS, CATEGORIA_POR_DEFECTO } from "@/lib/posts";
import { SliderPortada } from "@/components/post/SliderPortada";
import { MediaNota } from "@/components/post/MediaNota";
import { MobileTabBar } from "@/components/MobileTabBar";
import { PieGrande } from "@/components/PieGrande";
import { SITIO, EDITOR, migas, DatosJson } from "@/lib/seo";

const COURT = "#2ee6c1";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Noticias de Pokémon TCG — sets, rotaciones y torneos",
  description:
    "Novedades de Pokémon TCG en español: sets que salen, rotación de formato, resultados de torneos, precios y lo que pasa en la comunidad colombiana de coleccionistas.",
  alternates: {
    canonical: "/noticias",
    /* El feed deja que Google y los lectores de noticias se enteren de una
       nota nueva sin esperar a que pase el rastreador por la portada. */
    types: { "application/rss+xml": [{ url: "/noticias/feed.xml", title: "Noticias de FaceBinder" }] },
  },
  keywords: [
    "noticias Pokémon TCG", "sets nuevos Pokémon", "rotación Pokémon TCG",
    "torneos Pokémon Colombia", "cartas Pokémon novedades", "Pokémon TCG español",
  ],
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "FaceBinder",
    url: "https://facebinder.com/post",
    title: "Noticias de Pokémon TCG — sets, rotaciones y torneos",
    description:
      "Novedades de Pokémon TCG en español: sets que salen, rotación de formato, torneos y precios.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Noticias de Pokémon TCG en FaceBinder" }],
  },
};

interface Nota {
  id: string;
  slug: string | null;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  category: string | null;
  published_at: string | null;
  created_at: string;
}

const cuando = (n: Nota) => n.published_at ?? n.created_at;

/** Categoría + fecha, la línea que encabeza cada tarjeta. */
function Meta({ nota, size = 10 }: { nota: Nota; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
      <span style={{
        fontFamily: MONO, fontSize: size, letterSpacing: "0.14em", textTransform: "uppercase",
        color: "#05070d", background: COURT, padding: "3px 8px", borderRadius: 4, fontWeight: 700,
      }}>
        {etiquetaCategoria(nota.category)}
      </span>
      <span style={{ fontFamily: MONO, fontSize: size, letterSpacing: "0.1em", color: INK2 }}>
        {fechaLarga(cuando(nota))}
      </span>
    </div>
  );
}

/** Una nota de la lista: miniatura al costado y título corto. */
function Fila({ nota }: { nota: Nota }) {
  return (
    <Link href={`/noticias/${nota.slug}`} className="np-fila">
      <MediaNota src={nota.cover_url} clase="np-fila-img" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <Meta nota={nota} size={9} />
        <h3 className="np-fila-tit">{nota.title}</h3>
        {nota.excerpt && <p className="np-fila-baj">{nota.excerpt}</p>}
      </div>
    </Link>
  );
}

export default async function NoticiasPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  /* Una categoría inventada en la dirección no filtra nada: se ignora y se
     muestra la portada entera, que es menos desconcertante que una lista vacía. */
  const filtro = POST_CATEGORIAS.find((c) => c.id === cat)?.id ?? null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("admin_posts")
    .select("id, slug, title, excerpt, cover_url, category, published_at, created_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const lista: Nota[] = data ?? [];
  const deLaCasa = (n: Nota) => n.category ?? CATEGORIA_POR_DEFECTO;

  /* Arriba van nueve: las cinco que giran solas en el carrusel y las cuatro
     que las acompañan al costado. Son siempre las últimas nueve, con filtro o
     sin él — es la portada del sitio, no el encabezado de una categoría. */
  const destacadas = lista.slice(0, 5);
  const costado    = lista.slice(5, 9);
  /* La lista de abajo arranca en la sexta, así que las cuatro del costado
     vuelven a aparecer ahí. Es a propósito: son un adelanto de lo que sigue,
     como la columna de un diario, y sin ellas la lista queda en nada cuando hay
     nueve o diez notas publicadas. */
  const arriba     = new Set(destacadas.map((n) => n.id));

  const resto = filtro
    ? lista.filter((n) => deLaCasa(n) === filtro)
    : lista.filter((n) => !arriba.has(n.id));

  /* El número al lado de cada categoría. Se cuenta sobre todo lo publicado,
     incluidas las cinco de arriba, porque es lo que se ve al entrar en una. */
  const cuentas = new Map<string, number>(POST_CATEGORIAS.map((c) => [c.id, 0]));
  for (const n of lista) {
    const id = deLaCasa(n);
    cuentas.set(id, (cuentas.get(id) ?? 0) + 1);
  }

  /* La portada le dice a Google, en orden, cuáles son las notas del momento.
     Sin esto cada noticia se descubre sola y tarda mucho más en indexarse. */
  const datosPortada = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Noticias de Pokémon TCG",
      description:
        "Novedades, guías y anuncios de Pokémon TCG: sets nuevos, rotaciones, torneos y lo que pasa en la comunidad colombiana.",
      url: `${SITIO}/noticias`,
      inLanguage: "es-CO",
      isPartOf: { "@type": "WebSite", name: "FaceBinder", url: SITIO },
      publisher: EDITOR,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: lista.slice(0, 30).map((n, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITIO}/noticias/${n.slug}`,
          name: n.title,
        })),
      },
    },
    migas([
      { nombre: "Inicio", url: "" },
      { nombre: "Noticias", url: "/noticias" },
    ]),
  ];

  return (
    <div className="np-page">
      <DatosJson datos={datosPortada} />
      <style>{`
        .np-page { min-height: 100vh; background: ${BG0}; padding: 40px 24px 0; }
        /* El 80% de los 1400px que medía antes: a lo ancho del todo, las filas
           de abajo quedaban con líneas larguísimas y cansaban de leer. */
        .np-wrap { max-width: 1120px; margin: 0 auto; }

        .np-sinfoto { background: linear-gradient(135deg, rgba(46,230,193,0.10), rgba(255,255,255,0.03)); }

        /* Caja de foto: la imagen entera sobre su propia copia difuminada.
           El blur vive acá adentro y no envuelve a ninguna barra fija. */
        .np-media { position: relative; overflow: hidden; background: #0a0e18; }
        .np-media-fondo, .np-media-foto { position: absolute; inset: 0;
          width: 100%; height: 100%; display: block; }
        .np-media-fondo { object-fit: cover; filter: blur(26px) saturate(1.35) brightness(0.7);
          transform: scale(1.25); }
        .np-media-foto { object-fit: contain; }

        /* Bloque de arriba: el carrusel grande + la columna de cuatro */
        .np-hero { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
          gap: 22px; margin-bottom: 46px; }

        .np-col { display: flex; flex-direction: column; gap: 12px; }
        .np-col > .np-fila { flex: 1 1 0; align-items: start; }
        .np-fila { display: grid; grid-template-columns: 104px minmax(0, 1fr); gap: 13px;
          text-decoration: none; padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.07); }
        .np-col > .np-fila:last-child { border-bottom: 0; padding-bottom: 0; }
        .np-fila-img { width: 104px; aspect-ratio: 4 / 3; border-radius: 10px; }
        .np-fila-tit { font-family: ${DISP}; font-size: 14.5px; font-weight: 600; color: ${INK0};
          margin: 0; line-height: 1.34;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .np-fila-baj { font-family: ${MONO}; font-size: 10.5px; color: ${INK2}; margin: 0; line-height: 1.6;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .np-fila:hover .np-fila-tit { color: ${COURT}; }

        /* ---------- El carrusel de arriba ----------
           Las cinco están puestas una encima de otra y lo que cambia es cuál se
           ve. La primera es la que va en el flujo y le da el alto a la caja; el
           resto va encima, en el mismo lugar. */
        .np-slider { position: relative; border-radius: 16px;
          overflow: hidden; border: 1px solid rgba(255,255,255,0.07); background: #0a0e18; }
        .np-slide { display: block; text-decoration: none; }
        .np-slide:not(:first-child) { position: absolute; inset: 0; }
        /* La que se va se apaga rápido y la que entra espera a que termine:
           cruzándose se leían los dos titulares uno encima del otro. */
        .np-slide { opacity: 0; pointer-events: none; transition: opacity 170ms ease; }
        .np-slide[data-visible] { opacity: 1; pointer-events: auto; z-index: 1;
          transition: opacity 300ms ease 150ms; }
        .np-slide-img { width: 100%; aspect-ratio: 16 / 9; max-height: 400px; }
        .np-slide-velo { position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(to top,
            rgba(5,7,13,0.96) 0%, rgba(5,7,13,0.86) 34%,
            rgba(5,7,13,0.36) 66%, rgba(5,7,13,0.06) 100%); }
        .np-slide-txt { position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
          padding: 22px 26px 46px; display: flex; flex-direction: column; gap: 11px;
          max-width: 860px; }
        .np-slide-meta { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
        .np-slide-cat { font-family: ${MONO}; font-size: 11px; letter-spacing: 0.14em;
          text-transform: uppercase; color: #05070d; background: ${COURT};
          padding: 3px 8px; border-radius: 4px; font-weight: 700; }
        .np-slide-fecha { font-family: ${MONO}; font-size: 11px; letter-spacing: 0.1em; color: ${INK2}; }
        .np-slide-tit { font-family: ${DISP}; font-size: clamp(20px, 2.4vw, 30px); font-weight: 700;
          color: ${INK0}; margin: 0; line-height: 1.2;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .np-slide-baj { font-family: ${MONO}; font-size: 12.5px; color: ${INK1}; margin: 0; line-height: 1.7;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .np-slide:hover .np-slide-tit { color: ${COURT}; }

        .np-slider-flecha { position: absolute; top: 50%; transform: translateY(-50%); z-index: 3;
          width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
          background: rgba(5,7,13,0.78); border: 1px solid rgba(255,255,255,0.14);
          color: ${INK0}; cursor: pointer; transition: border-color 140ms, background 140ms; }
        .np-slider-flecha:hover { border-color: ${COURT}; background: #05070d; }
        .np-slider-flecha.izq { left: 12px; }
        .np-slider-flecha.der { right: 12px; }

        .np-slider-puntos { position: absolute; left: 0; right: 0; bottom: 16px; z-index: 3;
          display: flex; justify-content: center; gap: 7px; }
        .np-slider-punto { width: 24px; height: 4px; border-radius: 2px; border: 0; padding: 0;
          background: rgba(255,255,255,0.26); cursor: pointer; transition: background 200ms, width 200ms; }
        .np-slider-punto[data-visible] { background: ${COURT}; width: 34px; }

        /* ---------- Abajo: la lista y la columna de secciones ----------
           La columna va en 280px fijos y la lista se queda con el resto. */
        .np-abajo { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 34px;
          align-items: start; }
        .np-lista { min-width: 0; }
        .np-lado { position: sticky; top: 24px; display: flex; flex-direction: column; gap: 26px; }
        .np-sec-cab { border-top: 2px solid ${COURT}; padding-top: 11px; margin-bottom: 14px; }
        .np-sec-tit { font-family: ${DISP}; font-size: 15px; font-weight: 700; color: ${COURT};
          margin: 0; letter-spacing: 0.14em; text-transform: uppercase; }
        .np-vacio { font-family: ${MONO}; font-size: 12px; color: ${INK2}; margin: 0; padding: 22px 0; }

        .np-cats { display: flex; flex-direction: column; gap: 2px; }
        .np-cat { display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 10px 13px; border-radius: 9px; text-decoration: none;
          font-family: ${MONO}; font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase;
          color: ${INK1}; border: 1px solid transparent; transition: background 140ms, color 140ms; }
        .np-cat:hover { background: rgba(255,255,255,0.04); color: ${INK0}; }
        .np-cat[data-elegida] { background: rgba(46,230,193,0.12); border-color: ${COURT}44; color: ${COURT}; }
        .np-cat[data-vacia] { color: ${INK2}; }
        .np-cat-num { font-size: 10px; letter-spacing: 0.08em; color: ${INK2}; }
        .np-cat[data-elegida] .np-cat-num { color: ${COURT}; }

        .np-sec-lista { display: flex; flex-direction: column; gap: 12px; }
        .np-sec-lista > .np-fila:last-child { border-bottom: 0; padding-bottom: 0; }

        @media (max-width: 1023px) {
          /* La columna baja abajo del todo y las secciones se acuestan en una
             fila que se desliza: de pie ocupaban media pantalla en blanco. */
          .np-hero { grid-template-columns: minmax(0, 1fr); gap: 26px; margin-bottom: 38px; }
          .np-abajo { grid-template-columns: minmax(0, 1fr); gap: 30px; }
          .np-lado { position: static; }
          .np-cats { flex-direction: row; flex-wrap: wrap; }
          .np-cat { border: 1px solid rgba(255,255,255,0.09); border-radius: 999px; padding: 8px 14px; }
          .np-slide-img { aspect-ratio: 16 / 9; }
        }
        @media (max-width: 767px), (pointer: coarse) {
          .np-page { padding: 28px 16px 0; }
          .np-slide-img { aspect-ratio: 4 / 3; max-height: none; }
          .np-slide-txt { padding: 16px 16px 40px; }
          .np-col > .np-fila { flex: 0 0 auto; }
          .np-slide-baj { display: none; }
          .np-slider-flecha { display: none; }
          .np-fila { grid-template-columns: 88px minmax(0, 1fr); }
          .np-fila-img { width: 88px; }
          .np-fila-baj { display: none; }
          .np-fila-tit { -webkit-line-clamp: 3; }
        }
      `}</style>

      <div className="np-wrap">
        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
          fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
          color: INK2, marginBottom: 30,
        }}>
          <ArrowLeft size={13} /> Volver
        </Link>

        {lista.length === 0 ? (
          <div style={{
            border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 14, padding: "44px 24px",
            textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <Newspaper size={26} color={INK2} />
            <p style={{ fontFamily: MONO, fontSize: 12, color: INK2, margin: 0 }}>
              Todavía no hay noticias publicadas. Volvé pronto.
            </p>
          </div>
        ) : (
          <>
            <div className="np-hero">
              <SliderPortada notas={destacadas} />
              {costado.length > 0 && (
                <div className="np-col">
                  {costado.map((n) => <Fila key={n.id} nota={n} />)}
                </div>
              )}
            </div>

            <div className="np-abajo">
              <section className="np-lista">
                <div className="np-sec-cab">
                  <h2 className="np-sec-tit">
                    {filtro ? etiquetaCategoria(filtro) : "Todas las noticias"}
                  </h2>
                </div>

                {resto.length === 0 ? (
                  <p className="np-vacio">
                    {filtro
                      ? "Todavía no hay notas en esta sección."
                      : "Por ahora están todas arriba."}
                  </p>
                ) : (
                  <div className="np-sec-lista">
                    {resto.map((n) => <Fila key={n.id} nota={n} />)}
                  </div>
                )}
              </section>

              <aside className="np-lado">
                <div className="np-sec-cab">
                  <h2 className="np-sec-tit">Secciones</h2>
                </div>
                <nav className="np-cats">
                  {/* Sin `cat` en la dirección se vuelve a la portada entera, así
                      que "Todas" es un enlace a la misma página sin el filtro. */}
                  <Link href="/noticias" className="np-cat" data-elegida={filtro ? undefined : ""}>
                    <span>Todas</span>
                    <span className="np-cat-num">{lista.length}</span>
                  </Link>
                  {POST_CATEGORIAS.map((c) => (
                    <Link
                      key={c.id}
                      href={`/noticias?cat=${c.id}`}
                      className="np-cat"
                      data-elegida={filtro === c.id ? "" : undefined}
                      /* Una sección sin nada se deja ver igual, apagada: la lista
                         de secciones del sitio es siempre la misma y que aparezcan
                         y desaparezcan solas confunde más de lo que ayuda. */
                      data-vacia={cuentas.get(c.id) ? undefined : ""}
                    >
                      <span>{c.label}</span>
                      <span className="np-cat-num">{cuentas.get(c.id) ?? 0}</span>
                    </Link>
                  ))}
                </nav>
              </aside>
            </div>
          </>
        )}
      </div>

      <PieGrande palabra="NOTICIAS" />

      <MobileTabBar />
    </div>
  );
}
