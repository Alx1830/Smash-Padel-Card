import Link from "next/link";
import { HeroSwiper } from "@/components/HeroSwiper";
import { Footer } from "@/components/Footer";
import { MarketSlider } from "@/components/landing/MarketSlider";
import { Contador } from "@/components/landing/Contador";
import { InstalarApp } from "@/components/landing/InstalarApp";
import { DatosEstructurados } from "@/components/landing/DatosEstructurados";
import { cartasEnVenta, numerosDeLaCasa } from "@/lib/landing-data";
import type { Metadata } from "next";
import {
  ShieldCheck, RefreshCw, MapPin, Heart, ArrowLeftRight, LineChart,
  Layers, Store, Search, Check, Minus, Store as Tienda,
} from "lucide-react";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

/* La portada se rearma cada diez minutos: los números y las cartas en venta
   cambian solos sin volver a desplegar. */
export const revalidate = 600;

/**
 * El título y la descripción de la portada apuntan a lo que la gente escribe en
 * Google: "cartas pokémon colombia", "cuánto vale mi colección", "vender cartas
 * pokémon". El de layout.tsx es genérico y sirve para el resto del sitio.
 */
export const metadata: Metadata = {
  title: "Cartas Pokémon en Colombia — colecciona, valora, vende e intercambia",
  description:
    "La plataforma colombiana para coleccionistas de Pokémon TCG. Registra tu colección carta por carta, mira cuánto vale tu binder en pesos, compra y vende con coleccionistas de tu ciudad e intercambia con la cuenta clara.",
  alternates: { canonical: "https://facebinder.com" },
  keywords: [
    "cartas Pokémon Colombia", "comprar cartas Pokémon Colombia",
    "vender cartas Pokémon", "intercambiar cartas Pokémon",
    "cuánto vale mi colección Pokémon", "precio cartas Pokémon en pesos",
    "coleccionistas Pokémon Colombia", "Pokémon TCG Bogotá",
    "market cartas Pokémon", "binder digital", "inventario Pokémon TCG",
  ],
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "https://facebinder.com",
    siteName: "FaceBinder",
    title: "Cartas Pokémon en Colombia — colecciona, valora, vende e intercambia",
    description:
      "Registra tu colección, mira cuánto vale tu binder en pesos y véndelo o cámbialo con coleccionistas de tu ciudad.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "FaceBinder — cartas Pokémon en Colombia" }],
  },
};

/** Lo que de verdad hace la plataforma, sin promesas que no podemos cumplir */
const SELLOS = [
  { Icon: ShieldCheck, titulo: "Nadie publica sin pasar por revisión",
    texto: "Cada carta que entra al market la mira una persona antes de que salga. No es un filtro automático." },
  { Icon: RefreshCw, titulo: "Precios que se actualizan cada 3 horas",
    texto: "Traemos el precio de TCGplayer y lo pasamos a pesos con la tasa del día. Ni inventado, ni de hace un mes." },
  { Icon: MapPin, titulo: "Hecho en Colombia, en pesos",
    texto: "Los precios se publican en la moneda de cada quien y los filtros van por ciudad. Sin conversiones raras." },
];

const FUNCIONES = [
  { Icon: Layers, color: COURT,
    titulo: "Tu inventario, carta por carta",
    texto: "Normal, Reverse Holo, Holofoil y las variantes raras que nadie más distingue. Cada copia cuenta, y el progreso del set se llena solo." },
  { Icon: LineChart, color: "#4ff0ff",
    titulo: "Cuánto vale tu binder",
    texto: "Un gráfico con el valor de todo lo que tienes, actualizado cada hora. Sirve para presumir y también para saber cuándo vender." },
  { Icon: Store, color: BALL,
    titulo: "Market con precio de referencia",
    texto: "Publicas desde tu inventario en dos toques. El comprador ve tu precio al lado del precio de mercado y decide con la información en la mano." },
  { Icon: ArrowLeftRight, color: "#a26bff",
    titulo: "Intercambios con la cuenta clara",
    texto: "Los dos ven qué pone cada uno y cuánto suma cada lado. Hay chat para negociar y, al cerrar, el inventario se mueve solo." },
  { Icon: Heart, color: "#ff4fd8",
    titulo: "Wishlist que avisa",
    texto: "Anota la que te falta y olvídate. Cuando alguien la publique te llega la notificación, aunque tengas la app cerrada." },
  { Icon: Search, color: "#ffd24f",
    titulo: "Decks, sets propios y perfil público",
    texto: "Arma mazos, crea tus propios sets y comparte un link con tu colección en vez de mandar cuarenta fotos por WhatsApp." },
];

