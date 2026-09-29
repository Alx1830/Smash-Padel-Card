/**
 * Guarda la imagen de portada de una publicación en R2.
 *
 * La conversión a WebP la hace el navegador antes de subir (ver
 * `src/lib/imagen-webp.ts`): acá llega un archivo ya liviano. No se convierte
 * en el servidor porque la app corre en Cloudflare Workers y `sharp` es un
 * binario de Node — anda en la máquina de desarrollo y se cae en producción.
 *
 * Solo un admin puede subir: la ruta escribe en el bucket con las llaves del
 * proyecto, así que la sesión se valida contra `players.role`.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { subirAR2, borrarDeR2, keyDeUrl } from "@/lib/r2";
import { slugify } from "@/lib/posts";

/** Carpeta del bucket donde viven las portadas. */
const PREFIJO = "posts/";

/** 6 MB ya convertido. Una portada WebP de 1600px pesa menos de 300 KB. */
const TOPE = 6 * 1024 * 1024;

const TIPOS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png":  "png",
};

async function esAdmin(): Promise<boolean> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: perfil } = await supabaseAdmin
    .from("players").select("role").eq("user_id", user.id).single();
  return perfil?.role === "admin";
}

/**
 * Devuelve los bytes de una imagen que está en otro sitio.
 *
 * La usa el editor cuando la portada se pegó como dirección en vez de subirse:
 * para armar la copia de compartir tiene que dibujarla en un canvas, y el
 * navegador no deja leer los píxeles de una imagen ajena sin CORS. Desde acá
 * no hay esa restricción. Es solo para admin, igual que la subida.
 */
export async function GET(request: NextRequest) {
  if (!(await esAdmin())) {
    return NextResponse.json({ error: "Solo un admin puede traer imágenes" }, { status: 403 });
  }

  const url = request.nextUrl.searchParams.get("traer") ?? "";
  if (!/^https:\/\//i.test(url)) {
    return NextResponse.json({ error: "La dirección tiene que empezar con https" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (FaceBinder)" } });
  } catch {
    return NextResponse.json({ error: "No se pudo bajar la imagen" }, { status: 502 });
  }

  const tipo = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (!res.ok || !tipo.startsWith("image/")) {
    return NextResponse.json({ error: "La dirección no devolvió una imagen" }, { status: 502 });
  }

  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > TOPE * 2) {
    return NextResponse.json({ error: "La imagen es demasiado pesada" }, { status: 413 });
  }

  return new NextResponse(bytes, { headers: { "Content-Type": tipo, "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!(await esAdmin())) {
    return NextResponse.json({ error: "Solo un admin puede subir imágenes" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "No llegó ningún archivo" }, { status: 400 });
  }

  const archivo = form.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "No llegó ningún archivo" }, { status: 400 });
  }

  const extension = TIPOS[archivo.type];
  if (!extension) {
    return NextResponse.json({ error: "Formato no admitido. Subí una imagen." }, { status: 400 });
  }
  if (archivo.size > TOPE) {
    return NextResponse.json({ error: "La imagen pesa más de 6 MB." }, { status: 400 });
  }

  // El nombre lleva el título para que el bucket se pueda leer a ojo, y una
  // cola al azar para que reemplazar una portada nunca pise la anterior.
  const nombre = slugify(String(form.get("nombre") ?? "")) || "portada";
  const key = `${PREFIJO}${nombre}-${crypto.randomUUID().slice(0, 8)}.${extension}`;

  let url: string;
  try {
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    url = await subirAR2(key, bytes, archivo.type);
  } catch (e) {
    const detalle = e instanceof Error ? e.message : "error desconocido";
    return NextResponse.json({ error: `No se pudo subir: ${detalle}` }, { status: 500 });
  }

  // Si esto reemplaza una portada anterior nuestra, la vieja se va: nadie la
  // va a volver a mirar y el bucket se cobra por lo que guarda. Que falle el
  // borrado no invalida la subida, que es lo que el admin está esperando.
  const anterior = String(form.get("anterior") ?? "");
  const keyVieja = anterior ? keyDeUrl(anterior, PREFIJO) : null;
  if (keyVieja && keyVieja !== key) {
    try { await borrarDeR2(keyVieja); } catch { /* queda huérfana, no es grave */ }
  }

  return NextResponse.json({ url });
}
