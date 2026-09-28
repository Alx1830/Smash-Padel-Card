"use client";

/**
 * Quién está en la página ahora mismo.
 *
 * Cada navegador avisa cada 30 s (components/RastreoVisitas.tsx) y acá se
 * cuenta como "en línea" a quien avisó en los últimos 75 s. Los datos salen de
 * la función panel_en_vivo(), que solo responde a un admin: las tablas no son
 * legibles por nadie más. Se refresca solo cada 5 s.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Radio, Smartphone, Tablet, Monitor, MapPin, Globe, Clock, Eye, UserRound,
  UserCheck, Sparkles, Layers, AppWindow, Compass, MoonStar, Activity,
} from "lucide-react";

const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";
const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const CRIT  = "#ff5d5d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const SURF  = "rgba(255,255,255,0.02)";
const LINE  = "rgba(255,255,255,0.07)";

const REFRESCO = 5_000;

interface Visitante {
  visitante_id: string;
  user_id: string | null;
  username: string | null;
  role: string | null;
  primera_vez: string;
  sesion_inicio: string;
  ultimo_ping: string;
  sesiones: number;
  paginas_sesion: number;
  ruta: string | null;
  titulo: string | null;
  en_primer_plano: boolean;
  referido: string | null;
  utm_fuente: string | null;
  dispositivo: "movil" | "tablet" | "escritorio" | null;
  so: string | null;
  navegador: string | null;
  pwa: boolean;
  pantalla: string | null;
  idioma: string | null;
  zona_horaria: string | null;
  pais: string | null;
  region: string | null;
  ciudad: string | null;
}

interface Panel {
  ahora: string;
  en_linea: Visitante[];
  hoy_visitantes: number;
  hoy_vistas: number;
  hoy_con_sesion: number;
  hoy_nuevos: number;
  ultimos_30: number;
  por_minuto: { m: string; vistas: number; visitantes: number }[];
  paginas_hoy: { ruta: string; vistas: number }[];
}

/* ── Formato ─────────────────────────────────────────────────── */

let nombresPais: Intl.DisplayNames | null = null;
function nombrePais(code: string | null): string {
  if (!code) return "Sin dato";
  try {
    nombresPais ??= new Intl.DisplayNames(["es"], { type: "region" });
    return nombresPais.of(code) ?? code;
  } catch { return code; }
}

/** Nombre corto de una ruta, para leerla de un vistazo */
function nombreRuta(ruta: string | null): string {
  if (!ruta) return "—";
  const fijas: Record<string, string> = {
    "/": "Portada",
    "/market": "Market local",
    "/dashboard": "Inicio (panel)",
    "/dashboard/market": "Market · En venta",
    "/dashboard/market/wishlist": "Wishlist",
    "/dashboard/inventario": "Inventario",
    "/dashboard/inventario/agregar": "Agregar cartas",
    "/dashboard/decks": "Decks",
    "/dashboard/my-sets": "Mis sets",
    "/dashboard/trades": "Intercambios",
    "/dashboard/juego": "Higher Or Lower",
    "/dashboard/perfil": "Editar perfil",
    "/noticias": "Noticias",
    "/sets": "Catálogo de sets",
    "/login": "Ingreso",
    "/onboarding": "Registro",
  };
  if (fijas[ruta]) return fijas[ruta];
  if (ruta.startsWith("/dashboard/admin")) return "Panel admin";
  if (ruta.startsWith("/noticias/")) return "Nota";
  if (ruta.startsWith("/carta/")) return "Ficha de carta";
  if (ruta.startsWith("/sets/")) return "Set del catálogo";
  if (ruta.includes("/deck/")) return "Deck";
  if (/^\/[^/]+$/.test(ruta)) return `Perfil ${ruta.slice(1)}`;
  return ruta;
}

