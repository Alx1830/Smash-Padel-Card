import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Store, TrendingUp, Clock } from "lucide-react";
import {
  buscarSet, cartasDelSet, preciosDelSet, enVentaDelSet, precioDestacado,
} from "@/lib/catalogo";
import { getVersionLabel } from "@/data/pokemon-cards-meta";
import { fotoChica } from "@/lib/foto-carta";
import { SITIO, migas, DatosJson, EDITOR } from "@/lib/seo";
import { PieLegal } from "@/components/PieLegal";
import { MobileTabBar } from "@/components/MobileTabBar";

/**
 * La página pública de un set: la lista completa de sus cartas con el precio de
 * mercado de cada una.
 *
 * Se arma en el servidor y se guarda seis horas, que es el ritmo al que el cron
 * de TCGplayer refresca los precios. Sin sesión y sin cookies: así Next la
 * puede cachear y Google la ve igual que cualquier visitante.
 */

export const revalidate = 21600;

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";

type Props = { params: Promise<{ set: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { set: setId } = await params;
  const set = buscarSet(setId);
  if (!set) return {};

  const cartas = await cartasDelSet(setId);

  return {
    title: `${set.name} — lista de cartas y precios | Pokémon TCG`,
    description:
      `Las ${cartas.length} cartas del set ${set.name} de Pokémon TCG, una por una, ` +
      `con el precio de mercado actualizado y sus variantes. Parte de la serie ` +
      `${set.serie.name}.`,
    alternates: { canonical: `${SITIO}/sets/${setId}` },
    openGraph: {
      title: `${set.name} — todas las cartas y sus precios`,
      description: `Lista completa de las ${cartas.length} cartas de ${set.name}, con precios al día.`,
      url: `${SITIO}/sets/${setId}`,
      images: [{ url: set.logo.startsWith("http") ? set.logo : `${SITIO}${set.logo}` }],
    },
  };
}

function dinero(usd: number): string {
  return usd >= 100 ? `$${Math.round(usd)}` : `$${usd.toFixed(2)}`;
}

export default async function SetPage({ params }: Props) {
  const { set: setId } = await params;
  const set = buscarSet(setId);
  if (!set) notFound();

  const [cartas, precios, publicadas] = await Promise.all([
    cartasDelSet(setId),
    preciosDelSet(setId),
    enVentaDelSet(setId),
  ]);

  if (!cartas.length) notFound();

  /* El valor del set completo: la suma del precio más alto de cada carta. Es el
     número que busca cualquiera que se pregunte si vale la pena completarlo. */
  const conPrecio = cartas
    .map(c => precioDestacado(precios.porCarta[c.numero]))
    .filter((v): v is number => v !== null);
  const valorTotal = conPrecio.reduce((a, b) => a + b, 0);

  const masCara = cartas.reduce<{ nombre: string; numero: number; precio: number } | null>((mejor, c) => {
    const p = precioDestacado(precios.porCarta[c.numero]);
    if (p === null) return mejor;
    if (!mejor || p > mejor.precio) return { nombre: c.nombre, numero: c.numero, precio: p };
    return mejor;
  }, null);

  const enVentaTotal = Object.values(publicadas).reduce((a, b) => a + b, 0);
  const actualizado = precios.actualizado
    ? new Date(precios.actualizado).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="se-page">
      <style>{`
        .se-page { min-height: 100vh; background: #05070d; padding: 40px 24px; }
        .se-wrap { max-width: 1400px; }

        .se-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 1500px) { .se-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
        @media (max-width: 1240px) { .se-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 1023px) { .se-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 767px) {
          .se-page { padding: 28px 16px; }
          .se-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        }

        .se-card {
          display: flex; flex-direction: column; gap: 8px;
          border-radius: 12px; padding: 8px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.02);
          text-decoration: none; transition: border-color 0.15s, background 0.15s;
        }
        .se-card:hover { border-color: rgba(46,230,193,0.35); background: rgba(46,230,193,0.04); }
        .se-foto { width: 100%; aspect-ratio: 5 / 7; object-fit: cover; border-radius: 8px; display: block; }
        .se-nombre {
          font-family: ${MONO}; font-size: 11px; color: ${INK0}; font-weight: 600;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .se-num { font-family: ${MONO}; font-size: 9px; color: ${INK2}; letter-spacing: 0.06em; }
        .se-precio {
          font-family: ${MONO}; font-size: 11px; font-weight: 700; color: ${COURT};
          margin-top: auto;
        }
        .se-sinprecio { font-family: ${MONO}; font-size: 9px; color: ${INK2}; margin-top: auto; }
        .se-venta { font-family: ${MONO}; font-size: 8px; color: ${BALL}; letter-spacing: 0.06em; }

        .se-datos { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0 8px; }
        .se-dato {
          border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
          background: rgba(255,255,255,0.02); padding: 10px 14px;
        }
        .se-dato-k { font-family: ${MONO}; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: ${INK2}; }
        .se-dato-v { font-family: ${DISP}; font-size: 19px; font-weight: 700; color: ${INK0}; margin-top: 3px; }
      `}</style>

      <DatosJson datos={[
        migas([
          { nombre: "Inicio", url: "/" },
          { nombre: "Sets", url: "/sets" },
          { nombre: set.name, url: `/sets/${setId}` },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${set.name} — cartas y precios`,
          url: `${SITIO}/sets/${setId}`,
          publisher: EDITOR,
          /* Las primeras cincuenta alcanzan: el objetivo es que Google entienda
             que esto es una lista de productos, no repetirle las 800. */
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: cartas.length,
            itemListElement: cartas.slice(0, 50).map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.nombre,
              url: `${SITIO}/carta/${setId}/${c.numero}`,
            })),
          },
        },
      ]} />

      <div className="se-wrap">

        {/* Cabecera */}
        <div>
          <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
            <Link href="/sets" style={{ color: COURT, textDecoration: "none" }}>Sets</Link>
            <span style={{ color: INK2 }}>/</span>
            <span style={{ color: INK2 }}>{set.serie.name}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
            <img
              src={set.logo}
              alt={`Logo del set ${set.name}`}
              style={{ height: "64px", maxWidth: "220px", objectFit: "contain" }}
              decoding="async"
            />
            <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
              {set.name}
            </h1>
          </div>

          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.06em", margin: "12px 0 0", maxWidth: "700px", lineHeight: 1.8 }}>
            {set.name} tiene {cartas.length} cartas y pertenece a la serie {set.serie.name}.
            Abajo están todas, en orden de número, con el precio de mercado de la
            variante más valiosa de cada una. Tocá cualquiera para ver sus
            variantes, el precio de cada una y quién la tiene en venta.
          </p>
        </div>

        {/* Los números del set */}
        <div className="se-datos">
          <div className="se-dato">
            <div className="se-dato-k">Cartas</div>
            <div className="se-dato-v">{cartas.length}</div>
          </div>
          {valorTotal > 0 && (
            <div className="se-dato">
              <div className="se-dato-k">Vale completarlo</div>
              <div className="se-dato-v" style={{ color: COURT }}>{dinero(valorTotal)} USD</div>
            </div>
          )}
          {masCara && (
            <div className="se-dato">
              <div className="se-dato-k">La más cara</div>
              <div className="se-dato-v" style={{ fontSize: "14px" }}>
                <Link href={`/carta/${setId}/${masCara.numero}`} style={{ color: INK0, textDecoration: "none" }}>
                  {masCara.nombre} · <span style={{ color: COURT }}>{dinero(masCara.precio)}</span>
                </Link>
              </div>
            </div>
          )}
          {enVentaTotal > 0 && (
            <div className="se-dato">
              <div className="se-dato-k">En venta acá</div>
              <div className="se-dato-v" style={{ color: BALL }}>{enVentaTotal}</div>
            </div>
          )}
        </div>

        {actualizado && (
          <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, letterSpacing: "0.06em", margin: "0 0 24px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock size={11} strokeWidth={2} />
            Precios de TCGplayer, actualizados el {actualizado}
          </p>
        )}

        {/* Las cartas */}
        <div className="se-grid">
          {cartas.map(carta => {
            const precio = precioDestacado(precios.porCarta[carta.numero]);
            const venta  = publicadas[carta.numero] ?? 0;
            return (
              <Link key={carta.numero} href={`/carta/${setId}/${carta.numero}`} className="se-card">
                <img
                  src={fotoChica(carta.imagen)}
                  alt={`${carta.nombre} — ${set.name} nº ${carta.numero}`}
                  className="se-foto"
                  loading="lazy"
                  decoding="async"
                />
                <div className="se-nombre" title={carta.nombre}>{carta.nombre}</div>
                <div className="se-num">
                  Nº {carta.numero}
                  {carta.variantes.length > 1 && ` · ${carta.variantes.length} variantes`}
                </div>
                {precio !== null
                  ? <div className="se-precio">{dinero(precio)} USD</div>
                  : <div className="se-sinprecio">Sin precio todavía</div>}
                {venta > 0 && (
                  <div className="se-venta">{venta} en venta</div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Invitación, no muro: la página ya entregó lo que prometía */}
        <div style={{ marginTop: "40px", padding: "20px", border: "1px solid rgba(46,230,193,0.2)", borderRadius: "12px", background: "rgba(46,230,193,0.04)", maxWidth: "700px" }}>
          <div style={{ fontFamily: DISP, fontSize: "16px", fontWeight: 700, color: INK0, display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={16} color={COURT} strokeWidth={2} />
            ¿Cuántas de estas tenés?
          </div>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK1, lineHeight: 1.8, margin: "10px 0 14px" }}>
            Con una cuenta de Facebinder marcás las que ya tenés, ves cuánto vale
            tu parte del set y seguís el precio día a día. Es gratis.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href="/login" style={{ fontFamily: MONO, fontSize: "11px", fontWeight: 700, padding: "10px 20px", borderRadius: "999px", background: `linear-gradient(90deg, ${COURT}, ${BALL})`, color: "#05070d", textDecoration: "none" }}>
              Crear mi cuenta
            </Link>
            <Link href="/market" style={{ fontFamily: MONO, fontSize: "11px", padding: "10px 20px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.15)", color: INK1, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Store size={12} strokeWidth={2} /> Ver el market
            </Link>
          </div>
        </div>

        {/* Las variantes que existen en este set, en texto: le da a Google el
            vocabulario con el que la gente busca ("reverse holo", "1st edition") */}
        {(() => {
          const todas = [...new Set(cartas.flatMap(c => c.variantes))];
          if (todas.length < 2) return null;
          return (
            <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, lineHeight: 1.9, margin: "28px 0 0", maxWidth: "700px" }}>
              Variantes que aparecen en {set.name}:{" "}
              {todas.map(getVersionLabel).join(" · ")}.
            </p>
          );
        })()}
      </div>

      <PieLegal />
      <MobileTabBar />
    </div>
  );
}
