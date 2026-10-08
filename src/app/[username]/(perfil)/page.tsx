import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Star, Package, Layers, Trophy, Heart, Tag, TrendingUp, Sparkles, MapPin,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { nivelDe, NIVEL_NOMBRE } from "@/data/logros";
import { slugifySetName } from "@/lib/slug";
import { ProfilePortfolioChart } from "@/components/PortfolioChart";
import { Panel, Vacio } from "@/components/perfil/Panel";
import { Insignia } from "@/components/perfil/Insignia";
import { CarruselDestacadas, MiniGrillaCartas, ResenasMini } from "@/components/perfil/PanelesCartas";
import { COURT, GOLD, VIOLET, MAGENTA, BALL, CYAN, INK0, INK1, INK2, MONO, INNER_BORDER } from "@/components/perfil/tokens";
import { traerPerfil } from "./datos";
import { IgualarAltos } from "@/components/perfil/IgualarAltos";

export const revalidate = 300;
export const dynamicParams = true;

const SETS = new Map(POKEMON_SERIES.flatMap(s => s.sets).map(s => [s.id, s]));

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const perfil = await traerPerfil(username);
  if (!perfil) notFound();
  const nombre = perfil.jugador.nombre;
  const title = `${nombre} (@${perfil.jugador.username}) · FaceBinder`;
  const description = `Colección, decks, cartas en venta y reseñas de ${nombre} en FaceBinder, la comunidad de coleccionistas de Pokémon TCG.`;
  return {
    title, description,
    openGraph: { title, description, url: `https://facebinder.com/${username}`, images: [{ url: "/og-brand.png", width: 1200, height: 1200, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og-brand.png"] },
  };
}

const txt: React.CSSProperties = { margin: 0, fontFamily: MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

export default async function ResumenPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const perfil = await traerPerfil(username);
  if (!perfil) notFound();

  const { jugador: j, esDueno } = perfil;
  const base = `/${j.username}`;
  const supabase = await createClient();

  // Solo lo que se ve en el Resumen: cada bloque trae su tope.
  const [{ data: destacadas }, { data: deseos }, { data: enVenta }, { data: decks }] = await Promise.all([
    supabase.from("featured_cards").select("card_id, set_id").eq("user_id", j.userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("card_wishlist").select("card_id, set_id").eq("user_id", j.userId).order("created_at", { ascending: false }).limit(12),
    supabase.from("market_listings").select("card_id, set_id, version, price_cop, currency").eq("user_id", j.userId).eq("status", "active").order("created_at", { ascending: false }).limit(12),
    supabase.from("decks").select("id, name, cover_card_image, deck_cards(needed)").eq("user_id", j.userId).eq("is_public", true).order("created_at", { ascending: false }).limit(4),
  ]);

  const colecciones = perfil.sets;
  const ganados = perfil.logros.filter(l => l.ganado).sort((a, b) => b.logro.orden - a.logro.orden);
  const esTienda = j.tipoPerfil === "Tienda Pokémon";


  return (
    <div className="pf-resumen">
      <IgualarAltos contenedor=".pf-resumen" />
      <style>{`
        /* Logros, Wishlist, Decks públicos y Cartas en venta miden lo mismo: el
           alto del más alto (IgualarAltos), tengan cartas o estén vacíos.
           Solo con columnas: apilados en el celular no hace falta. */
        .pf-igual { display: flex; flex-direction: column; }
        .pf-igual > .pf-panel-cuerpo { flex: 1; display: flex; flex-direction: column; justify-content: center; }
        .pf-igual .pf-vacio { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        @media (min-width: 1024px) and (pointer: fine) {
          .pf-igual { min-height: var(--pf-alto, auto); }
        }
        /* Con tres columnas, el último panel de cada lado (Inventario y Reseñas)
           se estira hasta la misma línea en que termina el portafolio. */
        @media (min-width: 1241px) and (pointer: fine) {
          .pf-resumen.pf-resumen { align-items: stretch; }
          .pf-estira { flex: 1; display: flex; flex-direction: column; }
          .pf-estira > .pf-panel { flex: 1; display: flex; flex-direction: column; }
          .pf-estira .pf-panel-cuerpo { flex: 1; display: flex; flex-direction: column; }
          .pf-estira .pf-vacio { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
          /* Los sets del panel Inventario crecen hasta llenar el alto estirado:
             nada de hueco vacío abajo. Con 4 sets o menos van en 2 columnas,
             para que un perfil con pocos sets los muestre grandes (ver abajo). */
          /* Siempre 2 columnas aquí: los logos de los sets son anchos, y en 4
             columnas los recuadros quedaban angostos y altos con el logo diminuto. */
          .pf-estira .pf-colecciones { flex: 1; min-height: 0; grid-auto-rows: 1fr; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          /* Más de 6 sets: el panel no crece. Se ven 3 filas del alto disponible
             y el resto se recorre con scroll dentro del panel. */
          /* La caja ocupa el alto que queda en el panel; con scroll, la lista va
             encima de ella (absoluta) y así no puede estirar el panel. */
          .pf-estira .pf-colecciones-caja { flex: 1; display: flex; flex-direction: column; position: relative; min-height: 300px; }
          .pf-estira .pf-colecciones.con-scroll {
            position: absolute; inset: 0 -6px 0 0; padding-right: 6px;
            grid-auto-rows: calc((100% - 24px) / 3); overflow-y: auto; overscroll-behavior: contain;
          }
          .pf-estira .pf-set-logo { min-height: 44px !important; position: relative; }
          /* El logo se acomoda al espacio que le toca, sin empujar el alto de la fila */
          .pf-estira .pf-set-logo img { position: absolute; inset: 10px; width: calc(100% - 20px) !important; height: calc(100% - 20px) !important; }
          /* En el computador estirado se ven todos (con scroll); en el celular, 8 */
          .pf-estira .pf-set-tile:nth-child(n+9) { display: flex; }
          .pf-estira .pf-set-tile { display: flex; flex-direction: column; min-height: 0; }
          .pf-estira .pf-set-logo { aspect-ratio: auto; flex: 1; min-height: 72px; padding: 12px !important; }
        }
        .pf-resumen { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.22fr) minmax(0, 1fr); gap: 16px; align-items: start; }
        .pf-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
        @media (max-width: 1240px) {
          .pf-resumen { grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); }
          .pf-col-der { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        }
        /* Celular y tableta: una sola columna. Las columnas se disuelven
           (display: contents) y el orden lo ponen las clases pf-oN:
           Ubicación (tiendas), Cartas destacadas, Logros, Portafolio, Wishlist,
           Cartas en venta, Reseñas, Inventario y Decks.
           align-items: stretch es obligatorio: la grilla de escritorio usa
           "start" y, heredado al pasar a flex, cada panel medía lo que su
           contenido; la fila de la Wishlist (que pone todas sus cartas en
           línea) se estiraba a 1.340 px y desbordaba el celular. */
        @media (max-width: 1023px), (pointer: coarse) {
          .pf-resumen { display: flex; flex-direction: column; align-items: stretch; gap: 14px; }
          .pf-col, .pf-col-der { display: contents; }
          .pf-resumen [class*="pf-o"] { min-width: 0; }
          .pf-o1 { order: 1 } .pf-o2 { order: 2 } .pf-o3 { order: 3 } .pf-o4 { order: 4 } .pf-o5 { order: 5 }
          .pf-o6 { order: 6 } .pf-o7 { order: 7 } .pf-o8 { order: 8 } .pf-o9 { order: 9 }
        }
        .pf-colecciones { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px 12px; }
        .pf-set-logo { aspect-ratio: 1; }
        .pf-set-tile:nth-child(n+9) { display: none; }
        .pf-decks { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .pf-logros { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
        @media (max-width: 767px) {
          .pf-colecciones { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 10px; }
          /* Los logos de set son apaisados: en dos columnas una caja cuadrada
             dejaba cuatro filas altísimas y casi vacías. */
          .pf-set-logo { aspect-ratio: 16 / 10; }
          /* Tres por fila y la última fila centrada, en vez de colgada a la izquierda */
          .pf-logros { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px 8px; }
          .pf-logros > * { flex: 0 0 calc((100% - 16px) / 3); }
          .pf-logros-total { text-align: center; }
        }
        /* Las portadas de los decks miden lo mismo que las cartas de la Wishlist:
           4 por fila y 3 en el celular, con el mismo espacio entre ellas. */
        @media (max-width: 480px) {
          .pf-decks { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
      `}</style>

      {/* ══ Columna izquierda ══ */}
      <div className="pf-col">
        {esTienda && j.direccion && (
          <div className="pf-o1">
            <Panel icon={MapPin} color={COURT} titulo="Ubicación">
              <p style={{ margin: 0, fontFamily: MONO, fontSize: 11, color: INK1, lineHeight: 1.6 }}>{j.direccion}</p>
              {j.mapsUrl && (
                <a href={j.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 10, fontFamily: MONO, fontSize: 10.5, color: COURT }}>Ver en el mapa</a>
              )}
            </Panel>
          </div>
        )}



        <div className="pf-o3">
          <Panel icon={Trophy} color={GOLD} titulo="Logros" verTodas={`${base}/logros`} alto="igual">
            {ganados.length === 0 ? (
              <Vacio icon={Trophy} color={GOLD} texto={esDueno ? "Registra tu primera carta para ganar tu primer logro." : "Todavía no tiene logros."} />
            ) : (
              <div className="pf-logros">
                {ganados.slice(0, 5).map(({ logro }) => (
                  <div key={logro.id} title={`${logro.nombre}: ${logro.descripcion}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0, textAlign: "center" }}>
                    <Insignia logro={logro} ganado size={50} />
                    <p style={{ ...txt, maxWidth: "100%", fontSize: 10, fontWeight: 600, color: INK0 }}>{logro.nombre}</p>
                    <p style={{ ...txt, maxWidth: "100%", fontSize: 9, color: INK2 }}>{NIVEL_NOMBRE[nivelDe(logro.orden)]}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="pf-logros-total" style={{ margin: "12px 0 0", fontFamily: MONO, fontSize: 10, color: INK2 }}>{ganados.length} de 100 logros</p>
          </Panel>
        </div>

        <div className="pf-o9">
          <Panel icon={Layers} color={VIOLET} titulo="Decks públicos" verTodas={`${base}/decks`} alto="igual">
            {!decks?.length ? (
              <Vacio icon={Layers} color={VIOLET} texto={esDueno ? "Arma un deck y márcalo como público para mostrarlo aquí." : "No tiene decks públicos."} />
            ) : (
              <div className="pf-decks">
                {decks.map(d => {
                  const cartas = ((d.deck_cards ?? []) as { needed: number }[]).reduce((s, c) => s + (c.needed ?? 0), 0);
                  return (
                    <Link key={d.id} href={`${base}/deck/${slugifySetName(d.name)}`} style={{ textDecoration: "none", minWidth: 0 }}>
                      <div style={{ aspectRatio: "5 / 7", borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.04)", border: INNER_BORDER }}>
                        {d.cover_card_image && <img src={d.cover_card_image} alt={d.name} loading="lazy" decoding="async" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />}
                      </div>
                      <p style={{ ...txt, marginTop: 6, fontSize: 10.5, fontWeight: 600, color: INK0 }}>{d.name}</p>
                      <p style={{ ...txt, fontSize: 9.5, color: COURT }}>{cartas} cartas</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        <div className="pf-o8 pf-estira">
          <Panel icon={Package} color={VIOLET} titulo="Inventario" verTodas={`${base}/inventario`}>
            {colecciones.length === 0 ? (
              <Vacio icon={Package} color={VIOLET} texto={esDueno ? "Registra cartas en tu inventario para ver aquí tu progreso por set." : "Aún no tiene cartas registradas."} />
            ) : (
              <div className="pf-colecciones-caja">
                <div className={`pf-colecciones fb-scroll${colecciones.length <= 4 ? " pocas" : ""}${colecciones.length > 6 ? " con-scroll" : ""}`}>
                  {colecciones.map(s => {
                    const set = SETS.get(s.setId);
                    return (
                      <Link key={s.setId} href={`${base}/inventario`} scroll={false} className="pf-set-tile" style={{ textDecoration: "none", minWidth: 0 }}>
                        <div className="pf-set-logo" style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "radial-gradient(ellipse at 50% 30%, rgba(167,139,250,0.14), rgba(255,255,255,0.02))", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
                          {set?.logo && <img src={set.logo} alt={set.name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
                        </div>
                        <p style={{ ...txt, marginTop: 8, fontSize: 11, fontWeight: 600, color: INK0 }}>{set?.name ?? s.setId}</p>
                        <p style={{ ...txt, fontSize: 10, color: INK2 }}>{s.unique} / {s.total}</p>
                        <div style={{ height: 2, marginTop: 5, borderRadius: 2, background: "rgba(255,255,255,0.08)" }}>
                          <div style={{ width: `${Math.min(100, (s.unique / s.total) * 100)}%`, height: "100%", borderRadius: 2, background: VIOLET }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
                </div>
            )}
          </Panel>
        </div>
      </div>

      {/* ══ Columna central ══ */}
      <div className="pf-col">
        <div className="pf-o2">
          <Panel icon={Star} color={GOLD} titulo="Cartas destacadas" verTodas={`${base}/inventario`}>
            {!destacadas?.length ? (
              <Vacio icon={Sparkles} color={GOLD} texto={esDueno ? "Abre una carta de tu inventario y márcala como destacada para lucirla aquí." : "Todavía no destacó cartas."} />
            ) : (
              <CarruselDestacadas refs={destacadas} />
            )}
          </Panel>
        </div>

        <div className="pf-o4">
          <Panel icon={TrendingUp} color={CYAN} titulo="Valor estimado del portafolio">
            <ProfilePortfolioChart userId={j.userId} cardCount={perfil.metricas.cartas_total} sinTitulo valorInicial={perfil.valorActual} miniEnCelular />
          </Panel>
        </div>
      </div>

      {/* ══ Columna derecha ══ */}
      <div className="pf-col pf-col-der">

        <div className="pf-o5">
          <Panel icon={Heart} color={MAGENTA} titulo="Wishlist" verTodas={`${base}/wishlist`} alto="igual">
            {!deseos?.length ? (
              <Vacio icon={Heart} color={MAGENTA} texto={esDueno ? "Marca como 'Buscando' las cartas que te faltan y aparecen aquí." : "Su wishlist está vacía."} />
            ) : (
              <MiniGrillaCartas refs={deseos} modo="wishlist" href={`${base}/wishlist`} />
            )}
          </Panel>
        </div>

        <div className="pf-o6">
          <Panel icon={Tag} color={BALL} titulo="Cartas en venta" verTodas={`${base}/market`} alto="igual">
            {!enVenta?.length ? (
              <Vacio icon={Tag} color={BALL} texto={esDueno ? "Abre una carta de tu inventario y usa Vender para publicarla." : "No tiene cartas en venta ahora."} />
            ) : (
              <MiniGrillaCartas refs={enVenta} modo="venta" href={`${base}/market`} />
            )}
          </Panel>
        </div>

        <div className="pf-o7 pf-estira">
          <Panel icon={Star} color={GOLD} titulo="Reseñas" verTodas={`${base}/resenas`}>
            <ResenasMini vendedorId={j.userId} vacio={
              <Vacio icon={Star} color={GOLD} texto={esDueno ? "Aquí salen las ventas que te confirmen y las referencias que te dejen otros usuarios." : "Todavía no tiene reseñas. Si ya negociaste con este usuario, déjale una referencia."} />
            } />
          </Panel>
        </div>
      </div>
    </div>
  );
}