function duracion(desde: string, ahora: number): string {
  const s = Math.max(0, Math.round((ahora - new Date(desde).getTime()) / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

function contar<T>(lista: T[], clave: (x: T) => string | null | undefined): [string, number][] {
  const mapa = new Map<string, number>();
  for (const x of lista) {
    const k = clave(x) || "Sin dato";
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}

const ETIQUETA_DISPOSITIVO = { movil: "Celular", tablet: "Tablet", escritorio: "Computador" } as const;

function IconoDispositivo({ tipo, size = 14 }: { tipo: Visitante["dispositivo"]; size?: number }) {
  const Icon = tipo === "movil" ? Smartphone : tipo === "tablet" ? Tablet : Monitor;
  return <Icon size={size} color={COURT} strokeWidth={1.8} />;
}

/* ── Página ──────────────────────────────────────────────────── */

export default function EnVivoPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [error, setError] = useState<string | null>(null);
  /* Diferencia entre el reloj del servidor y el de este equipo, para que los
     "hace 3 min" no dependan de la hora del computador del admin. */
  const [desfase, setDesfase] = useState(0);
  const [reloj, setReloj] = useState(() => Date.now());

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data } = await supabase.from("players").select("role").eq("user_id", user.id).single();
      if (data?.role !== "admin") { router.replace("/dashboard"); return; }
      setChecking(false);
    })();
  }, [router]);

  const cargar = useCallback(async () => {
    const { data, error: err } = await createClient().rpc("panel_en_vivo");
    if (err) { setError(err.message); return; }
    const p = data as Panel;
    setError(null);
    setPanel(p);
    setDesfase(new Date(p.ahora).getTime() - Date.now());
  }, []);

  useEffect(() => {
    if (checking) return;
    const primera = setTimeout(() => { void cargar(); }, 0);
    const refresco = setInterval(() => {
      /* Con la pestaña oculta no tiene sentido seguir pidiendo */
      if (document.visibilityState === "visible") void cargar();
    }, REFRESCO);
    const tic = setInterval(() => setReloj(Date.now()), 1_000);
    return () => { clearTimeout(primera); clearInterval(refresco); clearInterval(tic); };
  }, [checking, cargar]);

  const ahora = reloj + desfase;
  const lista = useMemo(() => panel?.en_linea ?? [], [panel]);

  const resumen = useMemo(() => {
    const conSesion = lista.filter(v => v.user_id).length;
    const segundoPlano = lista.filter(v => !v.en_primer_plano).length;
    return {
      total: lista.length,
      conSesion,
      anonimos: lista.length - conSesion,
      segundoPlano,
      paginas:      contar(lista, v => nombreRuta(v.ruta)),
      paises:       contar(lista, v => nombrePais(v.pais)),
      ciudades:     contar(lista, v => v.ciudad ? `${v.ciudad}${v.pais ? `, ${v.pais}` : ""}` : null),
      dispositivos: contar(lista, v => v.dispositivo ? ETIQUETA_DISPOSITIVO[v.dispositivo] : null),
      so:           contar(lista, v => v.so),
      navegadores:  contar(lista, v => v.navegador),
      origen:       contar(lista, v => v.utm_fuente ?? v.referido ?? "Directo"),
      app:          contar(lista, v => v.pwa ? "App instalada" : "Navegador"),
      idiomas:      contar(lista, v => v.idioma),
    };
  }, [lista]);

  if (checking) return <div style={{ minHeight: "100vh", background: "#05070d" }} />;

  return (
    <div className="ev-page">
      <style>{`
        .ev-page { background: #05070d; min-height: 100vh; padding: 40px 24px; }
        .ev-wrap { max-width: 1400px; }
        .ev-kpis { display: grid; grid-template-columns: 1.6fr repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 14px; }
        .ev-cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 14px; }
        .ev-dos  { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 14px; }
        .ev-gente { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .ev-card { background: ${SURF}; border: 1px solid ${LINE}; border-radius: 12px; padding: 16px; min-width: 0; }
        .ev-pulso { width: 10px; height: 10px; border-radius: 50%; background: ${COURT}; position: relative; flex-shrink: 0; }
        .ev-pulso::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: ${COURT}; animation: ev-pulso 1.8s ease-out infinite; }
        @keyframes ev-pulso { from { transform: scale(1); opacity: .7; } to { transform: scale(3); opacity: 0; } }
        .ev-barra:hover { background: ${BALL} !important; }
        @media (max-width: 1240px) {
          .ev-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .ev-kpis > :first-child { grid-column: 1 / -1; }
          .ev-gente { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 1023px) {
          .ev-cols { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .ev-dos  { grid-template-columns: minmax(0, 1fr); }
        }
        @media (max-width: 767px) {
          .ev-page { padding: 28px 16px; }
          .ev-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .ev-cols, .ev-gente { grid-template-columns: minmax(0, 1fr); gap: 10px; }
        }
      `}</style>

      <div className="ev-wrap">
        {/* Cabecera */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: COURT, display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ width: 22, height: 1, background: COURT, display: "inline-block" }} />
            Panel Admin
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: INK0, margin: 0, letterSpacing: "-0.01em" }}>
            En vivo
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK2, letterSpacing: "0.06em", margin: "8px 0 0" }}>
            Quién está en la página ahora mismo · se actualiza sola cada 5 segundos
          </p>
        </div>

        {error && (
          <p style={{ fontFamily: MONO, fontSize: 11, color: CRIT, marginBottom: 16 }}>No se pudo cargar: {error}</p>
        )}

        {!panel ? (
          <p style={{ fontFamily: MONO, fontSize: 12, color: INK2, letterSpacing: "0.1em" }}>Cargando...</p>
        ) : (
          <>
            {/* Cifras */}
            <div className="ev-kpis">
              <div className="ev-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: COURT }}>
                  <span className="ev-pulso" /> En línea ahora
                </div>
                <div style={{ fontFamily: DISP, fontSize: "clamp(44px, 8vw, 64px)", color: INK0, lineHeight: 1 }}>
                  {resumen.total}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: INK2, letterSpacing: "0.04em" }}>
                  {resumen.conSesion} con sesión · {resumen.anonimos} sin cuenta
                  {resumen.segundoPlano > 0 && ` · ${resumen.segundoPlano} con la pestaña en segundo plano`}
                </div>
              </div>
              <Cifra Icon={Activity}  label="Últimos 30 min"      valor={panel.ultimos_30} />
              <Cifra Icon={UserRound} label="Visitantes hoy"      valor={panel.hoy_visitantes} />
              <Cifra Icon={Eye}       label="Páginas vistas hoy"  valor={panel.hoy_vistas} />
              <Cifra Icon={Sparkles}  label="Nuevos hoy"          valor={panel.hoy_nuevos} nota={`${panel.hoy_con_sesion} con sesión hoy`} />
            </div>

            {/* Gráfico por minuto + páginas de hoy */}
            <div className="ev-dos">
              <div className="ev-card">
                <Titulo Icon={Clock} texto="Páginas vistas por minuto · últimos 30 min" />
                <PorMinuto datos={panel.por_minuto} ahora={ahora} />
              </div>
              <div className="ev-card">
                <Titulo Icon={Eye} texto="Lo más visto hoy" />
                <Barras filas={panel.paginas_hoy.map(p => [nombreRuta(p.ruta), p.vistas] as [string, number])} vacio="Todavía no hay visitas hoy" />
              </div>
            </div>

            {/* Desgloses de los que están ahora */}
            <div className="ev-cols">
              <div className="ev-card"><Titulo Icon={Layers}     texto="Dónde están ahora" /><Barras filas={resumen.paginas} /></div>
              <div className="ev-card"><Titulo Icon={Globe}      texto="País" /><Barras filas={resumen.paises} /></div>
              <div className="ev-card"><Titulo Icon={MapPin}     texto="Ciudad" /><Barras filas={resumen.ciudades} /></div>
              <div className="ev-card"><Titulo Icon={Smartphone} texto="Dispositivo" /><Barras filas={resumen.dispositivos} /></div>
              <div className="ev-card"><Titulo Icon={Monitor}    texto="Sistema operativo" /><Barras filas={resumen.so} /></div>
              <div className="ev-card"><Titulo Icon={Compass}    texto="Navegador" /><Barras filas={resumen.navegadores} /></div>
              <div className="ev-card"><Titulo Icon={Radio}      texto="Cómo llegaron" /><Barras filas={resumen.origen} /></div>
              <div className="ev-card"><Titulo Icon={AppWindow}  texto="App o navegador" /><Barras filas={resumen.app} /></div>
              <div className="ev-card"><Titulo Icon={Globe}      texto="Idioma del equipo" /><Barras filas={resumen.idiomas} /></div>
            </div>

            {/* Cada persona */}
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: INK1, margin: "28px 0 12px" }}>
              Cada visitante ({resumen.total})
            </div>
            {lista.length === 0 ? (
              <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, padding: "60px 30px", textAlign: "center" }}>
                <Radio size={26} color={INK2} strokeWidth={1.6} />
                <p style={{ fontFamily: MONO, fontSize: 12, color: INK2, letterSpacing: "0.08em", margin: "14px 0 0" }}>
                  No hay nadie conectado en este momento. Apenas alguien abra la página aparece aquí.
                </p>
              </div>
            ) : (
              <div className="ev-gente">
                {lista.map(v => <TarjetaVisitante key={v.visitante_id} v={v} ahora={ahora} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Piezas ──────────────────────────────────────────────────── */

type IconType = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

function Titulo({ Icon, texto }: { Icon: IconType; texto: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: INK1, marginBottom: 14 }}>
      <Icon size={13} color={COURT} strokeWidth={1.8} /> {texto}
    </div>
  );
}

function Cifra({ Icon, label, valor, nota }: { Icon: IconType; label: string; valor: number; nota?: string }) {
  return (
    <div className="ev-card">
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: INK2 }}>
        <Icon size={12} color={COURT} strokeWidth={1.8} /> {label}
      </div>
      <div style={{ fontFamily: DISP, fontSize: 30, color: INK0, marginTop: 10, lineHeight: 1 }}>
        {valor.toLocaleString("es-CO")}
      </div>
      {nota && <div style={{ fontFamily: MONO, fontSize: 9, color: INK2, marginTop: 6 }}>{nota}</div>}
    </div>
  );
}

