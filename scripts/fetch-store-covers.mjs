/**
 * Descarga las 4 portadas autorizadas y las guarda como WebP liviano
 * en public/covers/. Uso: node fetch-covers.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const OUT = path.resolve(import.meta.dirname, "../public/covers");

const SOURCES = [
  { slug: "pikachu",  url: "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/26887395-78f4-441d-a6e0-cc877fa24b54/deejrt3-3c33eed3-d378-4f78-b8c6-fc6fa60575d9.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiIvZi8yNjg4NzM5NS03OGY0LTQ0MWQtYTZlMC1jYzg3N2ZhMjRiNTQvZGVlanJ0My0zYzMzZWVkMy1kMzc4LTRmNzgtYjhjNi1mYzZmYTYwNTc1ZDkucG5nIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.0Ae13UoB0VogWMMtKf04KuWsgkVTjICI6PAGf4vAdLY" },
  { slug: "energias", url: "https://asia.pokemon-card.com/sg/wp-content/uploads/sites/6/2022/08/EG_news_zoombg_01_1280.jpeg" },
  { slug: "dorsos",   url: "https://images.squarespace-cdn.com/content/v1/67fecc9ef0cec617cb14ac37/1752598072908-MVLLGFLLVBMBT8ZNECMG/unsplash-image-t_x5URJUK4c.jpg" },
  { slug: "megaevo",  url: "https://d1i787aglh9bmb.cloudfront.net/assets/img/me-expansions/me05/header/en-us/me05-large-fallback.png" },
];

fs.mkdirSync(OUT, { recursive: true });

for (const { slug, url } of SOURCES) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 FaceBinder/1.0" } });
    if (!res.ok) { console.error(`❌ ${slug}: HTTP ${res.status}`); continue; }
    const input = Buffer.from(await res.arrayBuffer());
    const meta  = await sharp(input).metadata();

    // Portada ancha: 1600px basta y baja mucho el peso
    const out = await sharp(input)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 58 })
      .toBuffer();

    const file = path.join(OUT, `${slug}.webp`);
    fs.writeFileSync(file, out);
    const outMeta = await sharp(out).metadata();
    console.log(
      `✅ ${slug}.webp — origen ${meta.width}x${meta.height} ${(input.length / 1024).toFixed(0)}KB ` +
      `→ ${outMeta.width}x${outMeta.height} ${(out.length / 1024).toFixed(0)}KB`
    );
  } catch (err) {
    console.error(`❌ ${slug}: ${err.message}`);
  }
}
