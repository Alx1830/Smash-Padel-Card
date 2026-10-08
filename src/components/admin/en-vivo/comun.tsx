"use client";

/**
 * Tipos, colores, formatos y piezas chicas que comparten las dos pestañas del
 * panel En vivo (lo que pasa ahora y los reportes por días).
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

/* ── Marca ───────────────────────────────────────────────────── */

export const MONO  = "var(--font-jetbrains)";
export const DISP  = "var(--font-archivo)";
export const COURT = "#2ee6c1";
export const BALL  = "#d6ff3d";
export const ADMIN = "#4ff0ff";
export const CRIT  = "#ff5d5d";
export const INK0  = "#f5f7fb";
export const INK1  = "#c9cfdd";
export const INK2  = "#7a8298";
export const BG0   = "#05070d";
export const SURF  = "rgba(255,255,255,0.02)";
export const LINE  = "rgba(255,255,255,0.07)";
/** Superficie de los globos y el aro que separa los puntos de las líneas */
export const SURF_SOLIDA = "#0b0f19";

/**
 * Paleta de series para fondo oscuro. Validada con el script de la skill de
 * gráficos contra #0b0f19 y #05070d: luminosidad, croma, daltonismo entre
 * vecinos (peor par 10,3), visión normal (peor par 22,2) y contraste ≥ 3:1.
 * El orden es parte de la validación: no reordenar ni cambiar un tono sin
 * volver a correr el validador.
 */
export const SERIE = [
  "#1ba88d", // verde agua (el acento de marca, un paso más oscuro)
  "#5b7cf0", // azul
  "#e0702e", // naranja
  "#b35ee0", // violeta
  "#b38300", // ámbar
  "#e0579a", // rosa
  "#3f9fd6", // celeste
  "#7ea300", // lima
] as const;

/** "Otros" y "Sin dato" van en gris y siempre al final */
export const GRIS_OTROS = "#5c6479";
export const GRIS_SIN   = "#383e4d";

/** Cada cifra tiene su color fijo, el mismo en las tarjetas y en los gráficos */
export const COLOR = {
  visitantes: SERIE[0],
  sesiones:   SERIE[1],
  vistas:     SERIE[2],
  conSesion:  SERIE[3],
  paginas:    SERIE[4],
  nuevos:     SERIE[5],
  duracion:   SERIE[6],
  rebote:     SERIE[7],
} as const;

/* ── Datos ───────────────────────────────────────────────────── */

export type Dispositivo = "movil" | "tablet" | "escritorio";

