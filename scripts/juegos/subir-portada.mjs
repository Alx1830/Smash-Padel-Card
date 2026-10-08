/**
 * Sube la portada de un juego del catálogo (/dashboard/juegos) a R2, en
 * juegos/<id>.webp. Recibe la imagen original en cualquier formato, la deja en
 * 800 px de ancho en WebP y la sube con caché larga.
 *
 * Uso:  node --env-file=.env.local scripts/juegos/subir-portada.mjs <id> <imagen>
 *  ej.  node --env-file=.env.local scripts/juegos/subir-portada.mjs type-master ~/portada.png
 *
 * Si se cambia una portada, usar un id nuevo (type-master-v2): R2 la sirve con
 * caché inmutable y los navegadores seguirían mostrando la vieja.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const ACCOUNT_ID = "f41f124769343cd4354765d6a149a75a";
const BUCKET = "facebinder-cards";

const [id, imagen] = process.argv.slice(2);
if (!id || !imagen) {
  console.error("Uso: node --env-file=.env.local scripts/juegos/subir-portada.mjs <id> <imagen>");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

const cuerpo = await sharp(imagen).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
await s3.send(new PutObjectCommand({
  Bucket: BUCKET, Key: `juegos/${id}.webp`, Body: cuerpo,
  ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable",
}));
console.log(`juegos/${id}.webp subida (${Math.round(cuerpo.length / 1024)} KB)`);
