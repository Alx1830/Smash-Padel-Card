export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // Scrydex blocks Vercel's proxy — serve directly without optimization
  if (src.includes("scrydex.com")) return src;
  // Default Next.js optimization for everything else
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
