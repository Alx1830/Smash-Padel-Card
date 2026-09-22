import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink, Store, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import {
  buscarSet, cartasDelSet, buscarCarta, preciosDeCarta, enVenta, precioDestacado,
} from "@/lib/catalogo";
import { getVersionLabel } from "@/data/pokemon-cards-meta";
import { fotoChica } from "@/lib/foto-carta";
import { tcgCardLink } from "@/lib/tcg-link";
import { priceLabel } from "@/lib/currency";
import { trmDelDia } from "@/lib/trm";
import { SITIO, migas, DatosJson, EDITOR } from "@/lib/seo";
import { PieLegal } from "@/components/PieLegal";
import { MobileTabBar } from "@/components/MobileTabBar";

/**
 * La ficha pública de una carta: foto grande, cuánto vale cada variante en
 * dólares y en pesos, quién la tiene en venta acá y a dónde ir a comprarla.
 *
 * Es la página que más visitas puede traer del buscador: la gente no busca
 * "facebinder", busca "cuánto vale Charizard 006/165". Hasta ahora esa
 * respuesta solo existía adentro del panel.
 *
 * Una carta es una dirección, con todas sus variantes adentro. Una página por
 * variante serían cuatro direcciones con la misma foto y el mismo texto, que es
 * justo lo que Google castiga como contenido duplicado.
 */

export const revalidate = 21600;

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";