/** Lista con barra proporcional: una sola serie, el color solo marca tamaño */
function Barras({ filas, vacio = "Nadie conectado" }: { filas: [string, number][]; vacio?: string }) {
  if (filas.length === 0) {
    return <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, margin: 0 }}>{vacio}</p>;
  }
  const max = Math.max(...filas.map(f => f[1]));
  const total = filas.reduce((s, f) => s + f[1], 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {filas.slice(0, 8).map(([nombre, n]) => (
        <div key={nombre} title={`${nombre}: ${n} (${Math.round((n / total) * 100)} %)`}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontFamily: MONO, fontSize: 11, color: INK1, marginBottom: 4 }}>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nombre}</span>
            <span style={{ color: INK0, fontWeight: 600, flexShrink: 0 }}>{n}</span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.05)" }}>
            <div style={{ width: `${(n / max) * 100}%`, height: "100%", borderRadius: 4, background: COURT }} />
          </div>
        </div>
      ))}
      {filas.length > 8 && (
        <div style={{ fontFamily: MONO, fontSize: 9, color: INK2 }}>y {filas.length - 8} más</div>
      )}
    </div>
  );
}

/** Barras por minuto, con los minutos sin visitas en cero para que no se salten */
function PorMinuto({ datos, ahora }: { datos: Panel["por_minuto"]; ahora: number }) {
  const porClave = new Map(datos.map(d => [new Date(d.m).getTime(), d]));
  const minutoActual = Math.floor(ahora / 60_000) * 60_000;
  const minutos = Array.from({ length: 30 }, (_, i) => {
    const t = minutoActual - (29 - i) * 60_000;
    return { t, d: porClave.get(t) };
  });
  const max = Math.max(1, ...minutos.map(m => m.d?.vistas ?? 0));
  const alto = 120;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: alto, borderBottom: `1px solid ${LINE}` }}>
        {minutos.map(({ t, d }) => {
          const n = d?.vistas ?? 0;
          const hora = new Date(t).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={t} title={`${hora} · ${n} páginas vistas · ${d?.visitantes ?? 0} visitantes`}
              style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", cursor: "default" }}>
              <div className="ev-barra" style={{
                width: "100%", height: n ? `${Math.max(4, (n / max) * 100)}%` : 0,
                background: COURT, borderRadius: "4px 4px 0 0", transition: "height .3s",
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 9, color: INK2, marginTop: 6 }}>
        <span>hace 30 min</span><span>hace 15 min</span><span>ahora</span>
      </div>
    </div>
  );
}

function Dato({ Icon, children }: { Icon: IconType; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 10, color: INK1, minWidth: 0 }}>
      <Icon size={12} color={INK2} strokeWidth={1.8} />
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{children}</span>
    </div>
  );
}

