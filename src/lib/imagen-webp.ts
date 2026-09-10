/**
 * Convierte una imagen a WebP en el navegador, antes de subirla.
 *
 * Se hace acá y no en el servidor por dos razones: la app corre en Cloudflare
 * Workers, donde `sharp` no existe, y así el archivo pesado nunca viaja — una
 * foto de celular de 4 MB sale de acá en unos 150 KB.
 *
 * Solo se usa desde componentes de cliente: necesita `document` y `canvas`.
 */

/** Ancho máximo de una portada. Más que esto no se nota en pantalla. */
const ANCHO_MAX = 1600;

/** 0.85 es el punto donde deja de verse la diferencia y el peso ya bajó. */
const CALIDAD = 0.85;

export interface ImagenLista {
  archivo: File;
  /** true si el navegador realmente entregó WebP. */
  esWebp: boolean;
  /** Peso original, para poder contarle al admin cuánto se ahorró. */
  pesoOriginal: number;
}

function cargar(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen")); };
    img.src = url;
  });
}

export async function aWebp(file: File): Promise<ImagenLista> {
  const img = await cargar(file);

  const escala = Math.min(1, ANCHO_MAX / img.naturalWidth);
  const ancho  = Math.round(img.naturalWidth  * escala);
  const alto   = Math.round(img.naturalHeight * escala);

  const lienzo = document.createElement("canvas");
  lienzo.width  = ancho;
  lienzo.height = alto;

  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("El navegador no pudo procesar la imagen");
  ctx.drawImage(img, 0, 0, ancho, alto);

  const blob = await new Promise<Blob | null>((resolve) =>
    lienzo.toBlob(resolve, "image/webp", CALIDAD)
  );
  if (!blob) throw new Error("No se pudo convertir la imagen");

  // Un navegador que no sabe exportar WebP devuelve PNG sin avisar. Se sube
  // igual —es un caso rarísimo y solo lo tocan admins—, pero se informa.
  const esWebp = blob.type === "image/webp";
  const extension = esWebp ? "webp" : blob.type === "image/jpeg" ? "jpg" : "png";
  const base = file.name.replace(/\.[^.]+$/, "") || "portada";

  return {
    archivo: new File([blob], `${base}.${extension}`, { type: blob.type }),
    esWebp,
    pesoOriginal: file.size,
  };
}

/** "1.4 MB", para mostrarle al admin qué pasó con su archivo. */
export function peso(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
