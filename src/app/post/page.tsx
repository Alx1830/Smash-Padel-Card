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
import { EspacioPublicitario } from "@/components/post/EspacioPublicitario";

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

/**
 * La foto de una nota, en una caja de proporción fija.
 *
 * Las portadas no vienen todas iguales: una foto apaisada de un torneo y el
 * escaneo vertical de una carta conviven en la misma grilla. Recortar a lo
 * ancho le corta la cabeza a la carta, así que la imagen va entera (`contain`)
 * sobre una copia de sí misma difuminada, que rellena el borde con su propio
 * color. Ninguna portada queda con franjas negras ni recortada.
 */
function Media({ src, clase, prioritaria = false }: { src: string | null; clase: string; prioritaria?: boolean }) {
  if (!src) return <div className={`${clase} np-sinfoto`} />;
  const carga = prioritaria
    ? { fetchPriority: "high" as const }
    : { loading: "lazy" as const };
  return (
    <div className={`${clase} np-media`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden decoding="async" {...carga} className="np-media-fondo" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" decoding="async" {...carga} className="np-media-foto" />
    </div>
  );
}

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
      <Media src={nota.cover_url} clase="np-lead-img" prioritaria />
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
      <Media src={nota.cover_url} clase="np-fila-img" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <Meta nota={nota} size={9} />
        <h3 className="np-fila-tit">{nota.title}</h3>
        {nota.excerpt && <p className="np-fila-baj">{nota.excerpt}</p>}
      </div>
    </Link>
  );
}

/**
 * La nota que abre una sección: foto grande con el título escrito encima.
 *
 * El degradado no es decoración — es lo que garantiza que el titular se lea
 * sobre una foto clara. Sin él hay portadas donde el texto desaparece.
 */
