"use client";

/**
 * "Higher Or Lower" — el minijuego de la sección Interactivo.
 *
 * Dos cartas al azar, diez segundos para señalar la más cara. Se acierta y
 * sigue; se falla, se acaba el tiempo o se cambia de pestaña, y termina. El
 * puntaje son las rondas acertadas de corrido, y queda guardado en la base.
 *
 * Las rondas llegan todas juntas al empezar, no de a una: con el reloj corriendo
 * en el navegador, esperar al servidor entre ronda y ronda le comería tiempo al
 * jugador. Los precios viajan con ellas, así que alguien decidido puede mirarlos
 * en las herramientas del navegador. Es un juego de sala de espera, no un
 * torneo: se prefirió que responda al instante antes que blindarlo.
 *
 * Ninguna carta llega a la pantalla sin que su foto esté bajada y entera. Unas
 * pocas del catálogo no tienen imagen en el bucket, y una ronda con un cuadro
 * roto es una ronda perdida por culpa nuestra.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Play, Timer, Trophy, RotateCcw, Medal, Volume2, VolumeX } from "lucide-react";
import { musica, interruptor, registrarPistas } from "./musica";

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const CRIT  = "#ff5d5d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";

const FOTOS = "https://pub-01b8e296fe944e688fd2100376d4af4a.r2.dev/pokemon";

/** Lo que dura una ronda. */
const SEGUNDOS = 10;
/** Se piden de más: la base descarta empates y la precarga descarta fotos rotas. */
const RONDAS_PEDIDAS = 30;
/** Con menos que esto no vale la pena arrancar: se pide otra tanda. */
const RONDAS_MINIMAS = 8;

interface Carta { id: string; precio: number }
type Ronda = Carta[];

export interface Puesto {
  username: string;
  photo_url: string | null;
  score: number;
  created_at: string;
}

type Fase = "inicio" | "cargando" | "jugando" | "fin";
type Motivo = "fallo" | "tiempo" | "abandono";

