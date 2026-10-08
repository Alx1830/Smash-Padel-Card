"use client";

/**
 * "Type Master" — minijuego flash de la sección Interactivo.
 *
 * Sale un Pokémon y hay que marcar su tipo; si tiene dos, los dos (el orden no
 * importa). Apenas se marcan tantos tipos como tiene, se manda la respuesta.
 * Si está bien, pasa al siguiente; si está mal, los tipos que sobraban quedan
 * tachados, los que sí eran quedan fijos, y no avanza hasta acertar. Hay un
 * minuto: el puntaje son los aciertos.
 *
 * La base es el árbitro, como en Higher Or Lower (funciones tipos_* en
 * Supabase): el navegador nunca recibe los tipos, cada respuesta se corrige
 * allá con su propio reloj y solo la base escribe el puntaje.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Play, Timer, Trophy, RotateCcw, Medal, Volume2, VolumeX, Check } from "lucide-react";
import { musica, interruptor, registrarPistas } from "@/components/juego/musica";
import { PUESTOS_RANKING } from "@/components/juego/ranking";
import type { Puesto } from "@/components/juego/MasCara";
import { TIPOS, tipoDe, urlIlustracion, type PokemonPublico, type PokemonRepaso, type TipoId } from "./tipos";
import { VolverAJuegos } from "@/components/juego/VolverAJuegos";

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const CRIT  = "#ff5d5d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";

const SEGUNDOS = 60;
/** Lo que se ve el verde del acierto antes de pasar al siguiente */
const PAUSA_ACIERTO = 380;

type Fase = "inicio" | "cargando" | "jugando" | "fin";
type Motivo = "tiempo" | "abandono";

const bajar = (p: { id: string }) => new Promise<void>(ok => {
  const img = new Image();
  const reloj = setTimeout(ok, 4000);
  img.onload = img.onerror = () => { clearTimeout(reloj); ok(); };
  img.src = urlIlustracion(p);
});

