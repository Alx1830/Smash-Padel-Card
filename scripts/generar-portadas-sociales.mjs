/**
 * Le arma a cada nota su copia de portada para compartir.
 *
 * La portada del sitio se guarda en WebP, que es lo que conviene en la web,
 * pero WhatsApp no dibuja vista previa con WebP: el enlace sale pelado. Y las
 * portadas vienen de cualquier medida, mientras que las redes esperan
 * 1200x630 — declarar esa medida con una imagen más chica hace que Facebook
 * directamente descarte la foto.
 *
 * Este script recorre las notas que todavía no tienen la copia, la genera y la
 * guarda en el bucket. Es para las que ya estaban publicadas: las nuevas la
 * arman solas al publicarse.
 *
 *   node --env-file=.env.local scripts/generar-portadas-sociales.mjs
 *   node --env-file=.env.local scripts/generar-portadas-sociales.mjs --todas
 *
 * Con `--todas` rehace también las que ya la tienen, por si se cambió la forma
 * de armarla.
 */

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const REHACER = process.argv.includes("--todas");

const ACCOUNT_ID = "f41f124769343cd4354765d6a149a75a";
const BUCKET     = "facebinder-cards";
const PUBLICO    = "https://pub-01b8e296fe944e688fd2100376d4af4a.r2.dev";

const ANCHO = 1200;
const ALTO  = 630;

const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

/**
 * La foto va entera sobre una copia de sí misma difuminada, igual que en la
 * portada del sitio: recortar a 1200x630 le corta la cabeza a una carta
 * vertical, y una carta vertical es media portada de este sitio.
 */
async function armar(buffer) {
  const fondo = await sharp(buffer)
    .resize({ width: ANCHO, height: ALTO, fit: "cover" })
    .blur(28)
    .modulate({ brightness: 0.7, saturation: 1.3 })
    .toBuffer();

  const encima = await sharp(buffer)
    .resize({ width: ANCHO, height: ALTO, fit: "inside" })
    .toBuffer();

  return sharp(fondo)
    .composite([{ input: encima, gravity: "center" }])
    /* JPEG y no PNG: en PNG una foto pesa varias veces más y WhatsApp deja de
       mostrar la vista previa cuando el archivo se pasa de unos cientos de KB. */
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

let q = supabase
  .from("admin_posts")
  .select("id, slug, title, cover_url, media_url, og_image_url")
  .order("created_at", { ascending: false });
if (!REHACER) q = q.is("og_image_url", null);

const { data, error } = await q;
if (error) throw new Error(error.message);

const notas = (data ?? []).filter((n) => n.cover_url || n.media_url);
console.log(`${notas.length} notas por procesar`);

let hechas = 0;
for (const nota of notas) {
  const origen = nota.cover_url ?? nota.media_url;
  try {
    const res = await fetch(origen, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const social = await armar(Buffer.from(await res.arrayBuffer()));
    const key = `posts/social/${nota.slug ?? nota.id}.jpg`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: social,
      ContentType: "image/jpeg",
      /* Un día, no un año: si se corrige la portada de una nota, la vista
         previa vieja no puede quedarse pegada para siempre. */
      CacheControl: "public, max-age=86400",
    }));

    const { error: fallo } = await supabase
      .from("admin_posts")
      .update({ og_image_url: `${PUBLICO}/${key}` })
      .eq("id", nota.id);
    if (fallo) throw new Error(fallo.message);

    hechas++;
    console.log(`  ✓ ${nota.title} (${(social.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    console.warn(`  ! ${nota.title}: ${e.message}`);
  }
}

console.log(`Listo: ${hechas} de ${notas.length}`);
