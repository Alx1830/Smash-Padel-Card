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
import { ArrowLeft, Clock, CalendarDays } from "lucide-react";
import { fechaLarga, minutosDeLectura, nombreAutor, extractoAuto, type PostAuthor } from "@/lib/posts";
import { PostBody } from "@/components/PostBody";

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
    .select("id, slug, title, excerpt, cover_url, content_html, content, media_url, status, published_at, created_at, user_id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) return null;

  const { data: autor } = post.user_id
    ? await publico().from("players").select("username, first_name, last_name, photo_url").eq("user_id", post.user_id).maybeSingle()
    : { data: null };

  return { post, autor: (autor ?? null) as PostAuthor | null };
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
      url: `https://facebinder.com/post/${post.slug}`,
      publishedTime: post.published_at ?? post.created_at,
      images: [{ url: imagen, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imagen] },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resultado = await traerPost(slug);
  if (!resultado) notFound();

  const { post, autor } = resultado;
  const cuerpo = post.content_html ?? post.content ?? "";
  const portada = post.cover_url ?? post.media_url;
  const fecha = post.published_at ?? post.created_at;

  return (
    <div style={{ minHeight: "100vh", background: BG0, padding: "40px 24px 90px" }}>
      <article style={{ maxWidth: 760, margin: "0 auto" }}>

        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
          fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
          color: INK2, marginBottom: 26,
        }}>
          <ArrowLeft size={13} /> Volver
        </Link>

        <div style={{
          fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase",
          color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
        }}>
          <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
          Noticias
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
          <span>Por {nombreAutor(autor)}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CalendarDays size={12} /> {fechaLarga(fecha)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={12} /> {minutosDeLectura(cuerpo)} min de lectura
          </span>
        </div>

        {portada && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={portada} alt="" loading="eager" decoding="async"
               style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)", marginBottom: 30 }} />
        )}

        <PostBody html={cuerpo} />

        <div style={{ marginTop: 44, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px",
            borderRadius: 9, background: COURT, color: BG0, textDecoration: "none",
            fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
          }}>
            Ir a FaceBinder
          </Link>
        </div>
      </article>
    </div>
  );
}