export function JuegoTipos({ rankingInicial }: { rankingInicial: Puesto[] }) {
  const [fase, setFase] = useState<Fase>("inicio");
  const [actual, setActual] = useState<PokemonPublico | null>(null);
  const [marcados, setMarcados] = useState<TipoId[]>([]);
  const [fijos, setFijos] = useState<TipoId[]>([]);          // acertados en un intento fallido
  const [tachados, setTachados] = useState<TipoId[]>([]);    // los que sobraban
  const [veredicto, setVeredicto] = useState<null | "bien" | "mal">(null);
  const [enviando, setEnviando] = useState(false);
  const [aciertos, setAciertos] = useState(0);
  const [restante, setRestante] = useState(SEGUNDOS);
  const [motivo, setMotivo] = useState<Motivo | null>(null);
  const [repaso, setRepaso] = useState<PokemonRepaso[]>([]);
  const [ranking, setRanking] = useState<Puesto[]>(rankingInicial);
  const [sonidoBloqueado, setSonidoBloqueado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const sonido = useSyncExternalStore(interruptor.subscribe, interruptor.leer, interruptor.leerEnServidor);

  const partidaId = useRef<string | null>(null);
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null);
  const jugando = useRef(false);
  const pistaBatalla = useRef<HTMLAudioElement>(null);
  const pistaDerrota = useRef<HTMLAudioElement>(null);

  const pararReloj = () => { if (reloj.current) clearInterval(reloj.current); reloj.current = null; };

  useEffect(() => {
    registrarPistas(pistaBatalla.current, pistaDerrota.current);
    return () => { pararReloj(); musica.silencio(); };
  }, []);

  const cambiarSonido = () => {
    const nuevo = !sonido;
    interruptor.cambiar(nuevo);
    if (!nuevo) { musica.silencio(); return; }
    musica.despertar(true).then(sono => setSonidoBloqueado(!sono));
  };

  /* ── Terminar: el puntaje lo escribe la base ─────────────────────────── */

  const terminar = useCallback(async (razon: Motivo) => {
    if (!jugando.current) return;
    jugando.current = false;
    pararReloj();
    musica.derrota(interruptor.leer());
    setMotivo(razon);
    setRestante(0);
    setFase("fin");
    const id = partidaId.current;
    if (!id) return;
    const supabase = createClient();
    const { data } = await supabase.rpc("tipos_terminar", { p_partida: id });
    if (typeof data === "number") setAciertos(data);
    const [{ data: fallados }, { data: puestos }] = await Promise.all([
      supabase.rpc("tipos_repaso", { p_partida: id }),
      supabase.rpc("tipos_ranking", { limite: PUESTOS_RANKING }),
    ]);
    setRepaso((fallados ?? []) as PokemonRepaso[]);
    if (puestos) setRanking(puestos as Puesto[]);
  }, []);

  /* Irse de la pestaña termina la partida, como en Higher Or Lower */
  useEffect(() => {
    const vigilar = () => { if (document.hidden && jugando.current) terminar("abandono"); };
    document.addEventListener("visibilitychange", vigilar);
    return () => document.removeEventListener("visibilitychange", vigilar);
  }, [terminar]);

  /* ── Empezar ──────────────────────────────────────────────────────────── */

  const mostrar = (p: PokemonPublico) => {
    setActual(p);
    setMarcados([]);
    setFijos([]);
    setTachados([]);
    setVeredicto(null);
  };

  const empezar = async () => {
    // El permiso del navegador para sonar dura segundos desde el clic: va primero
    musica.despertar(interruptor.leer()).then(sono => setSonidoBloqueado(!sono));
    setFase("cargando");
    setRepaso([]);
    setMotivo(null);
    setAviso(null);
    setAciertos(0);
    const { data, error } = await createClient().rpc("tipos_empezar");
    if (error || !data) {
      musica.silencio();
      setAviso(error?.message === "espera un momento" ? "Espera un segundo y vuelve a intentar." : "No se pudo empezar la partida. Revisa tu conexión.");
      setFase("inicio");
      return;
    }
    partidaId.current = data.partida as string;
    const lista = data.pokemon as PokemonPublico[];
    await Promise.all(lista.slice(0, 2).map(bajar));
    lista.slice(2).forEach(bajar);
    mostrar(lista[0]);
    jugando.current = true;
    setFase("jugando");
    const fin = Date.now() + SEGUNDOS * 1000;
    setRestante(SEGUNDOS);
    reloj.current = setInterval(() => {
      const quedan = (fin - Date.now()) / 1000;
      if (quedan <= 0) terminar("tiempo"); else setRestante(quedan);
    }, 100);
  };

  /* ── Responder ────────────────────────────────────────────────────────── */

  const marcar = async (t: TipoId) => {
    if (!actual || enviando || veredicto === "bien" || tachados.includes(t) || fijos.includes(t)) return;
    const nuevos = marcados.includes(t) ? marcados.filter(x => x !== t) : [...marcados, t];
    setMarcados(nuevos);
    if (nuevos.length < actual.cantidad) return;

    setEnviando(true);
    const { data, error } = await createClient().rpc("tipos_responder", { p_partida: partidaId.current, p_tipos: nuevos });
    setEnviando(false);
    if (!jugando.current) return;
    if (error || !data) { setMarcados(fijos); return; }
    if (data.estado === "terminada") { terminar("tiempo"); return; }

    if (data.correcta) {
      setAciertos(data.aciertos);
      setVeredicto("bien");
      const siguientes = data.siguientes as PokemonPublico[];
      siguientes.forEach(bajar);
      setTimeout(() => { if (jugando.current && siguientes[0]) mostrar(siguientes[0]); }, PAUSA_ACIERTO);
      return;
    }
    // Falló: lo que sobraba se tacha, lo que sí era queda fijo, y a intentar de nuevo
    const sobran = (data.incorrectos ?? []) as TipoId[];
    const quedan = nuevos.filter(x => !sobran.includes(x));
    setTachados(tch => [...tch, ...sobran]);
    setFijos(quedan);
    setMarcados(quedan);
    setVeredicto("mal");
    setTimeout(() => setVeredicto(v => (v === "mal" ? null : v)), 500);
  };

  const parte = Math.max(0, restante) / SEGUNDOS;
  const apurado = parte < 0.2;

  return (
    <div className="jt-page">
      <style>{ESTILOS}</style>
      <audio ref={pistaBatalla} src="/juego/battle.mp3" preload="auto" loop />
      <audio ref={pistaDerrota} src="/juego/fail.mp3" preload="auto" />

      <div className="jt-wrap">
        <VolverAJuegos />
        {sonido && sonidoBloqueado && (
          <p className="jt-aviso">Tu navegador bloqueó la música. Revisa que la pestaña no esté silenciada y vuelve a tocar el botón de sonido.</p>
        )}

        <div className="jt-tablero">
          <div className={"jt-escena" + (veredicto === "bien" ? " bien" : veredicto === "mal" ? " mal" : "")}>
            <div className="jt-paisaje" aria-hidden />

            {fase === "inicio" && (
              <div className="jt-panel">
                <span className="jt-rotulo">Type Master</span>
                <p className="jt-reglas">
                  Sale un Pokémon y marcas su tipo; si tiene dos, los dos. Si fallas, no
                  pasa al siguiente hasta que aciertes. Tienes un minuto: cada acierto suma
                  un punto. Irte a otra pestaña termina la partida.
                </p>
                {aviso && <p className="jt-reglas" style={{ color: CRIT }}>{aviso}</p>}
                <button className="jt-btn" onClick={empezar}><Play size={15} /> Empezar</button>
              </div>
            )}

            {fase === "cargando" && (
              <div className="jt-panel"><span className="jt-rotulo parpadeo">Cargando</span></div>
            )}

            {fase === "jugando" && actual && (
              <div className="jt-juego">
                <div className="jt-marcador">
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
                    <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: INK1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      #{String(actual.n).padStart(4, "0")}{actual.forma ? ` · ${actual.nombre}` : ""}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: BALL, marginLeft: "auto", whiteSpace: "nowrap" }}>
                      {actual.cantidad === 1 ? "1 TIPO" : "2 TIPOS"}
                    </span>
                    <span className={apurado ? "jt-tictac" : ""} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: apurado ? CRIT : INK1 }}>
                      <Timer size={13} /> {Math.max(0, restante).toFixed(1)}s
                    </span>
                  </div>
                  <div className="jt-reloj"><span style={{ width: `${parte * 100}%`, background: apurado ? CRIT : COURT }} /></div>
                </div>

                <div className="jt-poke">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img key={actual.id} src={urlIlustracion(actual)} alt={actual.nombre} decoding="async" />
                  {veredicto === "bien" && <span className="jt-sello">+1</span>}
                </div>
                <div className="jt-nombre">{actual.forma ?? actual.nombre}</div>

                <div className="jt-tipos">
                  {TIPOS.map(t => {
                    const tachado = tachados.includes(t.id);
                    const fijo = fijos.includes(t.id);
                    const on = marcados.includes(t.id);
                    return (
                      <button key={t.id} onClick={() => marcar(t.id)} disabled={tachado}
                        className={"jt-tipo" + (on ? " on" : "") + (fijo ? " fijo" : "") + (tachado ? " tachado" : "") + (veredicto === "bien" && on ? " ok" : "")}
                        style={{ ["--c" as string]: t.color }}>
                        {t.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {fase === "fin" && (
              <div className="jt-panel jt-final">
                <span className="jt-rotulo" style={{ color: motivo === "abandono" ? CRIT : BALL }}>
                  {motivo === "abandono" ? "Te fuiste de la pestaña" : "Se acabó el tiempo"}
                </span>
                <p style={{ fontFamily: DISP, fontSize: "clamp(30px, 7vw, 46px)", fontWeight: 700, color: INK0, margin: 0, lineHeight: 1 }}>
                  {aciertos} {aciertos === 1 ? "acierto" : "aciertos"}
                </p>
                <p className="jt-reglas" style={{ margin: 0 }}>
                  {aciertos === 0 ? "Ni uno. El cero no entra al ranking." : "Anotado. Mira dónde quedaste en el ranking."}
                </p>
                <button className="jt-btn" onClick={empezar}><RotateCcw size={15} /> Otra vez</button>
                {repaso.length > 0 && (
                  <div style={{ width: "100%", marginTop: 6 }}>
                    <span className="jt-rotulo" style={{ color: INK2, fontSize: 10 }}>Los que te costaron</span>
                    <div className="jt-repaso">
                      {repaso.map(p => (
                        <div key={p.id} className="jt-repaso-item">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={urlIlustracion(p)} alt={p.nombre} loading="lazy" decoding="async" />
                          <div style={{ minWidth: 0, textAlign: "left" }}>
                            <div className="jt-linea" style={{ fontSize: 10, color: INK0 }}>{p.forma ?? p.nombre}</div>
                            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 3 }}>
                              {p.tipos.map(t => <span key={t} className="jt-chip" style={{ background: tipoDe(t)?.color }}>{tipoDe(t)?.nombre}</span>)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="jt-pie">
              <span className="jt-aciertos"><Check size={13} /> Aciertos <strong>{aciertos}</strong></span>
              <button className="jt-sonido" onClick={cambiarSonido}
                aria-label={sonido ? "Apagar la música" : "Encender la música"} title={sonido ? "Apagar la música" : "Encender la música"}>
                {sonido ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span>{sonido ? "Sonido" : "Silencio"}</span>
              </button>
            </div>
          </div>

          <Ranking puestos={ranking} />
        </div>
      </div>
    </div>
  );
}

function Ranking({ puestos }: { puestos: Puesto[] }) {
  return (
    <section className="jt-ranking">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Trophy size={15} color={BALL} strokeWidth={1.8} />
        <h2 style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: INK1, margin: 0 }}>
          Los {PUESTOS_RANKING} mejores
        </h2>
      </div>
      {puestos.length === 0 ? (
        <div style={{ border: "1px dashed rgba(255,255,255,0.14)", borderRadius: 12, padding: "26px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
          <Medal size={19} color={INK2} strokeWidth={1.8} />
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, margin: 0, textAlign: "center" }}>Todavía no hay marcas. La primera partida que anote queda primera.</p>
        </div>
      ) : (
        <div className="jt-lista">
          {puestos.map((p, i) => (
            <div key={p.username} className="jt-fila">
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: i === 0 ? BALL : i < 3 ? COURT : INK2, textAlign: "center" }}>{i + 1}</span>
              <Link href={`/${p.username}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", minWidth: 0 }}>
                {p.photo_url
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img className="jt-avatar" src={p.photo_url} alt="" loading="lazy" decoding="async" />
                  : <span className="jt-avatar" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(46,230,193,0.12)", color: COURT, fontFamily: DISP, fontSize: 12, fontWeight: 700 }}>{p.username.charAt(0).toUpperCase()}</span>}
                <span style={{ fontFamily: MONO, fontSize: 12, color: INK1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.username}</span>
              </Link>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: INK0 }}>{p.score}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const ESTILOS = `
  .jt-page { min-height: 100vh; background: #05070d; padding: 22px 24px 40px; }
  .jt-wrap { max-width: 1480px; margin: 0 auto; }
  .jt-aviso { font-family: ${MONO}; font-size: 10.5px; line-height: 1.7; color: ${BALL};
    background: rgba(214,255,61,0.07); border: 1px solid rgba(214,255,61,0.25);
    border-radius: 9px; padding: 10px 13px; margin: 0 auto 14px; max-width: 620px; }
  .jt-tablero { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; align-items: start; }

  .jt-escena { position: relative; width: 100%; height: clamp(560px, 84vh, 900px);
    border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.09);
    display: flex; align-items: center; justify-content: center; padding: 20px; }
  .jt-paisaje { position: absolute; inset: 0; z-index: 0;
    background: url("/juego/paisaje-noche.png") center / cover no-repeat;
    image-rendering: pixelated; filter: brightness(0.85) saturate(1.1); }
  .jt-escena > *:not(.jt-paisaje):not(.jt-pie) { position: relative; z-index: 1; }
  .jt-escena.bien { animation: jt-bien 600ms ease-out; }
  .jt-escena.mal  { animation: jt-mal 500ms ease-out; }
  @keyframes jt-bien { 0% { box-shadow: inset 0 0 0 0 rgba(46,230,193,0); } 25% { box-shadow: inset 0 0 110px 14px rgba(46,230,193,0.5); } 100% { box-shadow: inset 0 0 0 0 rgba(46,230,193,0); } }
  @keyframes jt-mal { 0%, 100% { transform: translateX(0); box-shadow: inset 0 0 0 0 rgba(255,93,93,0); }
    15% { transform: translateX(-9px); box-shadow: inset 0 0 110px 14px rgba(255,93,93,0.45); } 35% { transform: translateX(8px); } 55% { transform: translateX(-5px); } 75% { transform: translateX(3px); } }

  .jt-juego { width: 100%; max-width: 760px; height: 100%; display: flex; flex-direction: column; gap: 10px; padding-bottom: 46px; }
  .jt-marcador { background: rgba(5,7,13,0.6); border-radius: 10px; padding: 11px 13px; flex-shrink: 0; }
  .jt-reloj { height: 6px; border-radius: 999px; background: rgba(255,255,255,0.14); overflow: hidden; }
  .jt-reloj span { display: block; height: 100%; border-radius: 999px; transition: width 0.1s linear; }
  .jt-tictac { animation: jt-tictac 500ms steps(2, end) infinite; }
  @keyframes jt-tictac { 50% { opacity: 0.35; } }

  .jt-poke { position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
  .jt-poke img { max-height: 100%; max-width: 100%; object-fit: contain; filter: drop-shadow(0 8px 18px rgba(0,0,0,0.6)); }
  .jt-nombre { text-align: center; font-family: ${DISP}; font-size: clamp(20px, 3.4vw, 28px); font-weight: 700; color: ${INK0};
    text-shadow: 0 2px 10px rgba(0,0,0,0.7); flex-shrink: 0; }
  .jt-sello { position: absolute; top: 45%; left: 50%; font-family: ${DISP}; font-size: 48px; font-weight: 700; color: ${COURT};
    text-shadow: 0 2px 14px rgba(46,230,193,0.6); pointer-events: none; animation: jt-sello 600ms ease-out forwards; }
  @keyframes jt-sello { 0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; } 30% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; } 100% { transform: translate(-50%, -160%) scale(1); opacity: 0; } }

  .jt-tipos { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; flex-shrink: 0; }
  /* Píldora del color del tipo con letra blanca contorneada, como los carteles de los juegos */
  .jt-tipo { position: relative; padding: 11px 2px; border-radius: 999px; cursor: pointer; font-family: ${MONO}; font-size: 11px; font-weight: 800;
    color: #fff; text-shadow: -1px -1px 0 #1a1a1a, 1px -1px 0 #1a1a1a, -1px 1px 0 #1a1a1a, 1px 1px 0 #1a1a1a;
    border: 2px solid #1a1a1a; box-shadow: inset 0 0 0 2px rgba(255,255,255,0.45);
    background: var(--c); transition: transform 0.08s, filter 0.12s, opacity 0.12s, box-shadow 0.12s;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .jt-tipo:hover:not(:disabled) { filter: brightness(1.12); }
  .jt-tipo:active:not(:disabled) { transform: scale(0.96); }
  .jt-tipo.on { border-color: #fff; box-shadow: inset 0 0 0 2px rgba(255,255,255,0.45), 0 0 0 2px #fff, 0 0 12px var(--c); }
  .jt-tipo.fijo, .jt-tipo.ok { border-color: ${COURT}; box-shadow: 0 0 0 2px ${COURT}; }
  .jt-tipo.tachado { opacity: 0.28; cursor: default; text-decoration: line-through; border-color: ${CRIT}; }

  .jt-pie { position: absolute; left: 0; right: 0; bottom: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 10px 14px; background: linear-gradient(transparent, rgba(5,7,13,0.75) 55%); }
  .jt-aciertos { display: inline-flex; align-items: center; gap: 7px; font-family: ${MONO}; font-size: 10px; letter-spacing: 0.1em;
    text-transform: uppercase; color: ${INK1}; background: rgba(5,7,13,0.7); border: 1px solid rgba(255,255,255,0.18); border-radius: 999px; padding: 8px 14px; }
  .jt-aciertos strong { color: ${COURT}; font-size: 13px; }
  .jt-sonido { display: inline-flex; align-items: center; gap: 8px; background: rgba(5,7,13,0.7); border: 1px solid rgba(255,255,255,0.18);
    border-radius: 999px; padding: 8px 14px; cursor: pointer; color: ${INK1}; font-family: ${MONO}; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }
  .jt-sonido:hover { border-color: ${COURT}; color: ${COURT}; }

  .jt-panel { margin-bottom: 34px; background: rgba(5,7,13,0.75); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px;
    padding: 26px 24px; max-width: 470px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .jt-final { max-width: 560px; max-height: calc(100% - 60px); overflow-y: auto; }
  .jt-rotulo { font-family: ${MONO}; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: ${COURT}; }
  .jt-reglas { font-family: ${MONO}; font-size: 11px; color: ${INK1}; line-height: 1.8; margin: 0; }
  .parpadeo { animation: jt-tictac 900ms steps(2, end) infinite; }
  .jt-btn { display: inline-flex; align-items: center; gap: 9px; border: 0; border-radius: 9px; padding: 13px 26px; cursor: pointer;
    font-family: ${MONO}; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; background: linear-gradient(90deg, ${COURT}, ${BALL}); color: #05070d; }

  .jt-repaso { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
  .jt-repaso-item { display: flex; align-items: center; gap: 6px; padding: 6px; border-radius: 10px; background: rgba(255,255,255,0.04); min-width: 0; }
  .jt-repaso-item img { width: 40px; height: 40px; object-fit: contain; flex-shrink: 0; }
  .jt-chip { font-family: ${MONO}; font-size: 8.5px; font-weight: 700; color: #fff; padding: 2px 6px; border-radius: 999px; text-shadow: 0 1px 1px rgba(0,0,0,0.5); }
  .jt-linea { font-family: ${MONO}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .jt-ranking { height: clamp(560px, 84vh, 900px); display: flex; flex-direction: column; min-height: 0; }
  .jt-lista { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; background: rgba(255,255,255,0.02); scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.14) transparent; }
  .jt-fila { display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 12px; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .jt-fila:last-child { border-bottom: 0; }
  .jt-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.12); }

  @media (max-width: 1023px), (pointer: coarse) {
    .jt-tablero { grid-template-columns: minmax(0, 1fr); gap: 30px; }
    .jt-ranking { height: auto; }
    .jt-lista { flex: none; overflow-y: visible; }
  }
  @media (max-width: 767px), (pointer: coarse) {
    .jt-page { padding: 16px 10px 28px; }
    .jt-escena { height: clamp(560px, calc(100dvh - 150px), 760px); padding: 10px 8px; }
    .jt-juego { gap: 8px; padding-bottom: 44px; }
    .jt-tipos { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
    .jt-tipo { padding: 8px 2px; font-size: 12px; }
    .jt-marcador { padding: 8px 10px; }
    .jt-pie { padding: 8px 10px; }
    .jt-aciertos, .jt-sonido { padding: 7px 11px; font-size: 9.5px; }
    .jt-sonido span { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .jt-escena.bien, .jt-escena.mal, .jt-sello, .parpadeo, .jt-tictac { animation: none; }
  }
`;
