/**
 * Sube las ilustraciones del minijuego "¿De qué tipo es?" (public/pokedex/*.webp,
 * que arma armar-juego-tipos.py) al bucket de R2, en pokedex/<id>.webp.
 * Las que ya están se saltan, así que se puede correr de nuevo cuando lleguen más.
 *
 * Uso:  node --env-file=.env.local scripts/pokedex/subir-ilustraciones-r2.mjs
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ACCOUNT_ID = "f41f124769343cd4354765d6a149a75a";
const BUCKET = "facebinder-cards";
const CARPETA = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "public", "pokedex");
const LOTE = 10;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

const yaEsta = async (clave) => {
  try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: clave })); return true; }
  catch { return false; }
};

const archivos = (await readdir(CARPETA)).filter(f => f.endsWith(".webp"));
let subidas = 0, saltadas = 0;
for (let i = 0; i < archivos.length; i += LOTE) {
  await Promise.all(archivos.slice(i, i + LOTE).map(async (f) => {
    const clave = `pokedex/${f}`;
    if (await yaEsta(clave)) { saltadas++; return; }
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: clave, Body: await readFile(path.join(CARPETA, f)),
      ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable",
    }));
    subidas++;
  }));
}
console.log(`ilustraciones: ${subidas} subidas, ${saltadas} ya estaban (${archivos.length} en total)`);