function TarjetaVisitante({ v, ahora }: { v: Visitante; ahora: number }) {
  const lugar = [v.ciudad, v.region, nombrePais(v.pais)].filter(x => x && x !== "Sin dato").join(", ") || "Ubicación desconocida";
  const recurrente = v.sesiones > 1;

  return (
    <div className="ev-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Quién */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(46,230,193,0.08)", border: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {v.user_id ? <UserCheck size={16} color={COURT} strokeWidth={1.8} /> : <UserRound size={16} color={INK2} strokeWidth={1.8} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: INK0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {v.username ? (
              <Link href={`/${v.username}`} style={{ color: INK0, textDecoration: "none" }}>@{v.username}</Link>
            ) : "Visitante sin cuenta"}
            {v.role === "admin" && <span style={{ marginLeft: 6, fontSize: 8, color: "#4ff0ff", letterSpacing: "0.1em" }}>ADMIN</span>}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: INK2, marginTop: 2 }}>
            {recurrente ? `Ha venido ${v.sesiones} veces` : "Primera visita"} · conectado hace {duracion(v.sesion_inicio, ahora)}
          </div>
        </div>
        <div title={v.en_primer_plano ? "Mirando la página" : "Pestaña en segundo plano"}
          style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: v.en_primer_plano ? COURT : INK2, flexShrink: 0 }}>
          {v.en_primer_plano ? <span className="ev-pulso" style={{ width: 7, height: 7 }} /> : <MoonStar size={11} color={INK2} />}
          {v.en_primer_plano ? "Activo" : "Oculta"}
        </div>
      </div>

      {/* Dónde está en el sitio */}
      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px", minWidth: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, color: INK0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {nombreRuta(v.ruta)}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: INK2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
          {v.ruta ? <Link href={v.ruta} style={{ color: INK2, textDecoration: "none" }}>{v.ruta}</Link> : "—"}
          {` · ${v.paginas_sesion} ${v.paginas_sesion === 1 ? "página" : "páginas"} en esta visita`}
        </div>
      </div>

      {/* Detalles */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "7px 12px" }}>
        <Dato Icon={MapPin}>{lugar}</Dato>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 10, color: INK1, minWidth: 0 }}>
          <IconoDispositivo tipo={v.dispositivo} size={12} />
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {v.dispositivo ? ETIQUETA_DISPOSITIVO[v.dispositivo] : "—"}{v.pantalla ? ` · ${v.pantalla}` : ""}
          </span>
        </div>
        <Dato Icon={Monitor}>{v.so ?? "—"}</Dato>
        <Dato Icon={Compass}>{v.navegador ?? "—"}{v.pwa ? " · App" : ""}</Dato>
        <Dato Icon={Radio}>{v.utm_fuente ?? v.referido ?? "Directo"}</Dato>
        <Dato Icon={Clock}>{v.zona_horaria ?? "—"}</Dato>
      </div>
    </div>
  );
}
