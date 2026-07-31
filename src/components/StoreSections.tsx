"use client";

import {
  CalendarDays, Gamepad2, Package, Layers, MapPin, Clock, Sparkles, ExternalLink,
} from "lucide-react";
import { MarketListingsSlider } from "@/components/ProfilePage";

const INK1  = "#b6bdcc";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";

/** Cada sección lleva su acento, como en los perfiles normales */
const COURT  = "#2ee6c1";
const CYAN   = "#4ff0ff";
const PINK   = "#ff4fd8";
const GOLD   = "#ffd24f";
const LIME   = "#d6ff3d";
const VIOLET = "#a26bff";

/**
 * Rejilla de la fanpage de tienda. Replica el boceto: columna izquierda
 * estrecha, derecha ancha, con Jugadores y "por definir" ocupando dos filas.
 */
export interface HourSlot { open: string; close: string }

/**
 * Horarios por día. Cada día es una lista de franjas, así que una tienda que
 * cierra a mediodía se guarda como dos: mañana y tarde.
 * Lista vacía o ausente = cerrado.
 */
export interface StoreHours {
  [day: string]: HourSlot[] | null | undefined;
}

/** Franjas válidas de un día, ignorando las incompletas */
export const daySlots = (h: StoreHours | null | undefined, key: string): HourSlot[] =>
  (h?.[key] ?? []).filter(s => s?.open && s?.close);

const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

export function StoreSections({ username, profileUserId, address, mapsUrl, hours, city, pais }: {
  username: string;
  profileUserId?: string;
  address?: string;
  /** Enlace de Google Maps pegado por la tienda; manda sobre la dirección */
  mapsUrl?: string;
  hours?: StoreHours | null;
  city?: string;
  pais?: string;
}) {
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px, 4vw, 48px) 64px" }}>
      <style>{`
        .store-grid {
          display: grid; gap: 16px;
          grid-template-columns: 1fr;
          grid-template-areas:
            "eventos" "cartas" "jugadores" "productos"
            "decks" "ubicacion" "horarios" "definir";
        }
        @media (min-width: 900px) {
          .store-grid {
            grid-template-columns: minmax(200px, 26%) minmax(0, 1fr);
            grid-template-areas:
              "eventos   cartas"
              "jugadores productos"
              "jugadores decks"
              "ubicacion definir"
              "horarios  definir";
          }
        }
        .a-eventos   { grid-area: eventos; }
        .a-cartas    { grid-area: cartas; }
        .a-jugadores { grid-area: jugadores; }
        .a-productos { grid-area: productos; }
        .a-decks     { grid-area: decks; }
        .a-ubicacion { grid-area: ubicacion; }
        .a-horarios  { grid-area: horarios; }
        .a-definir   { grid-area: definir; }
      `}</style>

      <div className="store-grid">
        <Panel className="a-eventos" title="Próximos eventos" accent={GOLD} compact>
          <Empty accent={GOLD} Icon={CalendarDays} title="Sin eventos"
            body={<>Todavía no hay torneos<br />ni actividades publicadas.</>} />
        </Panel>

        <Panel className="a-cartas" title="Cartas en venta" accent={COURT}
          action={{ label: "Ver todas", href: `/${username}/market` }}>
          {/* El mismo carrusel de los perfiles normales */}
          <MarketListingsSlider profileUserId={profileUserId} username={username} hideHeader />
        </Panel>

        <Panel className="a-jugadores" title="Jugadores" accent={VIOLET} compact>
          <Empty accent={VIOLET} Icon={Gamepad2} title="Sin jugadores"
            body={<>Aún no hay jugadores<br />vinculados a esta tienda.</>} />
        </Panel>

        <Panel className="a-productos" title="Productos en venta" accent={CYAN}>
          <Empty accent={CYAN} Icon={Package} title="Sin productos sellados"
            body={<>Cajas, sobres y colecciones<br />aparecerán en este carrusel.</>} />
        </Panel>

        <Panel className="a-decks" title="Decks en venta" accent={LIME}>
          <Empty accent={LIME} Icon={Layers} title="Sin decks en venta"
            body={<>Los mazos armados que publique<br />la tienda se verán aquí.</>} />
        </Panel>

        <Panel className="a-ubicacion" title="Ubicación" accent={COURT}
          action={address || mapsUrl
            ? { label: "Abrir en Maps", href: mapsUrl || mapsLink(address!, city, pais) }
            : undefined}>
          {address || mapsUrl
            ? <StoreMap address={address} mapsUrl={mapsUrl} city={city} pais={pais} />
            : <Empty accent={COURT} Icon={MapPin} title="Sin dirección"
                body={<>Esta tienda todavía no indicó<br />dónde encontrarla.</>} />}
        </Panel>

        <Panel className="a-horarios" title="Horarios" accent={GOLD}>
          {hasHours(hours)
            ? <HoursTable hours={hours!} />
            : <Empty accent={GOLD} Icon={Clock} title="Sin horarios"
                body={<>Esta tienda todavía no publicó<br />sus días de atención.</>} />}
        </Panel>

        <Panel className="a-definir" title="Por definir" accent={PINK}>
          <Empty accent={PINK} Icon={Sparkles} title="Espacio reservado"
            body={<>Aquí irá la próxima sección<br />de la tienda.</>} />
        </Panel>
      </div>
    </section>
  );
}

