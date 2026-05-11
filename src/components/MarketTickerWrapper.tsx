"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const MarketTicker = dynamic(() => import("@/components/MarketTicker").then(m => m.MarketTicker), { ssr: false });

export function MarketTickerWrapper() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 60, height: "32px" }}>
      <MarketTicker />
    </div>
  );
}
