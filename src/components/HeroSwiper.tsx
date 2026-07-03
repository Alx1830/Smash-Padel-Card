import dynamic from "next/dynamic";
import { loadSetCards } from "@/data/pokemon-cards";

const ImageSwiper = dynamic(
  () => import("@/components/ui/image-swiper").then(m => ({ default: m.ImageSwiper })),
  { loading: () => <div style={{ width: 264, height: 370 }} /> }
);

/* Server Component: resuelve las imágenes en el servidor (sin round-trip
   de JSON pesado en el cliente) para que el hero aparezca en el HTML inicial. */
export async function HeroSwiper() {
  const cards = await loadSetCards("perfect-order");
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  const images = shuffled.slice(0, 10).map((c: { image: string }) => c.image).join(",");

  if (!images) return <div style={{ width: 264, height: 370 }} />;
  return <ImageSwiper images={images} cardWidth={264} cardHeight={370} />;
}
