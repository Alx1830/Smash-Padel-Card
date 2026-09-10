/**
 * Subida de archivos al bucket de R2.
 *
 * El cliente se arma dentro de cada función, nunca al importar el módulo: en
 * el build de Cloudflare los secretos no existen, y un `new S3Client(...)` en
 * el cuerpo del archivo rompe la compilación de cualquier página que lo
 * importe, aunque nunca lo llame.
 *
 * El bucket, la cuenta y el dominio público no son secretos —están en los
 * scripts desde siempre—; las llaves sí, y salen del entorno.
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const ACCOUNT_ID = "f41f124769343cd4354765d6a149a75a";
const BUCKET     = "facebinder-cards";

/** Dominio desde el que se sirven los archivos del bucket. */
export const R2_PUBLIC = "https://pub-01b8e296fe944e688fd2100376d4af4a.r2.dev";

function cliente(): S3Client {
  const accessKeyId     = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Faltan R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/** Guarda el archivo y devuelve la dirección pública. */
export async function subirAR2(key: string, cuerpo: Uint8Array, tipo: string): Promise<string> {
  await cliente().send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: cuerpo,
    ContentType: tipo,
    // Un año: cada archivo lleva un nombre único, así que nunca cambia de
    // contenido. Reemplazar una portada crea un archivo nuevo, no pisa este.
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return `${R2_PUBLIC}/${key}`;
}

export async function borrarDeR2(key: string): Promise<void> {
  await cliente().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * De una dirección pública al key del bucket, solo si la dirección es nuestra.
 * Devuelve null para cualquier otra cosa, que es lo que evita que alguien
 * mande una URL ajena y termine borrando algo que no le corresponde.
 */
export function keyDeUrl(url: string, prefijo: string): string | null {
  if (!url.startsWith(`${R2_PUBLIC}/`)) return null;
  const key = url.slice(R2_PUBLIC.length + 1).split("?")[0];
  return key.startsWith(prefijo) ? key : null;
}
