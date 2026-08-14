/**
 * Genera las pantallas de arranque de la PWA en iOS (apple-touch-startup-image).
 * iOS las pinta antes de cargar nada, así que son la única forma de que el logo
 * aparezca al instante en vez del fondo vacío.
 *
 * Uso: node scripts/generate-splash.mjs
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";

const LOGO = "C:/Users/Usuario/Documents/VIBE CODING/FACEBINDER PROJECT/brand/logo.webp";
const OUT  = "public/splash";
const BG   = { r: 5, g: 7, b: 13, alpha: 1 };   // #05070d, el fondo de la app

/* Portrait de cada iPhone con pantalla soportada, en píxeles reales */
const PANTALLAS = [
  { w: 1320, h: 2868, dw: 440, dh: 956, dpr: 3 },  // 16 Pro Max
  { w: 1206, h: 2622, dw: 402, dh: 874, dpr: 3 },  // 16 Pro
  { w: 1290, h: 2796, dw: 430, dh: 932, dpr: 3 },  // 14/15/16 Pro Max, Plus
  { w: 1179, h: 2556, dw: 393, dh: 852, dpr: 3 },  // 14 Pro, 15, 16
  { w: 1284, h: 2778, dw: 428, dh: 926, dpr: 3 },  // 12/13 Pro Max
  { w: 1170, h: 2532, dw: 390, dh: 844, dpr: 3 },  // 12/13/14
  { w: 1125, h: 2436, dw: 375, dh: 812, dpr: 3 },  // X, XS, 11 Pro
  { w: 1242, h: 2688, dw: 414, dh: 896, dpr: 3 },  // XS Max, 11 Pro Max
  { w:  828, h: 1792, dw: 414, dh: 896, dpr: 2 },  // XR, 11
  { w:  750, h: 1334, dw: 375, dh: 667, dpr: 2 },  // SE 2/3, 8
  { w:  640, h: 1136, dw: 320, dh: 568, dpr: 2 },  // SE 1
];

fs.mkdirSync(OUT, { recursive: true });

const links = [];
for (const { w, h, dw, dh, dpr } of PANTALLAS) {
  /* El logo ocupa el 62% del ancho: legible sin invadir la pantalla */
  const logoW = Math.round(w * 0.62);
  const logo  = await sharp(LOGO).resize({ width: logoW }).png().toBuffer();
  const meta  = await sharp(logo).metadata();

  const file = `apple-splash-${w}x${h}.png`;
  await sharp({ create: { width: w, height: h, channels: 4, background: BG } })
    .composite([{
      input: logo,
      left: Math.round((w - logoW) / 2),
      top:  Math.round((h - (meta.height ?? 0)) / 2),
    }])
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(OUT, file));

  const kb = (fs.statSync(path.join(OUT, file)).size / 1024).toFixed(1);
  console.log(`${file}  ${kb} KB`);

  links.push(`  { url: "/splash/${file}", media: "(device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" },`);
}

console.log("\n// Pegar en metadata.appleWebApp.startupImage:\n" + links.join("\n"));
