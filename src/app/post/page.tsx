/**
 * Todas las noticias publicadas. Pública: se puede compartir sin sesión.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Newspaper, ArrowLeft } from "lucide-react";
import { fechaLarga } from "@/lib/posts";

const COURT = "#2ee6c1";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Noticias",
  description: "Novedades, guías y anuncios de FaceBinder: sets nuevos, cambios en el market y todo lo que pasa en la comunidad.",
  alternates: { canonical: "/post" },
};

export default async function NoticiasPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: posts } = await supabase
    .from("admin_posts")
    .select("id, slug, title, excerpt, cover_url, published_at, created_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const lista = posts ?? [];

  return (
    <div className="news-page">
      <style>{`
        .news-page { min-height: 100vh; background: ${BG0}; padding: 40px 24px 90px; }
        .news-wrap { max-width: 1400px; }
        .news-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        @media (max-width: 1240px) { .news-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 767px), (pointer: coarse) {
          .news-page { padding: 28px 16px 90px; }
          .news-grid { grid-template-columns: minmax(0, 1fr); gap: 12px; }
        }
        .news-card { display: flex; flex-direction: column; border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02);
          overflow: hidden; text-decoration: none; transition: border-color 140ms; }
        .news-card:hover { border-color: ${COURT}55; }
      `}</style>

      <div className="news-wrap">
        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
          fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
          color: INK2, marginBottom: 22,
        }}>
          <ArrowLeft size={13} /> Volver
        </Link>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
            FaceBinder
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0 }}>
            Noticias
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: "8px 0 0" }}>
            Sets nuevos, novedades del market y todo lo que pasa en la comunidad
          </p>
        </div>

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
          <div className="news-grid">
            {lista.map((p) => (
              <Link key={p.id} href={`/post/${p.slug}`} className="news-card">
                {p.cover_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.cover_url} alt="" loading="lazy" decoding="async"
                       style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover" }} />
                )}
                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: COURT, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    {fechaLarga(p.published_at ?? p.created_at)}
                  </span>
                  <h2 style={{ fontFamily: DISP, fontSize: 18, color: INK0, margin: 0, lineHeight: 1.3 }}>
                    {p.title}
                  </h2>
                  {p.excerpt && (
                    <p style={{
                      fontFamily: MONO, fontSize: 11.5, color: INK2, margin: 0, lineHeight: 1.65,
                      display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {p.excerpt}
                    </p>
                  )}
                  <span style={{ marginTop: "auto", paddingTop: 8, fontFamily: MONO, fontSize: 11, color: COURT }}>
                    Leer →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