const PASOS = [
  { num: "01", titulo: "Entra con Google",     texto: "Sin formularios largos ni confirmar correos. Diez segundos." },
  { num: "02", titulo: "Marca lo que tienes",  texto: "Buscas la carta, dices cuántas copias y de qué variante. El resto lo pone la app." },
  { num: "03", titulo: "Publica o intercambia", texto: "Lo que te sobra va al market con tu precio, o lo cambias con alguien de tu ciudad." },
  { num: "04", titulo: "Cierran por chat",     texto: "Se ponen de acuerdo dentro de la app o por WhatsApp. Ustedes eligen cómo se ven." },
];

/** La competencia real no es TCGplayer: es un grupo de Facebook y un chat */
const COMPARACION = {
  columnas: ["FaceBinder", "Grupo de Facebook", "Chat de WhatsApp"],
  filas: [
    { que: "Sabes cuánto vale lo que tienes",        valores: [true, false, false] },
    { que: "Precio de mercado al lado del precio",   valores: [true, false, false] },
    { que: "La publicación no se pierde entre memes", valores: [true, false, false] },
    { que: "Te avisan cuando aparece la que buscas", valores: [true, false, false] },
    { que: "Alguien revisa antes de publicar",       valores: [true, false, false] },
    { que: "Buscar por set, variante y ciudad",      valores: [true, false, false] },
    { que: "Hablar directo con el vendedor",         valores: [true, true, true] },
  ],
};