type Props = { params: Promise<{ set: string; numero: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { set: setId, numero } = await params;
  const set = buscarSet(setId);
  const carta = set ? await buscarCarta(setId, Number(numero)) : null;
  if (!set || !carta) return {};

  const { precios } = await preciosDeCarta(setId, carta.numero);
  const precio = precioDestacado(precios);

  const cuanto = precio !== null
    ? `Hoy vale alrededor de USD ${precio.toFixed(2)}.`
    : "Mirá su precio de mercado y sus variantes.";

  return {
    title: `${carta.nombre} — ${set.name} nº ${carta.numero} | precio y variantes`,
    description:
      `¿Cuánto vale ${carta.nombre} de ${set.name} (nº ${carta.numero})? ${cuanto} ` +
      `Precio en dólares y en pesos colombianos, todas sus variantes y quién la ` +
      `tiene en venta.`,
    alternates: { canonical: `${SITIO}/carta/${setId}/${carta.numero}` },
    openGraph: {
      title: `${carta.nombre} — ${set.name} nº ${carta.numero}`,
      description: cuanto,
      url: `${SITIO}/carta/${setId}/${carta.numero}`,
      images: [{ url: carta.imagen }],
    },
  };
}

function usd(v: number): string {
  return v >= 100 ? `$${Math.round(v)}` : `$${v.toFixed(2)}`;
}

export default async function CartaPage({ params }: Props) {
  const { set: setId, numero: numeroTexto } = await params;
  const numero = Number(numeroTexto);
  const set = buscarSet(setId);
  if (!set || !Number.isInteger(numero) || numero < 1) notFound();

  const cartas = await cartasDelSet(setId);
  const indice = cartas.findIndex(c => c.numero === numero);
  if (indice === -1) notFound();

  const carta = cartas[indice];
  const anterior = cartas[indice - 1] ?? null;
  const siguiente = cartas[indice + 1] ?? null;

  const [{ precios, actualizado }, venta, trm] = await Promise.all([
    preciosDeCarta(setId, numero),
    enVenta(setId, numero),
    trmDelDia(),
  ]);

  /* Las variantes que el catálogo dice que existen, cada una con su precio si
     la tabla lo tiene. Se ordenan de más cara a más barata porque es el orden
     en el que la gente las mira. */
  const filas = carta.variantes
    .map(v => ({ variante: v, precio: precios[v] ?? null }))
    .sort((a, b) => (b.precio ?? -1) - (a.precio ?? -1));

  const destacado = precioDestacado(precios);
  const fecha = actualizado
    ? new Date(actualizado).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
    : null;

  /* Cuatro vecinas del mismo set, para que la página no sea un callejón sin
     salida ni para el visitante ni para el rastreador. */
  const cerca = cartas
    .slice(Math.max(0, indice - 2), indice + 3)
    .filter(c => c.numero !== numero)
    .slice(0, 4);

  return (
    <div className="ca-page">
      <style>{`
        .ca-page { min-height: 100vh; background: #05070d; padding: 40px 24px; }
        .ca-wrap { max-width: 1400px; }

        /* Foto a la izquierda y datos a la derecha; en el celular, uno debajo
           del otro con la foto arriba. */
        .ca-ficha { display: grid; grid-template-columns: minmax(0, 320px) minmax(0, 1fr); gap: 32px; align-items: start; }
        @media (max-width: 767px) {
          .ca-page { padding: 28px 16px; }
          .ca-ficha { grid-template-columns: minmax(0, 1fr); gap: 22px; }
        }

        .ca-foto { width: 100%; aspect-ratio: 5 / 7; object-fit: contain; border-radius: 12px; display: block; }

        .ca-tabla { width: 100%; border-collapse: collapse; }
        .ca-tabla th {
          font-family: ${MONO}; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
          color: ${INK2}; text-align: left; font-weight: 500;
          padding: 0 12px 8px 0; border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ca-tabla td {
          font-family: ${MONO}; font-size: 12px; color: ${INK1};
          padding: 11px 12px 11px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .ca-tabla td:last-child, .ca-tabla th:last-child { padding-right: 0; text-align: right; }

        .ca-vecinas { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 1023px) { .ca-vecinas { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 767px)  { .ca-vecinas { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } }

        .ca-vecina {
          display: flex; flex-direction: column; gap: 6px; padding: 8px;
          border: 1px solid rgba(255,255,255,0.07); border-radius: 12px;
          background: rgba(255,255,255,0.02); text-decoration: none;
        }
        .ca-vecina:hover { border-color: rgba(46,230,193,0.35); }
        .ca-vecina img { width: 100%; aspect-ratio: 5 / 7; object-fit: cover; border-radius: 8px; display: block; }
        .ca-vecina span {
          font-family: ${MONO}; font-size: 11px; color: ${INK0};
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .ca-btn {
          display: inline-flex; align-items: center; gap: 7px;
          font-family: ${MONO}; font-size: 11px; font-weight: 600;
          padding: 11px 20px; border-radius: 999px; text-decoration: none;
        }
        .ca-btn-p { background: linear-gradient(90deg, ${COURT}, ${BALL}); color: #05070d; }
        .ca-btn-s { border: 1px solid rgba(255,255,255,0.15); color: ${INK1}; }
      `}</style>

      <DatosJson datos={[
        migas([
          { nombre: "Inicio", url: "/" },
          { nombre: "Sets", url: "/sets" },
          { nombre: set.name, url: `/sets/${setId}` },
          { nombre: carta.nombre, url: `/carta/${setId}/${carta.numero}` },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "Product",
          name: `${carta.nombre} — ${set.name} nº ${carta.numero}`,
          image: carta.imagen,
          description:
            `Carta ${carta.nombre} del set ${set.name} de Pokémon TCG, número ` +
            `${carta.numero}. Variantes: ${carta.variantes.map(getVersionLabel).join(", ")}.`,
          category: "Pokémon TCG",
          isPartOf: { "@type": "Collection", name: set.name, url: `${SITIO}/sets/${setId}` },
          publisher: EDITOR,
          /* La oferta se declara solo cuando hay una publicación de verdad en
             el market. El precio de TCGplayer es una referencia de mercado, no
             algo que se venda acá: anunciarlo como oferta sería mentirle a
             Google y a quien haga clic. */
          ...(venta.desde
            ? {
                offers: {
                  "@type": "AggregateOffer",
                  offerCount: venta.cantidad,
                  lowPrice: venta.desde.precio,
                  priceCurrency: venta.desde.moneda,
                  availability: "https://schema.org/InStock",
                  url: `${SITIO}/market`,
                },
              }
            : {}),
        },
      ]} />

      <div className="ca-wrap">

        {/* Cabecera */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
            <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
            <Link href="/sets" style={{ color: COURT, textDecoration: "none" }}>Sets</Link>
            <span style={{ color: INK2 }}>/</span>
            <Link href={`/sets/${setId}`} style={{ color: INK2, textDecoration: "none" }}>{set.name}</Link>
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            {carta.nombre}
          </h1>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.06em", margin: "8px 0 0" }}>
            {set.name} · Nº {carta.numero} · {set.serie.name}
          </p>
        </div>

        <div className="ca-ficha">

          {/* Foto */}
          <div>
            <img
              src={carta.imagen}
              alt={`Carta ${carta.nombre} de ${set.name}, número ${carta.numero}`}
              className="ca-foto"
              decoding="async"
            />

            {/* Carta anterior y siguiente del mismo set */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginTop: "12px" }}>
              {anterior ? (
                <Link href={`/carta/${setId}/${anterior.numero}`} style={{ fontFamily: MONO, fontSize: "10px", color: INK2, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                  <ChevronLeft size={12} strokeWidth={2} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{anterior.nombre}</span>
                </Link>
              ) : <span />}
              {siguiente && (
                <Link href={`/carta/${setId}/${siguiente.numero}`} style={{ fontFamily: MONO, fontSize: "10px", color: INK2, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{siguiente.nombre}</span>
                  <ChevronRight size={12} strokeWidth={2} />
                </Link>
              )}
            </div>
          </div>

          {/* Datos */}
          <div>
            {destacado !== null ? (
              <div style={{ marginBottom: "22px" }}>
                <div style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: INK2 }}>
                  Precio de mercado
                </div>
                <div style={{ fontFamily: DISP, fontSize: "clamp(28px, 6vw, 40px)", fontWeight: 900, color: COURT, lineHeight: 1.1, marginTop: "4px" }}>
                  {usd(destacado)} <span style={{ fontSize: "16px", color: INK2 }}>USD</span>
                </div>
                {trm && (
                  <div style={{ fontFamily: MONO, fontSize: "12px", color: INK1, marginTop: "4px" }}>
                    ≈ {priceLabel(Math.round(destacado * trm.cop), "COP")}
                    <span style={{ color: INK2, fontSize: "10px" }}> · dólar a {trm.cop.toLocaleString("es-CO")} ({trm.fuente})</span>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, marginBottom: "22px", lineHeight: 1.8 }}>
                Esta carta todavía no tiene precio de mercado registrado. El cron
                de precios recorre el catálogo cada tres horas y la va a tomar en
                cuanto TCGplayer la publique.
              </p>
            )}

            {/* Una fila por variante */}
            <table className="ca-tabla">
              <thead>
                <tr>
                  <th>Variante</th>
                  <th>USD</th>
                  {trm && <th>COP</th>}
                </tr>
              </thead>
              <tbody>
                {filas.map(({ variante, precio }) => (
                  <tr key={variante}>
                    <td style={{ color: INK0 }}>{getVersionLabel(variante)}</td>
                    <td style={{ color: precio !== null ? COURT : INK2, fontWeight: precio !== null ? 700 : 400 }}>
                      {precio !== null ? usd(precio) : "—"}
                    </td>
                    {trm && (
                      <td>{precio !== null ? priceLabel(Math.round(precio * trm.cop), "COP") : "—"}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {fecha && (
              <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: "12px 0 0", display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={11} strokeWidth={2} />
                Precios de TCGplayer, actualizados el {fecha}
              </p>
            )}

            {/* En venta acá */}
            <div style={{ marginTop: "26px", padding: "16px", borderRadius: "12px", border: `1px solid ${venta.cantidad ? "rgba(214,255,61,0.25)" : "rgba(255,255,255,0.07)"}`, background: venta.cantidad ? "rgba(214,255,61,0.05)" : "rgba(255,255,255,0.02)" }}>
              <div style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: INK2, marginBottom: "6px" }}>
                En Facebinder
              </div>
              {venta.cantidad > 0 && venta.desde ? (
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK0, margin: 0, lineHeight: 1.7 }}>
                  {venta.cantidad === 1 ? "Hay 1 copia" : `Hay ${venta.cantidad} copias`} en
                  venta, desde{" "}
                  <strong style={{ color: BALL }}>
                    {priceLabel(venta.desde.precio, venta.desde.moneda)}
                  </strong>.
                </p>
              ) : (
                <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, margin: 0, lineHeight: 1.7 }}>
                  Nadie la tiene publicada todavía. Si la tenés repetida, la podés
                  poner en venta desde tu inventario.
                </p>
              )}
            </div>

            {/* Acciones */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
              <Link href="/market" className="ca-btn ca-btn-p">
                <Store size={13} strokeWidth={2} /> Ver el market
              </Link>
              <a
                href={tcgCardLink(setId, carta.numero, `${carta.nombre} ${set.name}`)}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="ca-btn ca-btn-s"
              >
                <ExternalLink size={13} strokeWidth={2} /> Verla en TCGplayer
              </a>
            </div>

            {/* Párrafo de contexto: le dice al lector —y al buscador— qué es
                exactamente esta carta, con las palabras con las que la busca */}
            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, lineHeight: 1.9, marginTop: "26px", maxWidth: "620px" }}>
              {carta.nombre} es la carta número {carta.numero} de {set.name}, una
              expansión de la serie {set.serie.name} del juego de cartas
              coleccionables de Pokémon.{" "}
              {carta.variantes.length > 1
                ? `Se imprimió en ${carta.variantes.length} variantes (${carta.variantes.map(getVersionLabel).join(", ")}), y cada una tiene su propio precio: la tabla de arriba las separa porque confundirlas es la forma más común de vender una carta por menos de lo que vale.`
                : `Se imprimió en una sola variante: ${getVersionLabel(carta.variantes[0])}.`}{" "}
              Los precios salen de las ventas reales de TCGplayer y se refrescan
              cada tres horas; la conversión a pesos usa la TRM del día.
            </p>
          </div>
        </div>

        {/* Vecinas */}
        {cerca.length > 0 && (
          <section style={{ marginTop: "48px" }}>
            <h2 style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK2, margin: "0 0 14px" }}>
              Otras cartas de {set.name}
            </h2>
            <div className="ca-vecinas">
              {cerca.map(c => (
                <Link key={c.numero} href={`/carta/${setId}/${c.numero}`} className="ca-vecina">
                  <img
                    src={fotoChica(c.imagen)}
                    alt={`${c.nombre} — ${set.name} nº ${c.numero}`}
                    loading="lazy"
                    decoding="async"
                  />
                  <span title={c.nombre}>{c.nombre}</span>
                </Link>
              ))}
            </div>
            <Link href={`/sets/${setId}`} style={{ display: "inline-block", marginTop: "14px", fontFamily: MONO, fontSize: "11px", color: COURT, textDecoration: "none" }}>
              Ver las {cartas.length} cartas de {set.name} →
            </Link>
          </section>
        )}
      </div>

      <PieLegal />
      <MobileTabBar />
    </div>
  );
}