export function MasCara({ rankingInicial }: { rankingInicial: Puesto[] }) {
  const [fase, setFase] = useState<Fase>("inicio");
  const [rondas, setRondas] = useState<Ronda[]>([]);
  const [indice, setIndice] = useState(0);
  const [puntaje, setPuntaje] = useState(0);
  const [restante, setRestante] = useState(SEGUNDOS);
  const [elegida, setElegida] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<Motivo | null>(null);
  const [avance, setAvance] = useState(0);
  /* Si el navegador rechaza la reproducción, se dice; antes fallaba callado. */
  const [sonidoBloqueado, setSonidoBloqueado] = useState(false);
  const [ranking, setRanking] = useState<Puesto[]>(rankingInicial);
  /* El sonido no es estado del componente sino una preferencia guardada en el
     navegador: React se suscribe a ella en vez de copiarla con un efecto. */
  const sonido = useSyncExternalStore(
    interruptor.subscribe, interruptor.leer, interruptor.leerEnServidor);

  /* El reloj vive en refs: si estuviera en el estado, cada tic volvería a
     dibujar las cartas. Las otras dos le dan a los oyentes del navegador el
     estado del momento sin tener que volver a suscribirse en cada ronda. */
  const reloj      = useRef<ReturnType<typeof setInterval> | null>(null);
  const jugandoRef = useRef(false);
  const puntajeRef = useRef(0);
  const pistaBatalla = useRef<HTMLAudioElement>(null);
  const pistaDerrota = useRef<HTMLAudioElement>(null);

  const pararReloj = () => {
    if (reloj.current) clearInterval(reloj.current);
    reloj.current = null;
  };


  useEffect(() => {
    registrarPistas(pistaBatalla.current, pistaDerrota.current);
    return () => { pararReloj(); musica.silencio(); };
  }, []);


  const cambiarSonido = () => {
    const nuevo = !sonido;
    interruptor.cambiar(nuevo);
    if (!nuevo) { musica.silencio(); return; }
    /* Tocar el botón es un gesto tan válido como "Empezar": sirve para
       recuperar el permiso si el navegador lo había negado. */
    musica.despertar(true).then((sono) => setSonidoBloqueado(!sono));
  };

  /* ── Terminar ─────────────────────────────────────────────────────────── */

  const terminar = useCallback(async (razon: Motivo, puntos: number) => {
    pararReloj();
    jugandoRef.current = false;
    musica.derrota(interruptor.leer());
    setMotivo(razon);
    setFase("fin");

    /* Un cero no es una marca: no ensucia el ranking de nadie. */
    if (puntos === 0) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("game_scores").insert({ user_id: user.id, score: puntos });
    const { data } = await supabase.rpc("juego_ranking", { limite: 10 });
    setRanking((data ?? []) as Puesto[]);
  }, []);

  /* ── Irse de la pestaña es abandonar ──────────────────────────────────── */

  useEffect(() => {
    const vigilar = () => {
      if (document.hidden && jugandoRef.current) terminar("abandono", puntajeRef.current);
    };
    document.addEventListener("visibilitychange", vigilar);
    /* En el celular, cambiar de app no siempre dispara lo de arriba. */
    window.addEventListener("blur", vigilar);
    return () => {
      document.removeEventListener("visibilitychange", vigilar);
      window.removeEventListener("blur", vigilar);
    };
  }, [terminar]);

  /* ── El reloj de la ronda ─────────────────────────────────────────────── */

  const arrancarReloj = useCallback((puntosActuales: number) => {
    pararReloj();
    setRestante(SEGUNDOS);
    const fin = Date.now() + SEGUNDOS * 1000;
    reloj.current = setInterval(() => {
      const quedan = (fin - Date.now()) / 1000;
      if (quedan <= 0) {
        setRestante(0);
        terminar("tiempo", puntosActuales);
      } else {
        setRestante(quedan);
      }
    }, 100);
  }, [terminar]);

  /* ── Empezar ──────────────────────────────────────────────────────────── */

  /** Pide rondas y devuelve solo las que tienen las dos fotos enteras. */
  const conseguirRondas = useCallback(async (alAvanzar?: (p: number) => void) => {
    const supabase = createClient();
    const { data } = await supabase.rpc("juego_rondas", { cantidad: RONDAS_PEDIDAS });
    const sorteadas = (data ?? []) as Ronda[];
    if (sorteadas.length === 0) return [];

    const buenas: Ronda[] = [];
    /* De a cuatro tandas en paralelo: bajar treinta rondas de a una tardaría
       demasiado, y bajarlas todas juntas ahoga la conexión del celular. */
    for (let i = 0; i < sorteadas.length; i += 4) {
      const tanda = sorteadas.slice(i, i + 4);
      const listas = await Promise.all(tanda.map(servible));
      tanda.forEach((r, n) => { if (listas[n]) buenas.push(r); });
      alAvanzar?.(Math.min(95, 20 + Math.round((buenas.length / RONDAS_MINIMAS) * 75)));
      if (buenas.length >= RONDAS_MINIMAS) break;
    }
    return buenas;
  }, []);

  const empezar = useCallback(async () => {
    /* Antes que nada: el permiso del navegador para sonar dura apenas unos
       segundos desde el clic, y la carga puede tardar más que eso. */
    musica.despertar(interruptor.leer()).then((sono) => setSonidoBloqueado(!sono));
    setFase("cargando");
    setAvance(0);

    /* Hasta el 20% la barra sube sola, mientras la base sortea; de ahí en
       adelante avanza con las fotos que se van bajando de verdad. */
    const subir = setInterval(() => setAvance((a) => (a < 20 ? a + 2 : a)), 40);
    const buenas = await conseguirRondas(setAvance);
    clearInterval(subir);

    if (buenas.length === 0) { setFase("inicio"); return; }

    setAvance(100);
    await esperar(300);

    setRondas(buenas);
    setIndice(0);
    setPuntaje(0);
    puntajeRef.current = 0;
    setElegida(null);
    setMotivo(null);
    jugandoRef.current = true;
    setFase("jugando");
    arrancarReloj(0);
  }, [arrancarReloj, conseguirRondas]);

  /* ── Responder ────────────────────────────────────────────────────────── */

  const responder = (carta: Carta) => {
    if (elegida || fase !== "jugando") return;
    pararReloj();
    setElegida(carta.id);

    const ronda = rondas[indice];
    const mayor = Math.max(...ronda.map((c) => c.precio));

    if (carta.precio < mayor) {
      /* Un respiro para que se vea cuál era la cara antes del resumen. */
      setTimeout(() => terminar("fallo", puntajeRef.current), 1300);
      return;
    }

    const puntos = puntajeRef.current + 1;
    puntajeRef.current = puntos;

    setTimeout(async () => {
      setPuntaje(puntos);
      setElegida(null);
      if (indice + 1 >= rondas.length) {
        /* Se acabaron: otra tanda y la partida sigue, para quien llega lejos. */
        const mas = await conseguirRondas();
        if (mas.length === 0) { terminar("tiempo", puntos); return; }
        setRondas(mas);
        setIndice(0);
      } else {
        setIndice(indice + 1);
      }
      arrancarReloj(puntos);
    }, 850);
  };

  /* ── Pantalla ─────────────────────────────────────────────────────────── */

  const ronda = rondas[indice];
  const mayor = ronda ? Math.max(...ronda.map((c) => c.precio)) : 0;
  const revelado = elegida !== null || motivo !== null;
  const acerto = revelado && ronda?.some((c) => c.id === elegida && c.precio === mayor);

  return (
    <div className="jg-page">
      <style>{ESTILOS}</style>

      {/* Las dos pistas viven en la página: un <audio> del documento es lo
          único que todos los navegadores dejan arrancar desde un clic. */}
      <audio ref={pistaBatalla} src="/juego/battle.mp3" preload="auto" loop />
      <audio ref={pistaDerrota} src="/juego/fail.mp3" preload="auto" />

      <div className="jg-wrap">
        {/* Cabecera */}
        <div className="jg-cabeza">
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
              Interactivo
            </div>
            <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
              Higher Or Lower
            </h1>
            <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, letterSpacing: "0.06em", margin: "8px 0 0" }}>
              Dos cartas, diez segundos. Señala la más cara y sigue; si fallas, se acaba
            </p>
        </div>

        {sonido && sonidoBloqueado && (
          <p className="jg-aviso">
            Tu navegador bloqueó la música. Revisa que la pestaña no esté silenciada
            —clic derecho sobre ella— y vuelve a tocar el botón de sonido.
          </p>
        )}

        <div className="jg-tablero">
        {/* El escenario: el paisaje de fondo en todas las fases */}
        <div className={"jg-escena" + (acerto === true ? " bien" : acerto === false ? " mal" : "")}>
          <div className="jg-paisaje" aria-hidden />

          {/* Dentro del escenario y arriba: es un mando del juego, no de la
              página, y se llega a él sin salir de lo que se está mirando. */}
          <button
            className="jg-sonido"
            onClick={cambiarSonido}
            aria-label={sonido ? "Apagar la música" : "Encender la música"}
            title={sonido ? "Apagar la música" : "Encender la música"}
          >
            {sonido ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{sonido ? "Sonido" : "Silencio"}</span>
          </button>

          {fase === "inicio" && <Inicio onJugar={empezar} />}
          {fase === "cargando" && <Cargando avance={avance} />}

          {fase === "jugando" && ronda && (
            <div className="jg-juego">
              <Marcador puntaje={puntaje} restante={restante} />
              <div className="jg-grid">
                {ronda.map((c) => {
                  const esLaCara = c.precio === mayor;
                  return (
                    <button
                      key={c.id}
                      className={
                        "jg-carta"
                        + (revelado && esLaCara ? " cara" : "")
                        + (revelado && c.id === elegida && !esLaCara ? " mala" : "")
                        + (revelado && !esLaCara && c.id !== elegida ? " apagada" : "")
                      }
                      disabled={revelado}
                      onClick={() => responder(c)}
                    >
                      {/* La foto ya está en la memoria del navegador: se pintó
                          entera durante la carga, así que acá no puede fallar. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${FOTOS}/${c.id}/large`} alt="" decoding="async" />
                      {revelado && (
                        <span className="jg-precio" style={{ color: esLaCara ? COURT : INK1 }}>
                          ${c.precio.toFixed(2)}
                        </span>
                      )}
                      {revelado && c.id === elegida && (
                        <span className={"jg-sello " + (esLaCara ? "ok" : "no")}>
                          {esLaCara ? "+1" : "✕"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {fase === "fin" && <Final puntaje={puntaje} motivo={motivo} onJugar={empezar} />}
        </div>

        <Ranking puestos={ranking} />
        </div>
      </div>
    </div>
  );
}

/* ── Piezas ─────────────────────────────────────────────────────────────── */

function Inicio({ onJugar }: { onJugar: () => void }) {
  return (
    <div className="jg-panel">
      <span className="jg-rotulo">Juego nuevo</span>
      <p className="jg-reglas">
        Salen dos cartas al azar y tienes diez segundos para tocar la más cara.
        Cada acierto suma un punto y trae otras dos. Un fallo, que se acabe el
        tiempo, o irte a otra pestaña, terminan la partida.
      </p>
      <button className="jg-btn" onClick={onJugar}>
        <Play size={15} /> Empezar
      </button>
    </div>
  );
}

/** La pantalla de carga, con la barra a bloques de una consola vieja. */
function Cargando({ avance }: { avance: number }) {
  const bloques = 20;
  const llenos = Math.round((avance / 100) * bloques);
  return (
    <div className="jg-panel">
      <span className="jg-rotulo parpadeo">Cargando</span>
      <div className="jg-barra">
        {Array.from({ length: bloques }, (_, i) => (
          <span key={i} className={i < llenos ? "on" : ""} />
        ))}
      </div>
      <p className="jg-reglas" style={{ margin: 0 }}>Bajando cartas… {avance}%</p>
    </div>
  );
}

function Marcador({ puntaje, restante }: { puntaje: number; restante: number }) {
  const parte = Math.max(0, restante) / SEGUNDOS;
  const apurado = parte < 0.3;
  return (
    <div className="jg-marcador">
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: INK1 }}>
          RONDA <strong style={{ color: INK0 }}>{puntaje + 1}</strong>
        </span>
        <span className={apurado ? "jg-tictac" : ""} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: apurado ? CRIT : INK1 }}>
          <Timer size={13} /> {restante.toFixed(1)}s
        </span>
      </div>
      <div className="jg-reloj">
        <span style={{ width: `${parte * 100}%`, background: apurado ? CRIT : COURT }} />
      </div>
    </div>
  );
}

function Final({ puntaje, motivo, onJugar }: {
  puntaje: number; motivo: Motivo | null; onJugar: () => void;
}) {
  const titulo = motivo === "tiempo"   ? "Se acabó el tiempo"
               : motivo === "abandono" ? "Te fuiste de la pestaña"
               :                         "Esa valía menos";
  return (
    <div className="jg-panel">
      <span className="jg-rotulo" style={{ color: motivo === "fallo" ? CRIT : BALL }}>
        {titulo}
      </span>
      <p style={{ fontFamily: DISP, fontSize: "clamp(30px, 7vw, 46px)", fontWeight: 700, color: INK0, margin: 0, lineHeight: 1 }}>
        {puntaje} {puntaje === 1 ? "ronda" : "rondas"}
      </p>
      <p className="jg-reglas" style={{ margin: 0 }}>
        {puntaje === 0
          ? "Ni una. El cero no entra al ranking."
          : "Anotado. Mira dónde quedaste abajo."}
      </p>
      <button className="jg-btn" onClick={onJugar}>
        <RotateCcw size={15} /> Otra vez
      </button>
    </div>
  );
}

function Ranking({ puestos }: { puestos: Puesto[] }) {
  return (
    <section className="jg-ranking">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Trophy size={15} color={BALL} strokeWidth={1.8} />
        <h2 style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: INK1, margin: 0 }}>
          Los diez mejores
        </h2>
      </div>

      {puestos.length === 0 ? (
        <div style={{ border: "1px dashed rgba(255,255,255,0.14)", borderRadius: 12, padding: "26px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
          <Medal size={19} color={INK2} strokeWidth={1.8} />
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: 0, textAlign: "center" }}>
            Todavía no hay marcas. La primera partida que anote queda primera.
          </p>
        </div>
      ) : (
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>
          {puestos.map((p, i) => (
            <div key={p.username} className="jg-fila">
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: i === 0 ? BALL : i < 3 ? COURT : INK2, textAlign: "center" }}>
                {i + 1}
              </span>
              <Link href={`/${p.username}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", minWidth: 0 }}>
                {p.photo_url
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img className="jg-avatar" src={p.photo_url} alt="" loading="lazy" decoding="async" />
                  : <span className="jg-avatar" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(46,230,193,0.12)", color: COURT, fontFamily: DISP, fontSize: 12, fontWeight: 700 }}>
                      {p.username.charAt(0).toUpperCase()}
                    </span>}
                <span style={{ fontFamily: MONO, fontSize: 12, color: INK1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.username}
                </span>
              </Link>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: INK0 }}>
                {p.score}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Ayudas ─────────────────────────────────────────────────────────────── */

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * ¿Se puede jugar esta ronda?
 *
 * Baja las dos fotos y responde que no si alguna falla o llega vacía. Unas
 * pocas cartas del catálogo no tienen imagen en el bucket, y antes salían como
 * un cuadro roto: la ronda quedaba decidida por cuál de las dos se veía.
 */
function servible(ronda: Ronda): Promise<boolean> {
  return Promise.all(ronda.map((c) => new Promise<boolean>((responder) => {
    const img = new Image();
    /* Si el bucket no responde, no se espera para siempre. */
    const reloj = setTimeout(() => responder(false), 8000);
    img.onload  = () => { clearTimeout(reloj); responder(img.naturalWidth > 1); };
    img.onerror = () => { clearTimeout(reloj); responder(false); };
    img.src = `${FOTOS}/${c.id}/large`;
  }))).then((r) => r.every(Boolean));
}

const ESTILOS = `
  .jg-page { min-height: 100vh; background: #05070d; padding: 40px 24px; }
  /* Centrado, al revés que el resto del panel: un juego mirando a la
     izquierda con media pantalla vacía al lado se ve desbalanceado. */
  .jg-wrap { max-width: 1320px; margin: 0 auto; }

  .jg-cabeza { text-align: center; margin-bottom: 20px; }
  .jg-cabeza > div:first-child { justify-content: center; }

  .jg-sonido { position: absolute; top: 14px; right: 14px; z-index: 2;
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(5,7,13,0.7); border: 1px solid rgba(255,255,255,0.18);
    border-radius: 999px; padding: 8px 14px; cursor: pointer; color: ${INK1};
    font-family: ${MONO}; font-size: 10px; letter-spacing: 0.1em;
    text-transform: uppercase; transition: all 0.15s; }
  .jg-sonido:hover { border-color: ${COURT}; color: ${COURT}; }

  .jg-aviso { font-family: ${MONO}; font-size: 10.5px; line-height: 1.7; color: ${BALL};
    background: rgba(214,255,61,0.07); border: 1px solid rgba(214,255,61,0.25);
    border-radius: 9px; padding: 10px 13px; margin: 0 0 14px; max-width: 620px; }

  /* El tablero: el juego a la izquierda y el ranking al costado derecho, a la
     misma altura. El ranking se mide en 320px fijos porque su contenido es
     siempre el mismo; lo que se estira es el escenario. */
  .jg-tablero { display: grid; grid-template-columns: minmax(0, 1fr) 320px;
    gap: 20px; align-items: start; }

  /* Acompaña el alto del escenario y, si diez nombres no entran, se recorre
     por dentro en vez de estirar la página. */
  .jg-ranking { height: clamp(420px, 68vh, 700px); display: flex;
    flex-direction: column; min-height: 0; }
  .jg-ranking > div:last-child { overflow-y: auto; min-height: 0; }

  /* El escenario ocupa el ancho que haya y un alto cómodo de la pantalla; el
     alto va acotado para que en un monitor alto no haya que bajar a ver las
     cartas, ni queden aplastadas en un portátil. */
  .jg-escena { position: relative; width: 100%;
    height: clamp(420px, 68vh, 700px);
    border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.09);
    display: flex; align-items: center; justify-content: center; padding: 24px; }
  .jg-paisaje { position: absolute; inset: 0; z-index: 0;
    background: url("/juego/paisaje.png") center / cover no-repeat;
    /* Sin esto el navegador suaviza los píxeles y el dibujo pierde la gracia. */
    image-rendering: pixelated;
    /* Oscurecido para que las cartas y el texto se lean sobre el cielo. */
    filter: brightness(0.62) saturate(1.1); }
  .jg-escena > *:not(.jg-paisaje) { position: relative; z-index: 1; }

  /* El borde del escenario avisa antes que ningún texto si estuvo bien o mal. */
  .jg-escena.bien { animation: jg-bien 850ms ease-out; }
  .jg-escena.mal  { animation: jg-mal 600ms ease-out; }
  @keyframes jg-bien {
    0%   { box-shadow: inset 0 0 0 0 rgba(46,230,193,0); }
    22%  { box-shadow: inset 0 0 110px 14px rgba(46,230,193,0.55); }
    100% { box-shadow: inset 0 0 0 0 rgba(46,230,193,0); }
  }
  @keyframes jg-mal {
    0%, 100% { transform: translateX(0);   box-shadow: inset 0 0 0 0 rgba(255,93,93,0); }
    15%      { transform: translateX(-9px); box-shadow: inset 0 0 110px 14px rgba(255,93,93,0.5); }
    35%      { transform: translateX(8px); }
    55%      { transform: translateX(-5px); }
    75%      { transform: translateX(3px); }
  }

  /* El juego se centra y crece con la pantalla, pero las cartas nunca pasan de
     un tamaño cómodo de mirar de una sola ojeada. */
  .jg-juego { width: 100%; max-width: 640px; height: 100%;
    display: flex; flex-direction: column; justify-content: center; gap: 14px; }
  .jg-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px; min-height: 0; }

  .jg-carta { position: relative; padding: 0; border: 2px solid rgba(255,255,255,0.22);
    border-radius: 12px; background: rgba(5,7,13,0.35); cursor: pointer; overflow: hidden;
    transition: border-color 0.15s, transform 0.15s; display: block; min-height: 0; }
  .jg-carta:hover:not(:disabled) { border-color: ${COURT}; transform: translateY(-4px); }
  .jg-carta:disabled { cursor: default; }
  .jg-carta img { width: 100%; height: 100%; max-height: 100%; aspect-ratio: 5 / 7;
    object-fit: contain; display: block; }
  .jg-carta.cara { border-color: ${COURT}; animation: jg-latido 850ms ease-out; }
  .jg-carta.mala { border-color: ${CRIT}; }
  .jg-carta.apagada img { opacity: 0.3; }
  @keyframes jg-latido {
    0%, 100% { transform: scale(1); }
    30%      { transform: scale(1.05); }
  }

  .jg-precio { position: absolute; left: 0; right: 0; bottom: 0; padding: 7px 8px;
    font-family: ${MONO}; font-size: 13px; font-weight: 700; text-align: center;
    background: rgba(5,7,13,0.9); }

  /* El "+1" o la cruz que salta sobre la carta elegida. */
  .jg-sello { position: absolute; top: 50%; left: 50%; font-family: ${DISP};
    font-size: 44px; font-weight: 700; pointer-events: none;
    animation: jg-sello 900ms ease-out forwards; }
  .jg-sello.ok { color: ${COURT}; text-shadow: 0 2px 14px rgba(46,230,193,0.6); }
  .jg-sello.no { color: ${CRIT}; text-shadow: 0 2px 14px rgba(255,93,93,0.6); }
  @keyframes jg-sello {
    0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
    25%  { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
    100% { transform: translate(-50%, -180%) scale(1); opacity: 0; }
  }

  .jg-marcador { background: rgba(5,7,13,0.55); border-radius: 10px; padding: 11px 13px;
    flex-shrink: 0; }
  .jg-reloj { height: 6px; border-radius: 999px; background: rgba(255,255,255,0.14); overflow: hidden; }
  .jg-reloj span { display: block; height: 100%; border-radius: 999px; transition: width 0.1s linear; }
  .jg-tictac { animation: jg-tictac 500ms steps(2, end) infinite; }
  @keyframes jg-tictac { 50% { opacity: 0.35; } }

  /* Los carteles de inicio, carga y final: mismo marco para los tres. */
  .jg-panel { background: rgba(5,7,13,0.72); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px; padding: 26px 24px; max-width: 470px; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    backdrop-filter: blur(2px); }
  .jg-rotulo { font-family: ${MONO}; font-size: 11px; letter-spacing: 0.22em;
    text-transform: uppercase; color: ${COURT}; }
  .jg-reglas { font-family: ${MONO}; font-size: 11px; color: ${INK1};
    line-height: 1.8; margin: 0; }
  .parpadeo { animation: jg-parpadeo 900ms steps(2, end) infinite; }
  @keyframes jg-parpadeo { 50% { opacity: 0.25; } }

  /* La barra de carga a bloques, como la de una consola vieja. */
  .jg-barra { display: flex; gap: 3px; width: 100%; }
  .jg-barra span { flex: 1; height: 13px; background: rgba(255,255,255,0.12); border-radius: 2px; }
  .jg-barra span.on { background: ${COURT}; box-shadow: 0 0 8px rgba(46,230,193,0.7); }

  .jg-btn { display: inline-flex; align-items: center; gap: 9px; border: 0;
    border-radius: 9px; padding: 13px 26px; cursor: pointer; font-family: ${MONO};
    font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
    background: linear-gradient(90deg, ${COURT}, ${BALL}); color: #05070d; }

  .jg-fila { display: grid; grid-template-columns: 34px 1fr auto; align-items: center;
    gap: 12px; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .jg-fila:last-child { border-bottom: 0; }
  .jg-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover;
    border: 1px solid rgba(255,255,255,0.12); }

  /* Debajo de esto el ranking al costado dejaría el juego muy angosto: baja. */
  @media (max-width: 1023px), (pointer: coarse) {
    .jg-tablero { grid-template-columns: minmax(0, 1fr); gap: 30px; }
    .jg-ranking { height: auto; }
    .jg-ranking > div:last-child { overflow-y: visible; }
  }

  @media (max-width: 767px), (pointer: coarse) {
    .jg-page { padding: 28px 16px; }
    .jg-sonido { top: 10px; right: 10px; padding: 7px 11px; }
    .jg-escena { height: clamp(400px, 62vh, 560px); padding: 16px 12px; }
    .jg-grid { gap: 10px; }
    .jg-sello { font-size: 32px; }
  }

  /* Para quien pidió menos movimiento en su sistema: se queda el color, se va
     el temblor. */
  @media (prefers-reduced-motion: reduce) {
    .jg-escena.bien, .jg-escena.mal, .jg-carta.cara, .jg-sello,
    .parpadeo, .jg-tictac { animation: none; }
  }
`;