/* ── Tarjeta contenedora ────────────────────────────────────────────────── */
function Panel({ title, accent, children, className, action, compact }: {
  title: string;
  accent: string;
  children: React.ReactNode;
  className?: string;
  action?: { label: string; href: string };
  /** Los paneles de la columna estrecha no necesitan tanto alto */
  compact?: boolean;
}) {
  return (
    <div className={className} style={{
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${accent}22`,
      borderRadius: "16px",
      padding: "clamp(16px, 2vw, 22px)",
      minWidth: 0,
      display: "flex", flexDirection: "column",
      minHeight: compact ? 150 : 190,
    }}>
      {/* Mismo rótulo que las secciones de los perfiles normales */}
      <div style={{
        fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em",
        textTransform: "uppercase", color: accent,
        display: "flex", alignItems: "center", gap: "10px",
        marginBottom: "14px", flexWrap: "wrap",
      }}>
        <span style={{ width: "22px", height: "1px", background: accent, display: "inline-block", flexShrink: 0 }} />
        {title}
        {action && (
          <a href={action.href} style={{
            marginLeft: "auto", fontFamily: MONO, fontSize: "10px", color: accent,
            textDecoration: "none", letterSpacing: "0.12em",
            border: `1px solid ${accent}44`, borderRadius: "8px", padding: "4px 9px",
            whiteSpace: "nowrap",
          }}>
            {action.label}
          </a>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

/* ── Ubicación ──────────────────────────────────────────────────────────── */
/** Consulta completa: la dirección sola puede ser ambigua entre ciudades */
const fullQuery = (address: string, city?: string, pais?: string) =>
  [address, city, pais].filter(v => v && v !== "—").join(", ");

export const mapsLink = (address: string, city?: string, pais?: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery(address, city, pais))}`;

/**
 * Coordenadas dentro de un enlace de Google Maps de escritorio
 * (…/@4.7521,-74.0631,17z o …?q=4.75,-74.06). Los enlaces cortos
 * (maps.app.goo.gl) no las traen: hay que resolverlos antes y eso exige red.
 */
function coordsFromUrl(url?: string): string | null {
  if (!url) return null;
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return `${at[1]},${at[2]}`;
  const q = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return `${q[1]},${q[2]}`;
  return null;
}

/**
 * Mapa embebido sin clave de API. El modo /maps?q=…&output=embed es el único
 * que funciona sin facturación de Google Cloud; la Embed API pide clave.
 */
function StoreMap({ address, mapsUrl, city, pais }: {
  address?: string; mapsUrl?: string; city?: string; pais?: string;
}) {
  const coords  = coordsFromUrl(mapsUrl);
  const label   = address ? fullQuery(address, city, pais) : "Ver ubicación en Google Maps";
  // Las coordenadas del enlace son más precisas que el texto de la dirección
  const embedQ  = coords ?? (address ? fullQuery(address, city, pais) : null);
  const openUrl = mapsUrl || (address ? mapsLink(address, city, pais) : null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      {embedQ && (
        <div style={{
          position: "relative", width: "100%", aspectRatio: "16 / 9",
          borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.03)",
        }}>
          <iframe
            title={`Mapa de ${label}`}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(embedQ)}&z=16&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        </div>
      )}

      {address && (
        <p style={{
          fontFamily: MONO, fontSize: 11, color: INK1, margin: 0, lineHeight: 1.6,
          display: "flex", gap: 7, alignItems: "flex-start",
        }}>
          <MapPin size={13} strokeWidth={1.9} color={COURT} style={{ flexShrink: 0, marginTop: 2 }} />
          {label}
        </p>
      )}

      {openUrl && (
        <a href={openUrl} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 7, alignSelf: "flex-start",
          fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
          color: COURT, textDecoration: "none",
          border: `1px solid ${COURT}44`, background: `${COURT}10`,
          borderRadius: 8, padding: "7px 11px",
        }}>
          <ExternalLink size={12} strokeWidth={2} />
          Ver en Google Maps
        </a>
      )}
    </div>
  );
}

