import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Mapea el texto de variante que muestra Scrydex → nuestro key interno
const VARIANT_MAP: Record<string, string> = {
  "normal":              "normal",
  "reverse holofoil":    "reverseHolofoil",
  "reverse holo":        "reverseHolofoil",
  "holofoil":            "holofoil",
  "holo":                "holofoil",
  "cosmos holofoil":     "cosmosHolofoil",
  "cracked ice holofoil":"crackedIceHolofoil",
  "energy symbol":       "energySymbol",
  "poke ball":           "pokeBall",
  "pokeball":            "pokeBall",
  "normal alternate":    "normalAlternate",
  "first edition":       "firstEdition",
  "unlimited":           "unlimited",
};

function normalizeVariantKey(raw: string): string {
  const lower = raw.trim().toLowerCase();
  return VARIANT_MAP[lower] ?? lower.replace(/\s+/g, "");
}

function toCardSlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isStale(updatedAt: string): boolean {
  const updatedDay = new Date(updatedAt).toLocaleDateString("en-CA");
  const todayDay   = new Date().toLocaleDateString("en-CA");
  return updatedDay < todayDay;
}

async function scrapeFromScrydex(
  cardSlug: string,
  cardId: string
): Promise<Record<string, number>> {
  const baseUrl = `https://scrydex.com/pokemon/cards/${cardSlug}/${cardId}`;
  const browser = await chromium.launch({ headless: true });
  const normalized: Record<string, number> = {};

  try {
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });

    // Cargar la página sin variante para detectar cuáles existen
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1500);

    const title = await page.title();
    if (title.includes("Not Found") || title.includes("404")) {
      return normalized;
    }

    // Leer las variantes disponibles desde el bloque "SELECT VARIANT"
    const availableVariants: string[] = await page.evaluate(() => {
      const text = document.body.innerText;
      const lines = text.split("\n").map((l) => l.trim()).filter((l) => l);
      const idx = lines.findIndex((l) => l.toUpperCase() === "SELECT VARIANT");
      if (idx === -1) return [];

      const variants: string[] = [];
      // Las variantes siguen al bloque SELECT VARIANT hasta "DATA SOURCES"
      for (let i = idx + 1; i < lines.length && i < idx + 10; i++) {
        if (lines[i].toUpperCase().includes("DATA SOURCE")) break;
        variants.push(lines[i]);
      }
      return variants;
    });

    // Si no encontró variantes, intentar leer la variante activa directamente
    const variantsToFetch =
      availableVariants.length > 0
        ? availableVariants
        : await page.evaluate(() => {
            const text = document.body.innerText;
            const lines = text.split("\n").map((l) => l.trim()).filter((l) => l);
            // Buscar el nombre de variante que aparece antes de NEAR MINT
            const nmIdx = lines.findIndex((l) => l.toUpperCase() === "NEAR MINT");
            if (nmIdx > 0) return [lines[nmIdx - 1]];
            return [];
          });

    // Por cada variante, navegar a su URL y extraer el precio NM
    for (const variantRaw of variantsToFetch) {
      const variantParam = normalizeVariantKey(variantRaw);
      const url = `${baseUrl}?variant=${variantParam}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1000);

      const price = await page.evaluate(() => {
        const lines = document.body.innerText
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l);
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toUpperCase() === "NEAR MINT" && i + 1 < lines.length) {
            const match = lines[i + 1].replace(/,/g, "").match(/\$?([\d.]+)/);
            if (match) return parseFloat(match[1]);
          }
        }
        return null;
      });

      if (price !== null) {
        normalized[variantParam] = price;
      }
    }
  } finally {
    await browser.close();
  }

  return normalized;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const setCode  = searchParams.get("code");
  const cardName = searchParams.get("name");
  const number   = searchParams.get("number");

  if (!setCode || !cardName || !number) {
    return NextResponse.json(
      { error: "Se requieren: code, name, number" },
      { status: 400 }
    );
  }

  const cardSlug = toCardSlug(cardName);
  const cardId   = `${setCode}-${number}`;

  // 1. Buscar en caché de Supabase
  const { data: cached, error: dbError } = await supabase
    .from("card_prices")
    .select("prices, updated_at")
    .eq("card_id", cardId)
    .single();

  if (!dbError && cached && !isStale(cached.updated_at)) {
    return NextResponse.json({
      source: "cache",
      prices: cached.prices as Record<string, number>,
    });
  }

  // 2. Cache miss o dato vencido — ir a Scrydex
  const prices = await scrapeFromScrydex(cardSlug, cardId);

  if (Object.keys(prices).length === 0) {
    return NextResponse.json(
      { error: "No se encontraron precios en Scrydex", cardId },
      { status: 502 }
    );
  }

  // 3. Guardar / actualizar en Supabase
  await supabase.from("card_prices").upsert(
    { card_id: cardId, prices, updated_at: new Date().toISOString() },
    { onConflict: "card_id" }
  );

  return NextResponse.json({ source: "scrydex", prices });
}