export default async function LandingPage() {
  /* Las dos consultas van juntas: la portada no debe esperar dos viajes */
  const [cartas, cifras] = await Promise.all([cartasEnVenta(18), numerosDeLaCasa()]);

  /* Un contador en cero da más desconfianza que no tener contador */
  const numeros = [
    { valor: cifras.cartasRegistradas, etiqueta: "cartas registradas" },
    { valor: cifras.sets,              etiqueta: "sets con dueño" },
    { valor: cifras.cartasEnVenta,     etiqueta: "cartas en venta ahora" },
    { valor: cifras.ciudades,          etiqueta: "ciudades" },
  ].filter(n => n.valor > 0);

  return (
    <main style={{ background: BG0, color: INK0, overflowX: "hidden" }}>
      <DatosEstructurados cartasEnVenta={cifras.cartasEnVenta} />
      <style>{`
        @keyframes gridPan  { from { background-position: 0 0; } to { background-position: 80px 80px; } }
        @keyframes float    { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        .feature-card { transition: border-color 0.2s, background 0.2s, transform 0.2s; }
        .feature-card:hover { border-color: rgba(255,255,255,0.18) !important; background: rgba(255,255,255,0.05) !important; transform: translateY(-3px); }
        .cta-btn   { transition: opacity 0.2s, transform 0.2s; }
        .cta-btn:hover   { opacity: 0.88; transform: translateY(-2px); }
        .ghost-btn { transition: border-color 0.2s, color 0.2s; }
        .ghost-btn:hover { border-color: rgba(255,255,255,0.4) !important; color: ${INK0} !important; }
        .lp-seccion { padding: 108px 40px; }
        .lp-wrap    { max-width: 1240px; margin: 0 auto; }
        .lp-cifras  { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
        .lp-sellos  { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .lp-func    { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
        .lp-pasos   { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 28px; }
        .lp-tabla   { width: 100%; border-collapse: collapse; }
        .lp-tabla th, .lp-tabla td { padding: 13px 14px; text-align: left; }
        .lp-tabla tbody tr { border-top: 1px solid rgba(255,255,255,0.06); }
        .lp-tabla tbody tr:hover { background: rgba(255,255,255,0.02); }
        /* El punto ciego de la tableta: acá es donde se rompe todo si no se mira */
        @media (max-width: 1023px) {
          .lp-func   { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .lp-cifras { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .lp-sellos { grid-template-columns: 1fr; }
          .lp-pasos  { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 767px) {
          .hero-grid        { flex-direction: column !important; align-items: center !important; padding: 60px 24px 64px !important; gap: 40px !important; }
          .hero-text        { max-width: 100% !important; text-align: center !important; }
          .hero-btns        { justify-content: center !important; flex-direction: column !important; align-items: center !important; }
          .hero-swiper      { display: flex; justify-content: center; width: 100%; }
          .lp-seccion       { padding: 64px 20px; }
          .lp-func          { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .lp-instalar      { justify-content: center; }
          .lp-tabla-marco   { overflow-x: auto; }
          .lp-tabla         { min-width: 520px; }
        }
      `}</style>

      {/* ══ HERO ══ (no se toca: es la parte que ya funcionaba) */}
      <section style={{ paddingTop: "64px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `radial-gradient(ellipse 70% 60% at 20% 50%, rgba(46,230,193,0.18), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 60%, rgba(255,79,216,0.12), transparent 70%), linear-gradient(180deg, #0a1320 0%, ${BG0} 100%)` }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`, backgroundSize: "80px 80px", animation: "gridPan 4s linear infinite" }} />

        <div className="hero-grid" style={{ position: "relative", zIndex: 10, maxWidth: "1200px", margin: "0 auto", padding: "80px 40px 100px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "64px" }}>
          <div className="hero-text" style={{ flex: 1, maxWidth: "560px" }}>
            <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <span style={{ width: "18px", height: "1px", background: COURT, display: "inline-block" }} />
              Binder digital Pokémon TCG
            </div>

            <h1 style={{ fontFamily: DISP, fontSize: "clamp(44px, 6vw, 80px)", lineHeight: 0.92, margin: "0 0 28px", letterSpacing: "-0.03em", color: INK0 }}>
              Colecciona,<br />comparte
              <em style={{ fontStyle: "normal", display: "block", background: `linear-gradient(135deg, #4ff0ff, ${COURT}, ${BALL})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
                y vende.
              </em>
            </h1>

            <p style={{ fontFamily: MONO, fontSize: "14px", color: INK1, lineHeight: 1.9, letterSpacing: "0.03em", margin: "0 0 40px" }}>
              Lleva el control de cada carta de tu binder. Conecta con coleccionistas Pokémon. Publica y vende las cartas que te sobran directo por WhatsApp.
            </p>

            <div className="hero-btns" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <Link href="/login" className="cta-btn" style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "14px 36px", borderRadius: "12px", background: `linear-gradient(90deg, ${COURT}, ${BALL})`, color: BG0, fontFamily: MONO, fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", boxShadow: `0 0 40px ${COURT}33` }}>
                Crear mi Facebinder →
              </Link>
              <Link href="/market" className="ghost-btn" style={{ display: "inline-flex", alignItems: "center", padding: "14px 28px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.15)", color: INK2, fontFamily: MONO, fontSize: "13px", letterSpacing: "0.08em", textDecoration: "none" }}>
                Ver el Market →
              </Link>
            </div>

            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, marginTop: "20px", letterSpacing: "0.08em" }}>
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" style={{ color: COURT, textDecoration: "none" }}>Inicia sesión</Link>
            </p>
          </div>

          <div className="hero-swiper" style={{ flexShrink: 0, animation: "float 7s ease-in-out infinite" }}>
            <HeroSwiper />
          </div>
        </div>
      </section>

      {/* ══ INSTALAR LA APP ══ */}
      <section style={{ padding: "0 40px 8px", position: "relative", zIndex: 10 }}>
        <div className="lp-wrap" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 24, flexWrap: "wrap",
          padding: "22px 26px", borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(100deg, rgba(46,230,193,0.06), rgba(255,255,255,0.02))",
        }}>
          <div style={{ minWidth: 260, flex: 1 }}>
            <p style={{ fontFamily: DISP, fontSize: 19, color: INK0, margin: "0 0 5px" }}>
              Llévala en el celular
            </p>
            <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: 0, lineHeight: 1.7, maxWidth: 460 }}>
              No hay que bajar nada de ninguna tienda. Se instala desde el navegador,
              queda con su ícono en la pantalla y abre sin barras.
            </p>
          </div>
          <div className="lp-instalar" style={{ display: "flex" }}>
            <InstalarApp />
          </div>
        </div>
      </section>

      {/* ══ SELLOS ══ */}
      <section className="lp-seccion" style={{ paddingTop: 72, paddingBottom: 0 }}>
        <div className="lp-wrap lp-sellos">
          {SELLOS.map(({ Icon, titulo, texto }) => (
            <div key={titulo} style={{
              padding: "20px 22px", borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)",
            }}>
              <Icon size={18} color={COURT} strokeWidth={1.8} />
              <p style={{ fontFamily: DISP, fontSize: 15, color: INK0, margin: "12px 0 6px", lineHeight: 1.3 }}>
                {titulo}
              </p>
              <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: 0, lineHeight: 1.75 }}>
                {texto}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ CIFRAS ══ */}
      {numeros.length > 0 && (
        <section className="lp-seccion" style={{ paddingTop: 64, paddingBottom: 0 }}>
          <div className="lp-wrap lp-cifras">
            {numeros.map(n => (
              <div key={n.etiqueta} style={{
                padding: "22px 20px", borderRadius: 16, textAlign: "center",
                border: "1px solid rgba(46,230,193,0.12)", background: "rgba(46,230,193,0.03)",
              }}>
                <p style={{
                  fontFamily: DISP, fontSize: "clamp(26px, 4vw, 40px)", margin: 0,
                  background: `linear-gradient(135deg, ${COURT}, ${BALL})`,
                  WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                  <Contador hasta={n.valor} />
                </p>
                <p style={{
                  fontFamily: MONO, fontSize: 10, color: INK2, margin: "6px 0 0",
                  letterSpacing: "0.14em", textTransform: "uppercase",
                }}>
                  {n.etiqueta}
                </p>
              </div>
            ))}
          </div>
          <p style={{
            fontFamily: MONO, fontSize: 10, color: INK2, textAlign: "center",
            margin: "16px 0 0", letterSpacing: "0.06em",
          }}>
            Números de la base, no de un folleto. Se refrescan solos.
          </p>
        </section>
      )}

      {/* ══ CARTAS EN VENTA ══ */}
      {cartas.length > 0 && (
        <section className="lp-seccion" style={{ paddingBottom: 72 }}>
          <div className="lp-wrap" style={{ marginBottom: 26 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
              En venta ahora mismo
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: DISP, fontSize: "clamp(28px, 4.5vw, 46px)", color: INK0, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.08 }}>
                Estas están puestas<br />
                <em style={{ fontStyle: "normal", background: `linear-gradient(135deg, ${COURT}, ${BALL})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  por gente de verdad.
                </em>
              </h2>
              <Link href="/market" className="cta-btn" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 11, background: `linear-gradient(90deg, ${COURT}, ${BALL})`, color: BG0, fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none" }}>
                Ver todo el market →
              </Link>
            </div>
            <p style={{ fontFamily: MONO, fontSize: 11.5, color: INK2, margin: "14px 0 0", lineHeight: 1.8, maxWidth: 620 }}>
              Arrastra para ver más. Cada una la publicó un coleccionista y pasó por
              revisión antes de aparecer acá.
            </p>
          </div>
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <MarketSlider cartas={cartas} />
          </div>
        </section>
      )}

      {/* ══ FUNCIONES ══ */}
      <section className="lp-seccion" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="lp-wrap">
          <div style={{ marginBottom: 48, maxWidth: 640 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
              Lo que hay adentro
            </div>
            <h2 style={{ fontFamily: DISP, fontSize: "clamp(28px, 4.5vw, 46px)", color: INK0, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.08 }}>
              Seis cosas que antes<br />hacías en tres apps.
            </h2>
          </div>

          <div className="lp-func">
            {FUNCIONES.map(({ Icon, color, titulo, texto }) => (
              <div key={titulo} className="feature-card" style={{
                padding: 26, borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 11,
                  background: `${color}16`, border: `1px solid ${color}33`,
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
                }}>
                  <Icon size={18} color={color} strokeWidth={1.8} />
                </div>
                <h3 style={{ fontFamily: DISP, fontSize: 18, color: INK0, margin: "0 0 9px", letterSpacing: "-0.01em", lineHeight: 1.25 }}>
                  {titulo}
                </h3>
                <p style={{ fontFamily: MONO, fontSize: 11.5, color: INK2, lineHeight: 1.85, margin: 0 }}>
                  {texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CONTRA EL GRUPO DE FACEBOOK ══ */}
      <section className="lp-seccion" style={{
        background: "rgba(46,230,193,0.02)",
        borderTop: "1px solid rgba(46,230,193,0.08)",
        borderBottom: "1px solid rgba(46,230,193,0.08)",
      }}>
        <div className="lp-wrap">
          <div style={{ marginBottom: 36, maxWidth: 680 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
              Comparado con lo de siempre
            </div>
            <h2 style={{ fontFamily: DISP, fontSize: "clamp(28px, 4.5vw, 46px)", color: INK0, margin: "0 0 14px", letterSpacing: "-0.02em", lineHeight: 1.08 }}>
              Sin &ldquo;te lo dejo en...&rdquo;,<br />sin capturas borrosas.
            </h2>
            <p style={{ fontFamily: MONO, fontSize: 12, color: INK2, margin: 0, lineHeight: 1.85 }}>
              El grupo de Facebook y el chat siguen sirviendo para hablar. Para todo lo
              demás se quedan cortos, y eso lo sabe cualquiera que haya intentado vender
              una carta ahí.
            </p>
          </div>

          <div className="lp-tabla-marco" style={{
            borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)", overflow: "hidden",
          }}>
            <table className="lp-tabla">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  <th style={{ fontFamily: MONO, fontSize: 9.5, color: INK2, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 400 }} />
                  {COMPARACION.columnas.map((c, i) => (
                    <th key={c} style={{
                      fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.12em",
                      textTransform: "uppercase", textAlign: "center",
                      color: i === 0 ? COURT : INK2, fontWeight: i === 0 ? 700 : 400,
                      whiteSpace: "nowrap",
                    }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARACION.filas.map(f => (
                  <tr key={f.que}>
                    <td style={{ fontFamily: MONO, fontSize: 11.5, color: INK1, lineHeight: 1.6 }}>
                      {f.que}
                    </td>
                    {f.valores.map((v, i) => (
                      <td key={i} style={{ textAlign: "center" }}>
                        {v
                          ? <Check size={15} color={i === 0 ? COURT : INK2} strokeWidth={2.4} style={{ display: "inline-block", verticalAlign: "middle" }} />
                          : <Minus size={14} color="rgba(255,255,255,0.16)" strokeWidth={2.2} style={{ display: "inline-block", verticalAlign: "middle" }} />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══ CÓMO EMPIEZA ══ */}
      <section className="lp-seccion">
        <div className="lp-wrap">
          <div style={{ marginBottom: 48, maxWidth: 560 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
              Cómo empieza
            </div>
            <h2 style={{ fontFamily: DISP, fontSize: "clamp(28px, 4.5vw, 46px)", color: INK0, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.08 }}>
              De cero a tu primera<br />carta publicada.
            </h2>
          </div>

          <div className="lp-pasos">
            {PASOS.map(p => (
              <div key={p.num} style={{
                padding: "22px 20px", borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)",
              }}>
                <span style={{
                  fontFamily: DISP, fontSize: 30, letterSpacing: "-0.03em",
                  color: "transparent", WebkitTextStroke: `1px ${COURT}66`,
                }}>
                  {p.num}
                </span>
                <h4 style={{ fontFamily: DISP, fontSize: 16, color: INK0, margin: "10px 0 8px" }}>
                  {p.titulo}
                </h4>
                <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, lineHeight: 1.8, margin: 0 }}>
                  {p.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CIERRE ══ */}
      <section className="lp-seccion" style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(46,230,193,0.10), transparent 70%)",
      }}>
        <div className="lp-wrap" style={{ textAlign: "center", maxWidth: 720 }}>
          <Tienda size={22} color={COURT} strokeWidth={1.6} />
          <h2 style={{ fontFamily: DISP, fontSize: "clamp(30px, 5vw, 52px)", color: INK0, margin: "18px 0 14px", letterSpacing: "-0.02em", lineHeight: 1.05 }}>
            ¿Cuánto vale tu binder?<br />
            <em style={{ fontStyle: "normal", background: `linear-gradient(135deg, ${COURT}, ${BALL})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Averígualo hoy.
            </em>
          </h2>
          <p style={{ fontFamily: MONO, fontSize: 12.5, color: INK2, lineHeight: 1.9, margin: "0 auto 30px", maxWidth: 520 }}>
            Registrar la primera carta toma menos de lo que llevas leyendo esta página.
            Y el gráfico arranca solo apenas la marques.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" className="cta-btn" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 38px", borderRadius: 12, background: `linear-gradient(90deg, ${COURT}, ${BALL})`, color: BG0, fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", boxShadow: `0 0 40px ${COURT}33` }}>
              Crear mi Facebinder →
            </Link>
            <Link href="/market" className="ghost-btn" style={{ display: "inline-flex", alignItems: "center", padding: "15px 28px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", color: INK2, fontFamily: MONO, fontSize: 13, letterSpacing: "0.08em", textDecoration: "none" }}>
              Mirar sin cuenta →
            </Link>
          </div>
          <p style={{ fontFamily: MONO, fontSize: 10.5, color: INK2, margin: "26px 0 0", letterSpacing: "0.06em" }}>
            Hecho en Colombia, por alguien que también cuenta las que le faltan.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
