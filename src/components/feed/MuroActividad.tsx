"use client";

/**
 * El muro de actividad: qué pusieron en venta y qué quiere conseguir la gente.
 *
 * Cada movimiento se muestra como una publicación y se puede comentar debajo,
 * que es lo que lo vuelve una conversación y no un registro. Trae diez y, al
 * llegar al final, diez más.
 *
 * El color dice de qué se trata sin leer: verde para lo que está en venta,
 * amarillo para lo que alguien busca.
 *
 * Quien agrega veinte cartas a su wishlist de un saque genera una sola
 * publicación —la base las agrupa por persona y minuto— porque veinte
 * publicaciones idénticas tapaban el muro entero. Las otras se despliegan
 * tocando "y N más".
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDashboardUser } from "@/app/dashboard/DashboardUserContext";
import { SET_CARDS, loadManySets } from "@/data/pokemon-cards";
import { fotoChica } from "@/lib/foto-carta";
import { formatPrice, CURRENCY_SYMBOL } from "@/lib/currency";
import { ESTILOS_MURO } from "./estilos";
import { Activity, Store, BookSearch, MessageCircle, Send, X } from "lucide-react";

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";

const DE_A = 10;
const COMENTARIO_MAX = 600;

interface Evento {
  id: string;
  tipo: "venta" | "wishlist";
  user_id: string;
  username: string;
  photo_url: string | null;
  card_id: string;
  set_id: string;
  version: string | null;
  precio: number | null;
  moneda: string | null;
  acompanan: number;
  created_at: string;
}

interface Comentario {
  id: string;
  evento_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

interface CartaTanda {
  card_id: string;
  set_id: string;
  version: string | null;
  precio: number | null;
}

export function MuroActividad() {
  const { userId } = useDashboardUser();

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [comentarios, setComentarios] = useState<Record<string, Comentario[]>>({});
  const [abierto, setAbierto] = useState<string | null>(null);
  const [quedan, setQuedan] = useState(true);
  const [primera, setPrimera] = useState(true);
  /** La foto que se está mirando en grande, o nada. */
  const [mirando, setMirando] = useState<string | null>(null);
  /* Sube de a uno cuando terminan de llegar los sets: sin esto las miniaturas
     quedarían vacías, porque `SET_CARDS` se llena fuera de React. */
  const [, setSetsListos] = useState(0);

  const fondo = useRef<HTMLDivElement>(null);
  const pidiendo = useRef(false);
  const ultima = useRef<string | null>(null);

  const traer = useCallback(async () => {
    if (pidiendo.current) return;
    pidiendo.current = true;

    const supabase = createClient();
    const { data } = await supabase.rpc("feed_actividad", {
      limite: DE_A,
      antes: ultima.current,
    });
    const llegaron = (data ?? []) as Evento[];

    if (llegaron.length) {
      ultima.current = llegaron[llegaron.length - 1].created_at;
      setEventos((antes) => [...antes, ...llegaron]);

      /* Los sets, antes de pintar, para que las miniaturas no salgan vacías. */
      loadManySets([...new Set(llegaron.map((e) => e.set_id))])
        .then(() => setSetsListos((n) => n + 1))
        .catch(() => { /* sin metadata se pinta el hueco */ });

      const { data: coms } = await supabase
        .from("feed_comments")
        .select("id, evento_id, user_id, body, created_at")
        .in("evento_id", llegaron.map((e) => e.id))
        .order("created_at");

      if (coms?.length) {
        const porEvento: Record<string, Comentario[]> = {};
        for (const c of coms as Comentario[]) (porEvento[c.evento_id] ??= []).push(c);
        setComentarios((antes) => ({ ...antes, ...porEvento }));
      }
    }
    if (llegaron.length < DE_A) setQuedan(false);
    setPrimera(false);
    pidiendo.current = false;
  }, []);

  useEffect(() => {
    const centinela = fondo.current;
    if (!centinela) return;
    const ojo = new IntersectionObserver((entradas) => {
      if (entradas[0].isIntersecting) traer();
    }, { rootMargin: "220px" });
    ojo.observe(centinela);
    return () => ojo.disconnect();
  }, [traer]);

  const comentar = async (evento: Evento, texto: string) => {
    if (!userId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("feed_comments")
      .insert({ evento_tipo: evento.tipo, evento_id: evento.id, user_id: userId, body: texto })
      .select("id, evento_id, user_id, body, created_at")
      .single();
    if (error || !data) return;
    setComentarios((antes) => ({
      ...antes,
      [evento.id]: [...(antes[evento.id] ?? []), data as Comentario],
    }));
  };

  return (
    <section className="mu-caja">
      <header className="mu-cabeza">
        <Activity size={14} color={LIME} strokeWidth={1.8} />
        <h2 className="mu-titulo">Qué está pasando</h2>
        <Link href="/dashboard/market" className="mu-vertodo">Al market →</Link>
      </header>

      <div className="mu-lista">
        {eventos.map((e) => (
          <Publicacion
            key={`${e.tipo}-${e.id}`}
            evento={e}
            comentarios={comentarios[e.id] ?? []}
            abierto={abierto === e.id}
            puedeComentar={Boolean(userId)}
            onAbrir={() => setAbierto(abierto === e.id ? null : e.id)}
            onComentar={(texto) => comentar(e, texto)}
            onMirar={setMirando}
          />
        ))}

        {primera && [0, 1, 2].map((i) => (
          <div key={i} className="mu-hueco" style={{ height: 190, animationDelay: `${i * 0.12}s` }} />
        ))}

        {!primera && eventos.length === 0 && (
          <p className="mu-vacio">Todavía no hay movimiento. Publica una carta y aparecerá acá.</p>
        )}

        <div ref={fondo} style={{ height: 1 }} />

        {!quedan && eventos.length > 0 && <p className="mu-fin">No hay más movimiento</p>}
      </div>

      {/* La carta en grande, encima de todo */}
      {mirando && (
        <div className="ma-visor" onClick={() => setMirando(null)} role="dialog" aria-label="Carta ampliada">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mirando} alt="" />
          <button className="ma-cerrar" aria-label="Cerrar"><X size={20} /></button>
        </div>
      )}

      <style>{ESTILOS_MURO + ESTILOS}</style>
    </section>
  );
}

