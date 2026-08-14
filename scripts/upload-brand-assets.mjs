/**
 * Sube los assets de marca (logo y favicon) a R2.
 *
 * Uso: node --env-file=.env.local scripts/upload-brand-assets.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ACCOUNT_ID = "f41f124769343cd4354765d6a149a75a";
const BUCKET     = "facebinder-cards";
const PUBLIC_URL = "https://pub-01b8e296fe944e688fd2100376d4af4a.r2.dev";
const BRAND_DIR  = path.resolve(__dirname, "../../brand");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

/* La versión en el key evita que el CDN sirva el logo viejo en caché */
const FILES = [
  { local: "logo.webp",    key: "brand/logo-v2.webp",    type: "image/webp" },
  { local: "favicon.webp", key: "brand/favicon-v2.webp", type: "image/webp" },
];

for (const { local, key, type } of FILES) {
  const body = fs.readFileSync(path.join(BRAND_DIR, local));
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: type,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  console.log(`✅ ${local} (${(body.length / 1024).toFixed(1)} KB) → ${PUBLIC_URL}/${key}`);
}