function Destacada({ nota }: { nota: Nota }) {
  return (
    <Link href={`/post/${nota.slug}`} className="np-dest">
      <Media src={nota.cover_url} clase="np-dest-img" />
      <span className="np-dest-velo" />
      <div className="np-dest-txt">
        <Meta nota={nota} size={9} />
        <h3 className="np-dest-tit">{nota.title}</h3>
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
        .np-wrap { max-width: 1400px; margin: 0 auto; }

        .np-sinfoto { background: linear-gradient(135deg, rgba(46,230,193,0.10), rgba(255,255,255,0.03)); }

        /* Caja de foto: la imagen entera sobre su propia copia difuminada.
           El blur vive acá adentro y no envuelve a ninguna barra fija. */
        .np-media { position: relative; overflow: hidden; background: #0a0e18; }
        .np-media-fondo, .np-media-foto { position: absolute; inset: 0;
          width: 100%; height: 100%; display: block; }
        .np-media-fondo { object-fit: cover; filter: blur(26px) saturate(1.35) brightness(0.7);
          transform: scale(1.25); }
        .np-media-foto { object-fit: contain; }

        /* Bloque de arriba: principal + columna de cuatro */
        .np-hero { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
          gap: 22px; margin-bottom: 46px; }

        .np-lead { display: block; text-decoration: none; border-radius: 16px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02);
          transition: border-color 140ms; }
        .np-lead:hover { border-color: ${COURT}55; }
        .np-lead-img { width: 100%; aspect-ratio: 16 / 9; max-height: 400px; }
        .np-lead-txt { padding: 20px 22px 24px; display: flex; flex-direction: column; gap: 12px; }
        .np-lead-tit { font-family: ${DISP}; font-size: clamp(21px, 2.6vw, 31px); font-weight: 700;
          color: ${INK0}; margin: 0; line-height: 1.22; }
        .np-lead-baj { font-family: ${MONO}; font-size: 12.5px; color: ${INK1}; margin: 0; line-height: 1.7;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

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

        /* ---------- Secciones ----------
           Van de a dos columnas, como los bloques de un diario: cada una abre
           con una nota grande y sigue con el resto en lista. La raya de arriba
           marca dónde empieza cada bloque. */
        /* Abajo van tres columnas: dos de secciones y una de publicidad. */
        /* La segunda columna se mide por su contenido, no en 300px fijos: cuando el aviso no se
           dibuja —que es lo que ve cualquiera que no sea admin— la columna
           mide cero y las secciones ocupan todo el ancho. */
        .np-abajo { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 30px;
          align-items: start; }
        .np-abajo:not(:has(.np-ads)) { grid-template-columns: minmax(0, 1fr); gap: 0; }
        .np-secs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 40px 30px; min-width: 0; }

        /* El aviso queda a la vista mientras se recorren las secciones. */
        .np-ads { position: sticky; top: 20px; }
        .np-ad { width: 300px; height: 250px; border-radius: 13px;
          border: 1px dashed rgba(255,255,255,0.15); background: rgba(255,255,255,0.02);
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; }
        .np-ad-tit { font-family: ${MONO}; font-size: 11px; letter-spacing: 0.14em;
          text-transform: uppercase; color: ${INK2}; }
        .np-ad-med { font-family: ${MONO}; font-size: 10px; color: rgba(122,130,152,0.7); }
        .np-sec { min-width: 0; }
        .np-sec-cab { border-top: 2px solid ${COURT}; padding-top: 11px; margin-bottom: 14px; }
        .np-sec-tit { font-family: ${DISP}; font-size: 15px; font-weight: 700; color: ${COURT};
          margin: 0; letter-spacing: 0.14em; text-transform: uppercase; }

        .np-dest { position: relative; display: block; overflow: hidden; border-radius: 13px;
          text-decoration: none; border: 1px solid rgba(255,255,255,0.07); }
        .np-dest-img { width: 100%; aspect-ratio: 16 / 9; max-height: 260px; }
        .np-dest-velo { position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(to top,
            rgba(5,7,13,0.95) 0%, rgba(5,7,13,0.82) 30%,
            rgba(5,7,13,0.32) 62%, rgba(5,7,13,0.06) 100%); }
        .np-dest-txt { position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
          padding: 14px 16px 15px; display: flex; flex-direction: column; gap: 8px; }
        .np-dest-tit { font-family: ${DISP}; font-size: 16px; font-weight: 700; color: ${INK0};
          margin: 0; line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .np-dest:hover .np-dest-tit { color: ${COURT}; }

        .np-sec-lista { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
        .np-sec-lista > .np-fila:last-child { border-bottom: 0; padding-bottom: 0; }

        /* Entre 1024 y 1240 el aviso al costado dejaría las secciones muy
           angostas, así que baja a lo ancho. */
        @media (max-width: 1240px) {
          .np-abajo { grid-template-columns: minmax(0, 1fr); }
          .np-ads { position: static; display: flex; justify-content: center; }
        }

        @media (max-width: 1023px) {
          .np-hero { grid-template-columns: minmax(0, 1fr); gap: 26px; margin-bottom: 38px; }
          .np-secs { grid-template-columns: minmax(0, 1fr); gap: 34px; }
          .np-dest-img { max-height: 300px; }
        }
        @media (max-width: 767px), (pointer: coarse) {
          .np-page { padding: 28px 16px 90px; }
          .np-lead-img { aspect-ratio: 4 / 3; max-height: none; }
          .np-col > .np-fila { flex: 0 0 auto; align-items: start; }
          .np-fila { grid-template-columns: 88px minmax(0, 1fr); }
          .np-fila-img { width: 88px; }
          .np-fila-baj { display: none; }
          .np-ad { width: 100%; max-width: 300px; height: 250px; }
          .np-fila-tit { -webkit-line-clamp: 3; }
          .np-sec { margin-bottom: 34px; }
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

            <div className="np-abajo">
              <div className="np-secs">
              {secciones.map((s) => (
                <section key={s.id} className="np-sec">
                  <div className="np-sec-cab">
                    <h2 className="np-sec-tit">{s.label}</h2>
                  </div>
                  <Destacada nota={s.notas[0]} />
                  {s.notas.length > 1 && (
                    <div className="np-sec-lista">
                      {s.notas.slice(1).map((n) => <Fila key={n.id} nota={n} />)}
                    </div>
                  )}
                </section>
              ))}
              </div>

              {/* Columna de publicidad. El hueco reservado solo lo ve un
                  admin; para el público la columna no existe hasta que haya
                  un aviso de verdad. */}
              <EspacioPublicitario />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