/* ── Una publicación ────────────────────────────────────────────────────── */

function Publicacion({ evento, comentarios, abierto, puedeComentar, onAbrir, onComentar, onMirar }: {
  evento: Evento;
  comentarios: Comentario[];
  abierto: boolean;
  puedeComentar: boolean;
  onAbrir: () => void;
  onComentar: (texto: string) => void;
  onMirar: (url: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [tanda, setTanda] = useState<CartaTanda[] | null>(null);
  const [cargandoTanda, setCargandoTanda] = useState(false);

  const carta = buscarCarta(evento.set_id, evento.card_id, evento.version);
  const nombre = carta?.name?.trim() || String(evento.card_id).split(":")[1] || "Una carta";
  const esVenta = evento.tipo === "venta";

  const enviar = async () => {
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    await onComentar(limpio);
    setTexto("");
    setEnviando(false);
  };

  /** Las otras cartas de la misma tanda, solo cuando alguien las pide. */
  const verTanda = async () => {
    if (tanda) { setTanda(null); return; }
    setCargandoTanda(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("feed_tanda", { p_tipo: evento.tipo, p_id: evento.id });
    const cartas = (data ?? []) as CartaTanda[];
    await loadManySets([...new Set(cartas.map((c) => c.set_id))]).catch(() => {});
    setTanda(cartas);
    setCargandoTanda(false);
  };

  return (
    <article className={"ma-post " + (esVenta ? "venta" : "busca")}>
      <header className="ma-firma">
        <Link href={`/${evento.username}`} className="ma-autor">
          {evento.photo_url
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={evento.photo_url} alt="" loading="lazy" className="ma-avatar" />
            : <span className="ma-avatar ma-inicial">{evento.username.charAt(0).toUpperCase()}</span>}
          <span className="ma-nombre">{evento.username}</span>
        </Link>
        <span className="ma-que">
          {esVenta ? <Store size={11} /> : <BookSearch size={11} />}
          {esVenta ? "puso en venta" : "quiere conseguir"}
        </span>
        <time className="ma-cuando" dateTime={evento.created_at}>{haceCuanto(evento.created_at)}</time>
      </header>

      <div className="ma-cuerpo">
        {carta?.image
          ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={fotoChica(carta.image)}
              alt=""
              loading="lazy"
              decoding="async"
              className="ma-carta"
              onClick={() => onMirar(carta.image)}
              title="Ver en grande"
            />
          )
          : <span className="ma-carta ma-sinfoto" />}

        <div style={{ minWidth: 0 }}>
          <p className="ma-carta-nombre">{nombre}</p>
          <p className="ma-carta-set">{evento.version ?? carta?.version ?? ""}</p>

          {esVenta && evento.precio !== null && (
            <p className="ma-precio">
              {CURRENCY_SYMBOL[evento.moneda ?? "COP"] ?? "$"}
              {formatPrice(evento.precio, evento.moneda ?? "COP")}
            </p>
          )}

          {evento.acompanan > 0 && (
            <button className="ma-mas" onClick={verTanda} disabled={cargandoTanda}>
              {cargandoTanda ? "abriendo…" : tanda ? "ocultar" : `y ${evento.acompanan} más`}
            </button>
          )}
        </div>
      </div>

      {/* Las demás de la tanda, en una fila que se desliza */}
      {tanda && tanda.length > 0 && (
        <div className="ma-tanda">
          {tanda.map((c, i) => {
            const otra = buscarCarta(c.set_id, c.card_id, c.version);
            if (!otra?.image) return null;
            return (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={`${c.card_id}-${i}`}
                src={fotoChica(otra.image)}
                alt=""
                loading="lazy"
                decoding="async"
                onClick={() => onMirar(otra.image)}
                title={otra.name ?? ""}
              />
            );
          })}
        </div>
      )}

      <footer className="ma-pie">
        <button className="ma-comentar" onClick={onAbrir}>
          <MessageCircle size={12} />
          {comentarios.length > 0 ? `${comentarios.length}` : "Comentar"}
        </button>
      </footer>

      {abierto && (
        <div className="ma-hilo">
          {comentarios.map((c) => (
            <p key={c.id} className="ma-comentario">{c.body}</p>
          ))}

          {puedeComentar ? (
            <div className="ma-escribir">
              <input
                value={texto}
                maxLength={COMENTARIO_MAX}
                onChange={(ev) => setTexto(ev.target.value)}
                onKeyDown={(ev) => { if (ev.key === "Enter") enviar(); }}
                placeholder="Escribe algo…"
                className="ma-campo"
              />
              <button onClick={enviar} disabled={!texto.trim() || enviando} className="ma-enviar" aria-label="Enviar">
                <Send size={13} />
              </button>
            </div>
          ) : (
            <p className="ma-comentario" style={{ color: INK2 }}>Entra con tu cuenta para comentar.</p>
          )}
        </div>
      )}
    </article>
  );
}

/* ── Ayudas ─────────────────────────────────────────────────────────────── */

/**
 * Los anuncios viejos guardan solo el número de carta; los nuevos, el id
 * completo "NNN:Nombre:Versión". Se prueban los dos.
 */
function buscarCarta(setId: string, cardId: string, version: string | null) {
  const pool = SET_CARDS[setId] ?? [];
  return pool.find((c) => String(c.id) === String(cardId))
    ?? pool.find((c) => String(c.card_number) === String(cardId) && c.version === version)
    ?? pool.find((c) => String(c.card_number) === String(cardId));
}

/** "hace 3 h", "ayer", "12 sept" — lo justo para ubicarse sin leer una fecha. */
function haceCuanto(cuando: string): string {
  const minutos = Math.floor((Date.now() - new Date(cuando).getTime()) / 60000);
  if (minutos < 1)  return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24)   return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1)   return "ayer";
  if (dias < 7)     return `hace ${dias} días`;
  return new Date(cuando).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

const ESTILOS = `
  /* El color dice de qué se trata antes de leer nada: verde lo que está en
     venta, amarillo lo que alguien busca. */
  .ma-post { border: 1px solid rgba(255,255,255,0.06); border-left-width: 3px;
    border-radius: 12px; background: rgba(255,255,255,0.02); padding: 12px 13px;
    flex-shrink: 0; }
  .ma-post.venta { border-left-color: ${COURT}; }
  .ma-post.busca { border-left-color: ${LIME}; }
  .ma-post.venta .ma-que { color: ${COURT}; }
  .ma-post.busca .ma-que { color: ${LIME}; }

  .ma-firma { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .ma-autor { display: inline-flex; align-items: center; gap: 7px; text-decoration: none; }
  .ma-avatar { width: 22px; height: 22px; border-radius: 50%; object-fit: cover;
    border: 1px solid rgba(255,255,255,0.12); flex-shrink: 0; }
  .ma-inicial { display: flex; align-items: center; justify-content: center;
    background: rgba(46,230,193,0.12); color: ${COURT};
    font-family: ${DISP}; font-size: 10px; font-weight: 700; }
  .ma-nombre { font-family: ${MONO}; font-size: 11px; color: ${INK0}; }

  .ma-que { display: inline-flex; align-items: center; gap: 5px;
    font-family: ${MONO}; font-size: 9px; letter-spacing: 0.08em;
    text-transform: uppercase; }
  .ma-cuando { margin-left: auto; font-family: ${MONO}; font-size: 9px; color: ${INK2}; }

  /* La carta, tres veces más grande que antes: es lo que se viene a mirar. */
  .ma-cuerpo { display: flex; gap: 14px; align-items: center; margin-top: 11px; }
  .ma-carta { width: 126px; aspect-ratio: 5 / 7; object-fit: contain; border-radius: 8px;
    flex-shrink: 0; cursor: zoom-in; transition: transform 0.15s; }
  .ma-carta:hover { transform: scale(1.03); }
  .ma-sinfoto { background: rgba(255,255,255,0.05); display: block; cursor: default; }

  .ma-carta-nombre { font-family: ${MONO}; font-size: 13px; color: ${INK0}; margin: 0;
    line-height: 1.4; }
  .ma-carta-set { font-family: ${MONO}; font-size: 10px; color: ${INK2}; margin: 4px 0 0; }
  .ma-precio { font-family: ${DISP}; font-size: 18px; color: ${COURT}; margin: 7px 0 0; }

  .ma-mas { margin-top: 9px; cursor: pointer; background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.14); border-radius: 999px; padding: 5px 11px;
    font-family: ${MONO}; font-size: 9.5px; color: ${INK1}; transition: all 0.15s; }
  .ma-mas:hover { border-color: ${LIME}; color: ${LIME}; }
  .ma-mas:disabled { opacity: 0.5; cursor: default; }

  /* Las demás de la tanda: una fila que se arrastra con el dedo. */
  .ma-tanda { display: flex; gap: 8px; margin-top: 11px; overflow-x: auto;
    padding-bottom: 6px; scroll-snap-type: x proximity; }
  .ma-tanda img { width: 74px; aspect-ratio: 5 / 7; object-fit: contain; border-radius: 6px;
    flex-shrink: 0; cursor: zoom-in; scroll-snap-align: start; }
  .ma-tanda::-webkit-scrollbar { height: 5px; }
  .ma-tanda::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }

  .ma-pie { margin-top: 10px; }
  .ma-comentar { display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
    background: none; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px;
    padding: 5px 11px; font-family: ${MONO}; font-size: 9.5px; color: ${INK2};
    transition: all 0.15s; }
  .ma-comentar:hover { border-color: ${COURT}; color: ${COURT}; }

  .ma-hilo { margin-top: 10px; padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex; flex-direction: column; gap: 7px; }
  .ma-comentario { font-family: ${MONO}; font-size: 10.5px; color: ${INK1}; margin: 0;
    line-height: 1.6; background: rgba(255,255,255,0.03); border-radius: 8px;
    padding: 7px 9px; word-break: break-word; }

  .ma-escribir { display: flex; gap: 7px; }
  .ma-campo { flex: 1; min-width: 0; background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 10px;
    color: ${INK0}; font-family: ${MONO}; font-size: 10.5px; }
  .ma-campo:focus { outline: none; border-color: ${COURT}; }
  .ma-enviar { display: flex; align-items: center; justify-content: center; cursor: pointer;
    background: ${COURT}; border: 0; border-radius: 8px; padding: 0 11px; color: #05070d; }
  .ma-enviar:disabled { opacity: 0.4; cursor: default; }

  /* La carta en grande: ocupa la pantalla y se cierra tocando en cualquier lado. */
  .ma-visor { position: fixed; inset: 0; z-index: 1000; background: rgba(5,7,13,0.92);
    display: flex; align-items: center; justify-content: center; padding: 24px;
    cursor: zoom-out; animation: ma-asoma 160ms ease-out; }
  .ma-visor img { max-width: min(92vw, 520px); max-height: 92vh; border-radius: 12px;
    object-fit: contain; }
  .ma-cerrar { position: absolute; top: 18px; right: 18px; background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.18); border-radius: 50%; width: 38px; height: 38px;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    color: ${INK0}; }
  @keyframes ma-asoma { from { opacity: 0 } to { opacity: 1 } }

  @media (max-width: 767px), (pointer: coarse) {
    .ma-carta { width: 100px; }
    .ma-tanda img { width: 62px; }
  }
`;
