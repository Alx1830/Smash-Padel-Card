/**
 * Publicaciones del feed: una noticia con dirección propia en /post/<slug>.
 *
 * El cuerpo se guarda como HTML ya saneado (el editor lo pasa por DOMPurify
 * antes de escribir), y solo un admin puede insertar o editar — lo garantiza
 * la RLS de `admin_posts`, no la interfaz. La página pública lo pinta tal cual
 * porque no hay DOM en el servidor para volver a sanear.
 */

export interface Post {
  id: string;
  slug: string | null;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  content_html: string | null;
  /** Cuerpo de los posts viejos, en texto plano con algo de HTML suelto. */
  content: string | null;
  media_url: string | null;
  category: PostCategoria;
  /** `scheduled` se comporta como borrador para el público: la web solo
   *  muestra `published`. La pasa a publicada el trabajo de la base. */
  status: "draft" | "scheduled" | "published";
  published_at: string | null;
  /** Cuándo debe salir sola. Solo tiene valor con `status: "scheduled"`. */
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  notified_at: string | null;
  user_id: string | null;
}

/**
 * Las categorías son una lista cerrada: la base tiene el mismo check, así que
 * agregar una acá sin agregarla allá hace fallar el guardado.
 */
export const POST_CATEGORIAS = [
  { id: "novedades", label: "Novedades" },
  { id: "sets",      label: "Sets" },
  { id: "market",    label: "Market" },
  { id: "guias",     label: "Guías" },
  { id: "torneos",   label: "Torneos" },
  { id: "comunidad", label: "Comunidad" },
] as const;

export type PostCategoria = (typeof POST_CATEGORIAS)[number]["id"];

export const CATEGORIA_POR_DEFECTO: PostCategoria = "novedades";

export function etiquetaCategoria(id: string | null | undefined): string {
  return POST_CATEGORIAS.find((c) => c.id === id)?.label ?? "Novedades";
}

export interface PostAuthor {
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
}

/** Etiquetas que sobreviven al saneado. Es la lista del editor. */
export const POST_TAGS = [
  "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "mark",
  "h2", "h3", "h4", "blockquote", "ul", "ol", "li",
  "a", "img", "figure", "figcaption", "iframe", "div", "span",
  "code", "pre",
];

export const POST_ATTR = [
  "href", "src", "alt", "title", "target", "rel", "class",
  "width", "height", "allow", "allowfullscreen", "frameborder", "style",
  /* Sin `loading` y `decoding` el saneado los borraba y un carrusel de
     trescientas fotos las pedía todas de una. `data-slider` y `data-imagenes`
     son la marca del carrusel: sin ellas se guarda una fila de fotos suelta
     que al volver a abrir la nota ya no se puede editar como carrusel. */
  "loading", "decoding",
  "data-slider", "data-imagenes", "data-leyenda",
  "data-youtube-video",
];

/**
 * Título a dirección: "¡Llegó Pitch Black!" → "llego-pitch-black".
 * Sin acentos ni signos, porque la dirección se comparte por WhatsApp y ahí
 * un acento se convierte en un %C3%B3 ilegible.
 */
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // acentos ya separados por NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Quita el HTML para armar la bajada o el texto de la notificación. */
export function soloTexto(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Bajada automática cuando el admin no escribió una. */
export function extractoAuto(html: string, largo = 160): string {
  const t = soloTexto(html);
  if (t.length <= largo) return t;
  const corte = t.slice(0, largo);
  return corte.slice(0, corte.lastIndexOf(" ")) + "…";
}

/** Minutos de lectura, a 200 palabras por minuto. Mínimo 1. */
export function minutosDeLectura(html: string): number {
  const palabras = soloTexto(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palabras / 200));
}

/**
 * Colombia va cinco horas detrás del meridiano, y no mueve el reloj en todo el
 * año: no hay horario de verano desde 1993. Por eso el desfase se puede
 * escribir fijo, sin librería de zonas horarias.
 *
 * Hace falta porque las páginas del panel se dibujan en el servidor de
 * Cloudflare, que trabaja en hora universal: una nota programada a las 9 de la
 * mañana se mostraba como las 2 de la tarde.
 */
export const ZONA_COLOMBIA = "America/Bogota";
export const DESFASE_COLOMBIA = "-05:00";

/** Fecha y hora como se leen en Colombia, sin importar dónde corra esto. */
export function fechaYHora(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    timeZone: ZONA_COLOMBIA,
  });
}

/** Lo mismo, escrito largo: "11 de septiembre de 2026, 9:00 a. m." */
export function fechaYHoraLarga(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "long", timeStyle: "short", timeZone: ZONA_COLOMBIA,
  });
}

export function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota",
  });
}

export function nombreAutor(a: PostAuthor | null): string {
  if (!a) return "FaceBinder";
  const nombre = [a.first_name, a.last_name].filter(Boolean).join(" ").trim();
  return nombre || a.username || "FaceBinder";
}