export interface Visitante {
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
  dispositivo: Dispositivo | null;
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

export interface Panel {
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

export interface Par { k: string; n: number }

export interface Reporte {
  desde: string;
  hasta: string;
  dias: number;
  totales: {
    vistas: number; visitantes: number; sesiones: number; con_sesion: number; nuevos: number;
    duracion_media_seg: number; paginas_por_sesion: number; rebote_pct: number;
  };
  previos: { vistas: number; visitantes: number; sesiones: number };
  por_dia: { dia: string; vistas: number; visitantes: number; sesiones: number }[];
  por_hora: { hora: number; vistas: number }[];
  por_dia_semana: { dow: number; vistas: number }[];
  paginas: { ruta: string; titulo: string | null; vistas: number; visitantes: number; seg_medio: number | null }[];
  paises: Par[];
  ciudades: Par[];
  dispositivos: Par[];
  so: Par[];
  navegadores: Par[];
  idiomas: Par[];
  app: Par[];
  origenes: Par[];
  usuarios: { username: string; vistas: number; sesiones: number; ultima: string }[];
}

/* ── Formato ─────────────────────────────────────────────────── */

export const SIN_DATO = "Sin dato";

export const num = (n: number) => Math.round(n).toLocaleString("es-CO");

let nombresPais: Intl.DisplayNames | null = null;
export function nombrePais(code: string | null): string {
  if (!code || code === SIN_DATO) return SIN_DATO;
  try {
    nombresPais ??= new Intl.DisplayNames(["es"], { type: "region" });
    return nombresPais.of(code.toUpperCase()) ?? code;
  } catch { return code; }
}

let nombresIdioma: Intl.DisplayNames | null = null;
/** "es-CO" → "Español (Colombia)" */
export function nombreIdioma(code: string | null): string {
  if (!code || code === SIN_DATO) return SIN_DATO;
  try {
    nombresIdioma ??= new Intl.DisplayNames(["es"], { type: "language" });
    const n = nombresIdioma.of(code) ?? code;
    return n.charAt(0).toUpperCase() + n.slice(1);
  } catch { return code; }
}

/** Nombre corto de una ruta, para leerla de un vistazo */
export function nombreRuta(ruta: string | null): string {
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
    "/dashboard/juegos": "Juegos",
    "/dashboard/higher-or-lower": "Higher Or Lower",
    "/dashboard/type-master": "Type Master",
    "/dashboard/perfil": "Editar perfil",
    "/dashboard/buscar": "Buscar carta",
    "/noticias": "Noticias",
    "/post": "Noticias",
    "/sets": "Catálogo de sets",
    "/login": "Ingreso",
    "/onboarding": "Registro",
    "/acerca": "Acerca de",
    "/contacto": "Contacto",
    "/privacidad": "Privacidad",
    "/terminos": "Términos",
  };
  const limpia = ruta.split("?")[0].replace(/\/$/, "") || "/";
  if (fijas[limpia]) return fijas[limpia];
  if (limpia.startsWith("/dashboard/admin")) return "Panel admin";
  if (limpia.startsWith("/noticias/") || limpia.startsWith("/post/")) return "Nota";
  if (limpia.startsWith("/carta/")) return "Ficha de carta";
  if (limpia.startsWith("/sets/")) return "Set del catálogo";
  if (limpia.includes("/deck/")) return "Deck";
  if (/^\/[^/]+$/.test(limpia)) return `Perfil ${limpia.slice(1)}`;
  return limpia;
}

/** De dónde llegó: el dominio queda con nombre propio cuando es una red conocida */
export function nombreOrigen(o: string | null | undefined): string {
  if (!o || o === "Directo") return "Directo";
  const h = o.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  if (/facebook|^fb\.|^m\.me$/.test(h)) return "Facebook";
  if (/instagram/.test(h)) return "Instagram";
  if (/whatsapp|^wa\.me/.test(h)) return "WhatsApp";
  if (/google/.test(h)) return "Google";
  if (/^t\.co$|twitter|^x\.com$/.test(h)) return "X (Twitter)";
  if (/tiktok/.test(h)) return "TikTok";
  if (/youtube|youtu\.be/.test(h)) return "YouTube";
  if (/bing/.test(h)) return "Bing";
  if (/duckduckgo/.test(h)) return "DuckDuckGo";
  if (/reddit/.test(h)) return "Reddit";
  if (/discord/.test(h)) return "Discord";
  if (/facebinder/.test(h)) return "Facebinder";
  return h || "Directo";
}

export const ETIQUETA_DISPOSITIVO: Record<string, string> = {
  movil: "Celular", tablet: "Tablet", escritorio: "Computador",
};

/** Segundos → "45 s", "3 min 20 s", "1 h 5 min" */
export function segundos(total: number | null | undefined): string {
  const s = Math.max(0, Math.round(total ?? 0));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 ? `${m} min ${s % 60} s` : `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

/** Tiempo desde una fecha hasta "ahora" (hora del servidor) */
export function duracion(desde: string, ahora: number): string {
  const s = Math.max(0, Math.round((ahora - new Date(desde).getTime()) / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
  return `${Math.floor(h / 24)} días`;
}

/** Cuenta ocurrencias; lo vacío cae en "Sin dato" */
export function contar<T>(lista: T[], clave: (x: T) => string | null | undefined): Par[] {
  const mapa = new Map<string, number>();
  for (const x of lista) {
    const k = clave(x) || SIN_DATO;
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return ordenar([...mapa.entries()].map(([k, n]) => ({ k, n })));
}

/** Suma los pares que terminan con el mismo nombre (p. ej. m.facebook.com y lm.facebook.com) */
export function reagrupar(pares: Par[], nombre: (k: string) => string): Par[] {
  const mapa = new Map<string, number>();
  for (const p of pares) {
    const k = nombre(p.k) || SIN_DATO;
    mapa.set(k, (mapa.get(k) ?? 0) + p.n);
  }
  return ordenar([...mapa.entries()].map(([k, n]) => ({ k, n })));
}

/** De mayor a menor, con "Sin dato" siempre al final */
export function ordenar(pares: Par[]): Par[] {
  return [...pares].sort((a, b) => {
    const sa = a.k === SIN_DATO ? 1 : 0;
    const sb = b.k === SIN_DATO ? 1 : 0;
    return sa - sb || b.n - a.n;
  });
}

/* ── Fechas (siempre en hora de Bogotá) ──────────────────────── */

export const ZONA = "America/Bogota";
/** Desde cuándo se guarda el detalle de cada visita */
export const HISTORIAL_DESDE = "2026-09-27";

export function hoyBogota(t: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t));
}

export function sumarDias(d: string, n: number): string {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-09-27" → "27 sep" (o "27 sep 2026" con año) */
export function fechaCorta(d: string, conAnio = false): string {
  const [a, m, dia] = d.split("-").map(Number);
  return `${dia} ${MESES[m - 1]}${conAnio ? ` ${a}` : ""}`;
}

/** "2026-09-27" → "domingo 27 sep" */
export function fechaLarga(d: string): string {
  const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
  return `${["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][dow]} ${fechaCorta(d)}`;
}

export function horaMinuto(t: number | string): string {
  return new Date(t).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: ZONA });
}

/** 0-23 → "8 p. m." */
export function hora12(h: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${h < 12 ? "a. m." : "p. m."}`;
}

export const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/* ── Piezas ──────────────────────────────────────────────────── */

export type IconType = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/** Mide el ancho real de una caja para dibujar el SVG a su tamaño: así el texto
    de los ejes no se achica en el celular y se ponen menos marcas cuando no caben. */
export function useAncho<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho];
}

/** Tarjeta con un acento de color: rayita arriba, brillo suave en la esquina */
export function Tarjeta({ acento = COURT, className = "", style, children }: {
  acento?: string; className?: string; style?: CSSProperties; children: ReactNode;
}) {
  return (
    <section className={`ev-card ${className}`} style={{ ["--acento" as string]: acento, ...style }}>
      {children}
    </section>
  );
}

export function Titulo({ Icon, texto, acento = COURT, ayuda, extra }: {
  Icon: IconType; texto: string; acento?: string; ayuda?: string; extra?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="ev-icono" style={{ ["--acento" as string]: acento }}>
          <Icon size={14} color={acento} strokeWidth={1.9} />
        </span>
        <span style={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: INK1 }}>
          {texto}
        </span>
        {extra}
      </div>
      {ayuda && (
        <p style={{ fontFamily: MONO, fontSize: 10, color: INK2, lineHeight: 1.5, margin: "8px 0 0" }}>{ayuda}</p>
      )}
    </div>
  );
}

/** Subtítulo de sección, con una raya que llena el resto del renglón */
export function Seccion({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: MONO, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: INK1, margin: "30px 0 14px" }}>
      <span style={{ flexShrink: 0 }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: LINE }} />
    </div>
  );
}

/** Estado vacío: borde punteado, icono y una línea que dice qué hacer */
export function Vacio({ Icon, texto, compacto = false }: { Icon: IconType; texto: string; compacto?: boolean }) {
  return (
    <div style={{
      border: "1px dashed rgba(255,255,255,0.12)", borderRadius: compacto ? 10 : 16,
      padding: compacto ? "22px 16px" : "56px 24px", textAlign: "center",
    }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Icon size={compacto ? 20 : 26} color={INK2} strokeWidth={1.6} />
      </div>
      <p style={{ fontFamily: MONO, fontSize: compacto ? 10 : 12, color: INK2, letterSpacing: "0.04em", lineHeight: 1.6, margin: "12px auto 0", maxWidth: 440 }}>
        {texto}
      </p>
    </div>
  );
}
