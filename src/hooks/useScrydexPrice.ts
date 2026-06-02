"use client";

import { useState, useEffect } from "react";

export type ScrydexPrices = Record<string, number>; // { normal: 0.25, reverseHolofoil: 0.50 }

interface UseScrydexPriceOptions {
  setSlug: string;   // "chaos-rising"
  setCode: string;   // "me4"
  cardName: string;  // "Weedle"
  cardNumber: number;
  enabled?: boolean; // false para no hacer el fetch (carta de otro set sin soporte)
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

export function useScrydexPrice({
  setSlug,
  setCode,
  cardName,
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

    const params = new URLSearchParams({
      set:    setSlug,
      code:   setCode,
      name:   cardName.trim(),
      number: String(cardNumber),
    });

    fetch(`/api/prices?${params}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.error && !data.prices) {
          setError(data.error);
        } else {
          setPrices(data.prices ?? null);
        }
      })
      .catch(e => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [setSlug, setCode, cardName, cardNumber, enabled]);

  return { prices, loading, error };
}
