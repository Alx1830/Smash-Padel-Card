"use client";

import { useState, useEffect } from "react";
import { ImageSwiper } from "@/components/ui/image-swiper";
import { loadSetCards } from "@/data/pokemon-cards";

export function HeroSwiper() {
  const [images, setImages] = useState<string | null>(null);

  useEffect(() => {
    loadSetCards("perfect-order").then(cards => {
      const shuffled = [...cards].sort(() => Math.random() - 0.5);
      setImages(shuffled.slice(0, 10).map((c: { image: string }) => c.image).join(","));
    });
  }, []);

  if (!images) return <div style={{ width: 264, height: 370 }} />;
  return <ImageSwiper images={images} cardWidth={264} cardHeight={370} />;
}
