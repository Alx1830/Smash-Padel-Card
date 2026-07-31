import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Busca en el catálogo de TCGplayer el set que corresponde a un enlace pegado
 * por el admin, para confirmar qué se va a traer antes de encargarlo.
 *
 * La consulta va desde el servidor porque el navegador no puede llamar a la API
 * de TCGplayer directamente (el navegador bloquea la petición entre dominios).
 */

const SEARCH_API = "https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: prof } = await supabase.from("players").select("role").eq("user_id", user.id).single();
  return prof?.role === "admin" ? user : null;
}

/** Del enlace saca el texto que nombra al set: el slug o el término buscado. */
function pistaDe(entrada: string): string {
  const s = entrada.trim();
  try {
    const u = new URL(s);
    const q = u.searchParams.get("q");
    if (q) return q;
    // .../search/pokemon/prize-pack-series-cards → "prize pack series cards"
    const partes = u.pathname.split("/").filter(Boolean);
    const ultima = partes[partes.length - 1] ?? "";
    if (ultima && ultima !== "product") return ultima.replace(/-/g, " ");
    return "";
  } catch {
    return s;   // no es una URL: se asume que pegó el nombre
  }
}

const norm = (s: string) => s.toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/^(sv|swsh|sm|xy|bw|hgss|dp|pl|ex|me|mee|hs|neo)\d*(pt\d)?:\s*/i, "")
  .replace(/^(sm|xy|hs|bw|dp|pl|swsh|sv)\s*-\s*/i, "")
  .replace(/\bpokemon\b/g, "")
  .replace(/&/g, "and")
  .replace(/[^a-z0-9]/g, "");

/** Similitud por bigramas, 0 a 1. */
function similar(a: string, b: string) {
  const bi = (s: string) => {
    const g = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2));
    return g;
  };
  const A = bi(a), B = bi(b);
  if (!A.size || !B.size) return a === b ? 1 : 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

export async function POST(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Falta el enlace del set" }, { status: 400 });
  }

  const pista = pistaDe(url);
  if (!pista) {
    return NextResponse.json({ error: "De ese enlace no se puede deducir el set. Pega el enlace de la colección o su nombre." }, { status: 400 });
  }

  let sets: { name: string; cards: number }[];
  try {
    const res = await fetch(SEARCH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.tcgplayer.com",
        Referer: "https://www.tcgplayer.com/",
        "User-Agent": UA,
      },
      body: JSON.stringify({
        algorithm: "sales_synonym_v2", from: 0, size: 1,
        filters: { term: { productLineName: ["pokemon"], productTypeName: ["Cards"] }, range: {}, match: {} },
        listingSearch: {
          context: { cart: {} },
          filters: { term: { sellerStatus: "Live", channelId: 0 }, range: { quantity: { gte: 1 } }, exclude: { channelExclusion: 0 } },
        },
        context: { cart: {}, shippingCountry: "US", userProfile: {} },
        settings: { useFuzzySearch: true, didYouMean: {} },
        aggregations: ["setName"],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    sets = (json.results?.[0]?.aggregations?.setName ?? [])
      .map((b: { value: string; count: number }) => ({ name: b.value, cards: b.count }));
  } catch {
    return NextResponse.json({ error: "TCGplayer no respondió. Inténtalo de nuevo en un momento." }, { status: 502 });
  }

  const p = norm(pista);
  const exacto = sets.find(s => norm(s.name) === p);
  if (exacto) return NextResponse.json({ set: exacto, exacto: true });

  const cerca = sets
    .map(s => ({ ...s, score: +similar(p, norm(s.name)).toFixed(2) }))
    .sort((a, b) => b.score - a.score)
    .filter(s => s.score > 0.45)
    .slice(0, 5);

  if (!cerca.length) {
    return NextResponse.json({ error: `No hay ningún set de TCGplayer parecido a «${pista}».` }, { status: 404 });
  }
  return NextResponse.json({ set: cerca[0], exacto: false, candidatos: cerca });
}
