/**
 * De un enlace pegado a un video que se puede incrustar.
 *
 * Instagram, TikTok y X publican una dirección de incrustado que es un `iframe`
 * y nada más: no hace falta cargarles el script, que además la política de
 * seguridad del sitio bloquea. A cambio, el alto no se negocia solo —el script
 * es el que avisa cuánto mide—, así que cada red tiene su medida fija en
 * `globals.css` y adentro se desplaza si hace falta.
 *
 * De los enlaces cortos (vm.tiktok.com, t.co) no se puede sacar el número sin
 * pedirle al servidor que lo resuelva, así que se rechazan y se pide el largo.
 */

export type RedSocial = "instagram" | "tiktok" | "x";

export interface Incrustado {
  red: RedSocial;
  /** El código de la publicación, que es lo único que se guarda */
  id: string;
  /** La dirección que va en el `src` del iframe */
  src: string;
}

/** La dirección del iframe para una publicación ya identificada. */
export function direccionIncrustado(red: RedSocial, id: string): string {
  if (red === "instagram") return `https://www.instagram.com/p/${id}/embed`;
  if (red === "tiktok") return `https://www.tiktok.com/embed/v2/${id}`;
  return `https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=dark&dnt=true`;
}

/** Nombre para mostrar, para los mensajes de la barra del editor. */
export const NOMBRE_RED: Record<RedSocial, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X (Twitter)",
};

/**
 * Lee el enlace pegado. Devuelve `null` si no es de ninguna de las tres o si
 * es un enlace corto, que no se puede resolver sin pedirlo por red.
 */
export function leerEnlaceSocial(entrada: string): Incrustado | null {
  const url = entrada.trim();
  if (!url) return null;

  const instagram = url.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  if (instagram) return armar("instagram", instagram[1]);

  const tiktok = url.match(/tiktok\.com\/(?:@[^/]+\/)?(?:video|photo)\/(\d+)/i);
  if (tiktok) return armar("tiktok", tiktok[1]);

  const x = url.match(/(?:twitter|x)\.com\/(?:[^/]+\/)?status(?:es)?\/(\d+)/i);
  if (x) return armar("x", x[1]);

  return null;
}

function armar(red: RedSocial, id: string): Incrustado {
  return { red, id, src: direccionIncrustado(red, id) };
}