/* ── Horarios ───────────────────────────────────────────────────────────── */
const hasHours = (h?: StoreHours | null) =>
  !!h && DAYS.some(d => daySlots(h, d.key).length > 0);

/** "14:30" → "2:30 p. m." para que se lea como en Colombia */
function to12h(hhmm: string) {
  const [hStr, m] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m ?? "00"} ${suffix}`;
}

function HoursTable({ hours }: { hours: StoreHours }) {
  // El domingo es 0 en JS y el último de la semana acá
  const todayKey = DAYS[(new Date().getDay() + 6) % 7].key;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {DAYS.map(d => {
        const slots   = daySlots(hours, d.key);
        const isToday = d.key === todayKey;

        return (
          <div key={d.key} style={{
            display: "flex", justifyContent: "space-between", gap: 12,
            alignItems: "flex-start",
            padding: "7px 9px", borderRadius: 7,
            background: isToday ? `${GOLD}12` : "transparent",
            border: `1px solid ${isToday ? `${GOLD}33` : "transparent"}`,
          }}>
            <span style={{
              fontFamily: MONO, fontSize: 10.5,
              color: isToday ? GOLD : INK1,
              letterSpacing: "0.06em",
            }}>
              {d.label}{isToday && " · hoy"}
            </span>
            {/* Cada franja en su línea: una tienda con jornada partida
                muestra la mañana y la tarde por separado */}
            <span style={{
              display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2,
              fontFamily: MONO, fontSize: 10.5,
              color: slots.length ? (isToday ? GOLD : INK1) : INK2,
              fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
            }}>
              {slots.length === 0
                ? "Cerrado"
                : slots.map((s, i) => <span key={i}>{to12h(s.open)} – {to12h(s.close)}</span>)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Estado vacío, igual al de los perfiles normales ────────────────────── */
function Empty({ accent, Icon, title, body }: {
  accent: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div style={{
      border: `1px dashed ${accent}33`, borderRadius: "12px",
      padding: "28px 20px", textAlign: "center", margin: "auto 0",
    }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
        <Icon size={26} strokeWidth={1.6} color={accent} />
      </div>
      <p style={{
        fontFamily: MONO, fontSize: "12px", color: accent, fontWeight: 600,
        letterSpacing: "0.05em", margin: "0 0 6px",
      }}>
        {title}
      </p>
      <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, lineHeight: 1.6, margin: 0 }}>
        {body}
      </p>
    </div>
  );
}
