/**
 * La noticia con dirección propia: facebinder.com/post/<slug>.
 *
 * Se dibuja en el servidor para que WhatsApp y los buscadores vean el título,
 * la bajada y la portada sin ejecutar nada. Es pública: quien llega desde la
 * notificación no necesita estar logueado.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Clock, CalendarDays, Newspaper } from "lucide-react";
import { fechaLarga, minutosDeLectura, nombreAutor, extractoAuto, soloTexto, etiquetaCategoria, type PostAuthor } from "@/lib/posts";
import { PostBody } from "@/components/PostBody";
import { Comentarios } from "@/components/post/Comentarios";
import { FlechasSlider } from "@/components/post/FlechasSlider";
import { Encuesta, type EncuestaDatos } from "@/components/post/Encuesta";
import { SITIO, EDITOR, migas, DatosJson } from "@/lib/seo";

const COURT = "#2ee6c1";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

/** Una noticia nueva puede tardar hasta un minuto en aparecer. */
export const revalidate = 60;

function publico() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function traerPost(slug: string) {
  const { data: post } = await publico()
    .from("admin_posts")
    .select("id, slug, title, excerpt, cover_url, content_html, content, media_url, category, status, published_at, created_at, updated_at, user_id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) return null;

  const { data: autor } = post.user_id
    ? await publico().from("players").select("username, first_name, last_name, photo_url").eq("user_id", post.user_id).maybeSingle()
    : { data: null };

  // La encuesta es opcional: la mayoría de las notas no tiene.
  const { data: encuesta } = await publico()
    .from("post_polls")
    .select("id, question, closes_at, post_poll_options(id, label, orden)")
    .eq("post_id", post.id)
    .maybeSingle();

  const datosEncuesta: EncuestaDatos | null = encuesta
    ? {
        id: encuesta.id,
        question: encuesta.question,
        closes_at: encuesta.closes_at,
        opciones: [...(encuesta.post_poll_options ?? [])]
          .sort((a, b) => a.orden - b.orden)
          .map((o) => ({ id: o.id, label: o.label })),
      }
    : null;

  return { post, autor: (autor ?? null) as PostAuthor | null, encuesta: datosEncuesta };
}

interface Relacionada {
  id: string;
  slug: string | null;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  category: string | null;
  published_at: string | null;
  created_at: string;
}

/**
 * Las tres que se muestran al final.
 *
 * Primero las de la misma sección, que es lo que de verdad interesa a quien
 * acaba de leer; si no alcanzan, se completa con las más recientes. Sin ese
 * relleno, una nota de una sección con una sola publicación no mostraría nada.
 */
async function traerRelacionadas(post: { id: string; category: string | null }): Promise<Relacionada[]> {
  const campos = "id, slug, title, excerpt, cover_url, category, published_at, created_at";

  const { data: mismas } = await publico()
    .from("admin_posts").select(campos)
    .eq("status", "published")
    .eq("category", post.category ?? "novedades")
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(3);

  const elegidas = (mismas ?? []) as Relacionada[];
  if (elegidas.length >= 3) return elegidas;

  const { data: otras } = await publico()
    .from("admin_posts").select(campos)
    .eq("status", "published")
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(6);

  const vistas = new Set(elegidas.map((n) => n.id));
  for (const n of (otras ?? []) as Relacionada[]) {
    if (elegidas.length === 3) break;
    if (!vistas.has(n.id)) { elegidas.push(n); vistas.add(n.id); }
  }
  return elegidas;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resultado = await traerPost(slug);

  if (!resultado) {
    return { title: "Publicación no encontrada · FaceBinder" };
  }

  const { post } = resultado;
  const title = post.title;
  const description = post.excerpt?.trim() || extractoAuto(post.content_html ?? post.content ?? "", 155);
  const imagen = post.cover_url ?? post.media_url ?? "/og-brand.png";

  return {
    title,
    description,
    alternates: { canonical: `/post/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      siteName: "FaceBinder",
      locale: "es_CO",
      url: `https://facebinder.com/post/${post.slug}`,
      publishedTime: post.published_at ?? post.created_at,
      modifiedTime: post.updated_at ?? post.published_at ?? post.created_at,
      section: etiquetaCategoria(post.category),
      authors: [nombreAutor(resultado.autor)],
      images: [{ url: imagen, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imagen] },
  };
}

/** Foto + nombre del autor, enlazados a su perfil. */
function FirmaAutor({ autor }: { autor: PostAuthor | null }) {
  const contenido = (
    <>
      {autor?.photo_url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={autor.photo_url} alt="" loading="lazy" decoding="async" className="pd-avatar" />
      ) : (
        <span className="pd-avatar pd-avatar-letra">
          {nombreAutor(autor).charAt(0).toUpperCase()}
        </span>
      )}
      <span style={{ color: INK0, fontSize: 12 }}>{nombreAutor(autor)}</span>
    </>
  );

  const estilo: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 9, textDecoration: "none",
  };

  return autor?.username
    ? <Link href={`/${autor.username}`} className="pd-firma" style={estilo}>{contenido}</Link>
    : <span style={estilo}>{contenido}</span>;
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resultado = await traerPost(slug);
  if (!resultado) notFound();

  const { post, autor, encuesta } = resultado;
  const relacionadas = await traerRelacionadas(post);
  const cuerpo = post.content_html ?? post.content ?? "";
  const portada = post.cover_url ?? post.media_url;
  const fecha = post.published_at ?? post.created_at;

  /* Lo que Google lee para entender que esto es una noticia y no una página
     cualquiera: quién la firma, cuándo salió y qué medio la publica. */
  const datosNota = [
    {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      mainEntityOfPage: { "@type": "WebPage", "@id": `${SITIO}/post/${post.slug}` },
      headline: post.title.slice(0, 110),
      description: post.excerpt?.trim() || extractoAuto(cuerpo, 155),
      image: portada ? [portada] : [`${SITIO}/og-image.png`],
      datePublished: fecha,
      dateModified: post.updated_at ?? fecha,
      inLanguage: "es-CO",
      articleSection: etiquetaCategoria(post.category),
      wordCount: soloTexto(cuerpo).split(/\s+/).filter(Boolean).length,
      author: autor?.username
        ? { "@type": "Person", name: nombreAutor(autor), url: `${SITIO}/${autor.username}` }
        : { "@type": "Person", name: nombreAutor(autor) },
      publisher: EDITOR,
    },
    migas([
      { nombre: "Inicio", url: "" },
      { nombre: "Noticias", url: "/post" },
      { nombre: post.title, url: `/post/${post.slug}` },
    ]),
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG0, padding: "40px 24px 90px" }}>
      <DatosJson datos={datosNota} />
      <article style={{ maxWidth: 760, margin: "0 auto" }}>
        <style>{`
          .pd-media { position: relative; overflow: hidden; width: 100%; aspect-ratio: 16 / 9;
            border-radius: 14px; border: 1px solid rgba(255,255,255,0.07);
            background: #0a0e18; margin-bottom: 30px; }
          .pd-media-fondo, .pd-media-foto { position: absolute; inset: 0;
            width: 100%; height: 100%; display: block; }
          .pd-media-fondo { object-fit: cover; filter: blur(26px) saturate(1.35) brightness(0.7);
            transform: scale(1.25); }
          .pd-media-foto { object-fit: contain; }
          .pd-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover;
            border: 1px solid rgba(255,255,255,0.12); flex-shrink: 0; }
          .pd-avatar-letra { display: flex; align-items: center; justify-content: center;
            background: rgba(46,230,193,0.12); color: ${COURT};
            font-family: ${DISP}; font-size: 13px; font-weight: 700; }

          .pd-firma:hover span { color: ${COURT}; }
          .pd-firma:hover .pd-avatar { border-color: ${COURT}; }

          .pd-girando { animation: pd-giro 900ms linear infinite; }
          @keyframes pd-giro { to { transform: rotate(360deg); } }

          /* Relacionadas: tres tarjetas parejas, dos en tablet, una en celular. */
          .pd-rel { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
          .pd-rel-card { display: flex; flex-direction: column; border-radius: 12px; overflow: hidden;
            text-decoration: none; border: 1px solid rgba(255,255,255,0.07);
            background: rgba(255,255,255,0.02); transition: border-color 140ms; }
          .pd-rel-card:hover { border-color: ${COURT}55; }
          .pd-rel-img { position: relative; width: 100%; aspect-ratio: 16 / 10;
            overflow: hidden; background: #0a0e18; }
          .pd-rel-img img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
          .pd-rel-img .fondo { object-fit: cover; filter: blur(20px) saturate(1.3) brightness(0.7);
            transform: scale(1.25); }
          .pd-rel-img .foto { object-fit: contain; }
          .pd-rel-txt { padding: 12px 13px 14px; display: flex; flex-direction: column; gap: 7px; }
          .pd-rel-cat { font-family: ${MONO}; font-size: 9px; letter-spacing: 0.16em;
            text-transform: uppercase; color: ${COURT}; }
          .pd-rel-tit { font-family: ${DISP}; font-size: 14px; font-weight: 600; color: ${INK0};
            margin: 0; line-height: 1.32;
            display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

          @media (max-width: 1023px) { .pd-rel { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
          @media (max-width: 767px), (pointer: coarse) {
            .pd-media { aspect-ratio: 4 / 3; margin-bottom: 22px; }
            .pd-rel { grid-template-columns: minmax(0, 1fr); }
          }
        `}</style>

        <Link href="/post" style={{
          display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
          fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
          color: INK2, marginBottom: 26,
        }}>
          <ArrowLeft size={13} /> Noticias
        </Link>

        <div style={{
          fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase",
          color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
        }}>
          <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
          {etiquetaCategoria(post.category)}
        </div>

        <h1 style={{
          fontFamily: DISP, fontSize: "clamp(26px, 5vw, 42px)", fontWeight: 700, color: INK0,
          margin: 0, lineHeight: 1.15, letterSpacing: "-0.015em",
        }}>
          {post.title}
        </h1>

        {post.excerpt && (
          <p style={{ fontFamily: MONO, fontSize: 14, lineHeight: 1.7, color: "#c9cfdd", margin: "16px 0 0" }}>
            {post.excerpt}
          </p>
        )}

        <div style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16,
          margin: "20px 0 28px", paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.08)",
          fontFamily: MONO, fontSize: 11, color: INK2,
        }}>
          {/* La firma lleva al perfil del autor. Sin usuario no hay adónde ir,
              así que en ese caso queda como texto. */}
          <FirmaAutor autor={autor} />
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CalendarDays size={12} /> {fechaLarga(fecha)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={12} /> {minutosDeLectura(cuerpo)} min de lectura
          </span>
        </div>

        {portada && (
          /* La misma caja que la portada de /post: la foto entera sobre una
             copia difuminada, para que una carta vertical no estire la nota. */
          <div className="pd-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portada} alt="" aria-hidden fetchPriority="high" decoding="async" className="pd-media-fondo" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portada} alt="" fetchPriority="high" decoding="async" className="pd-media-foto" />
          </div>
        )}

        <PostBody html={cuerpo} />
        <FlechasSlider />

        {encuesta && encuesta.opciones.length > 0 && <Encuesta datos={encuesta} />}

        <div style={{ marginTop: 44, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/post" style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px",
            borderRadius: 9, background: COURT, color: BG0, textDecoration: "none",
            fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
          }}>
            <Newspaper size={14} /> Ver noticias
          </Link>
        </div>

        <Comentarios postId={post.id} />

        {relacionadas.length > 0 && (
          <section style={{ marginTop: 46 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <h2 style={{
                fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.18em",
                textTransform: "uppercase", color: COURT, margin: 0,
              }}>
                Seguí leyendo
              </h2>
              <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.09)" }} />
            </div>

            <div className="pd-rel">
              {relacionadas.map((n) => (
                <Link key={n.id} href={`/post/${n.slug}`} className="pd-rel-card">
                  <div className="pd-rel-img">
                    {n.cover_url && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={n.cover_url} alt="" aria-hidden loading="lazy" decoding="async" className="fondo" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={n.cover_url} alt="" loading="lazy" decoding="async" className="foto" />
                      </>
                    )}
                  </div>
                  <div className="pd-rel-txt">
                    <span className="pd-rel-cat">{etiquetaCategoria(n.category)}</span>
                    <h3 className="pd-rel-tit">{n.title}</h3>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, color: INK2 }}>
                      {fechaLarga(n.published_at ?? n.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </article>
    </div>
  );
}
