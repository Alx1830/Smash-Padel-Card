"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

export type ScrydexPrices = Record<string, number>; // { normal: 0.25, reverseHolofoil: 0.50 }

interface UseScrydexPriceOptions {
  setSlug: string;   // "chaos-rising"
  setCode: string;   // "me4"
  cardName: string;  // "Weedle"
  cardNumber: number;
  enabled?: boolean;
}

interface UseScrydexPriceResult {
  prices: ScrydexPrices | null;
  loading: boolean;
  error: string | null;
}

// Sets que tienen código de Scrydex conocido
export const SCRYDEX_SET_CODES: Record<string, string> = {
  "chaos-rising": "me4",
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useScrydexPrice({
  setCode,
  cardNumber,
  enabled = true,
}: UseScrydexPriceOptions): UseScrydexPriceResult {
  const [prices, setPrices]   = useState<ScrydexPrices | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !setCode) return;

    let cancelled = false;
    setLoading(true);
    setPrices(null);
    setError(null);

    const cardId = `${setCode}-${cardNumber}`;

    supabase
      .from("card_prices")
      .select("prices")
      .eq("card_id", cardId)
      .single()
      .then(({ data, error: dbErr }) => {
        if (cancelled) return;
        if (dbErr || !data) {
          setError("Sin precio");
        } else {
          setPrices(data.prices as ScrydexPrices);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [setCode, cardNumber, enabled]);

  return { prices, loading, error };
}
