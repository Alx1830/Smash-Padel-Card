/**
 * Portada de noticias. Pública: se puede compartir sin sesión.
 *
 * Se arma como un diario: la última nota grande, las cuatro siguientes al
 * costado y después una fila por sección. Las que ya salieron arriba no se
 * repiten abajo, y una sección sin notas propias no se dibuja — con dos o tres
 * publicaciones la portada tiene que verse llena igual.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Newspaper, ArrowLeft } from "lucide-react";
import { fechaLarga, etiquetaCategoria, POST_CATEGORIAS } from "@/lib/posts";

const COURT = "#2ee6c1";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Noticias",
  description: "Novedades, guías y anuncios de FaceBinder: sets nuevos, cambios en el market y todo lo que pasa en la comunidad.",
  alternates: { canonical: "/post" },
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

/** La nota principal: imagen ancha y título grande. */
function Portada({ nota }: { nota: Nota }) {
  return (
    <Link href={`/post/${nota.slug}`} className="np-lead">
      {nota.cover_url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={nota.cover_url} alt="" fetchPriority="high" decoding="async" className="np-lead-img" />
      ) : (
        <div className="np-lead-img np-sinfoto" />
      )}
      <div className="np-lead-txt">
        <Meta nota={nota} size={11} />
        <h2 className="np-lead-tit">{nota.title}</h2>
        {nota.excerpt && <p className="np-lead-baj">{nota.excerpt}</p>}
      </div>
    </Link>
  );
}

/** Las que acompañan a la principal: miniatura al costado y título corto. */
function Fila({ nota }: { nota: Nota }) {
  return (
    <Link href={`/post/${nota.slug}`} className="np-fila">
      {nota.cover_url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={nota.cover_url} alt="" loading="lazy" decoding="async" className="np-fila-img" />
      ) : (
        <div className="np-fila-img np-sinfoto" />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <Meta nota={nota} size={9} />
        <h3 className="np-fila-tit">{nota.title}</h3>
      </div>
    </Link>
  );
}

/** Las de las secciones de abajo. */
function Tarjeta({ nota }: { nota: Nota }) {
  return (
    <Link href={`/post/${nota.slug}`} className="np-card">
      {nota.cover_url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={nota.cover_url} alt="" loading="lazy" decoding="async" className="np-card-img" />
      ) : (
        <div className="np-card-img np-sinfoto" />
      )}
      <div className="np-card-txt">
        <Meta nota={nota} size={9} />
        <h3 className="np-card-tit">{nota.title}</h3>
        {nota.excerpt && <p className="np-card-baj">{nota.excerpt}</p>}
      </div>
    </Link>
  );
}

export default async function NoticiasPage() {
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
  const principal = lista[0];
  const costado   = lista.slice(1, 5);
  const arriba    = new Set(lista.slice(0, 5).map((n) => n.id));

  const secciones = POST_CATEGORIAS
    .map((c) => ({
      ...c,
      notas: lista.filter((n) => (n.category ?? "novedades") === c.id && !arriba.has(n.id)).slice(0, 5),
    }))
    .filter((s) => s.notas.length > 0);

  return (
    <div className="np-page">
      <style>{`
        .np-page { min-height: 100vh; background: ${BG0}; padding: 40px 24px 90px; }
        .np-wrap { max-width: 1400px; }

        .np-sinfoto { background: linear-gradient(135deg, rgba(46,230,193,0.10), rgba(255,255,255,0.03)); }

        /* Bloque de arriba: principal + columna de cuatro */
        .np-hero { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
          gap: 22px; margin-bottom: 46px; }

        .np-lead { display: block; text-decoration: none; border-radius: 16px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02);
          transition: border-color 140ms; }
        .np-lead:hover { border-color: ${COURT}55; }
        .np-lead-img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
        .np-lead-txt { padding: 20px 22px 24px; display: flex; flex-direction: column; gap: 12px; }
        .np-lead-tit { font-family: ${DISP}; font-size: clamp(21px, 2.6vw, 31px); font-weight: 700;
          color: ${INK0}; margin: 0; line-height: 1.22; }
        .np-lead-baj { font-family: ${MONO}; font-size: 12.5px; color: ${INK1}; margin: 0; line-height: 1.7;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

        .np-col { display: flex; flex-direction: column; gap: 14px; }
        .np-fila { display: grid; grid-template-columns: 104px minmax(0, 1fr); gap: 13px;
          text-decoration: none; padding-bottom: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.07); }
        .np-col > .np-fila:last-child { border-bottom: 0; padding-bottom: 0; }
        .np-fila-img { width: 104px; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 10px; display: block; }
        .np-fila-tit { font-family: ${DISP}; font-size: 14.5px; font-weight: 600; color: ${INK0};
          margin: 0; line-height: 1.34;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .np-fila:hover .np-fila-tit { color: ${COURT}; }

        /* Secciones */
        .np-sec { margin-bottom: 42px; }
        .np-sec-cab { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .np-sec-tit { font-family: ${DISP}; font-size: 19px; font-weight: 700; color: ${INK0}; margin: 0; }
        .np-sec-linea { flex: 1; height: 1px; background: rgba(255,255,255,0.09); }

        .np-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
        @media (max-width: 1240px) { .np-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 1023px) { .np-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

        .np-card { display: flex; flex-direction: column; text-decoration: none; border-radius: 13px;
          overflow: hidden; border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.02); transition: border-color 140ms; }
        .np-card:hover { border-color: ${COURT}55; }
        .np-card-img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; display: block; }
        .np-card-txt { padding: 13px 15px 16px; display: flex; flex-direction: column; gap: 9px; flex: 1; }
        .np-card-tit { font-family: ${DISP}; font-size: 15px; font-weight: 600; color: ${INK0};
          margin: 0; line-height: 1.32;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .np-card-baj { font-family: ${MONO}; font-size: 11px; color: ${INK2}; margin: 0; line-height: 1.65;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        @media (max-width: 1023px) {
          .np-hero { grid-template-columns: minmax(0, 1fr); gap: 26px; margin-bottom: 38px; }
        }
        @media (max-width: 767px), (pointer: coarse) {
          .np-page { padding: 28px 16px 90px; }
          .np-grid { grid-template-columns: minmax(0, 1fr); gap: 14px; }
          .np-fila { grid-template-columns: 88px minmax(0, 1fr); }
          .np-fila-img { width: 88px; }
          .np-sec { margin-bottom: 34px; }
        }
      `}</style>

      <div className="np-wrap">
        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
          fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
          color: INK2, marginBottom: 22,
        }}>
          <ArrowLeft size={13} /> Volver
        </Link>

        <div style={{ marginBottom: 30 }}>
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

        {!principal ? (
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
              <Portada nota={principal} />
              {costado.length > 0 && (
                <div className="np-col">
                  {costado.map((n) => <Fila key={n.id} nota={n} />)}
                </div>
              )}
            </div>

            {secciones.map((s) => (
              <section key={s.id} className="np-sec">
                <div className="np-sec-cab">
                  <span style={{ width: 3, height: 17, background: COURT, borderRadius: 2 }} />
                  <h2 className="np-sec-tit">{s.label}</h2>
                  <span className="np-sec-linea" />
                </div>
                <div className="np-grid">
                  {s.notas.map((n) => <Tarjeta key={n.id} nota={n} />)}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
