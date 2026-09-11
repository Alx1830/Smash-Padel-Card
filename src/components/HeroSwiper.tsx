import ReactDOM from "react-dom";
import dynamic from "next/dynamic";
import { loadSetCards } from "@/data/pokemon-cards";
import { fotoChica } from "@/lib/foto-carta";

const ImageSwiper = dynamic(
  () => import("@/components/ui/image-swiper").then(m => ({ default: m.ImageSwiper })),
  { loading: () => <div style={{ width: 264, height: 370 }} /> }
);

/** Qué tanda de diez cartas toca ahora.
 *
 *  Va en una función aparte y asíncrona a propósito: leer el reloj es impuro y
 *  React prohíbe hacerlo en medio del render, con razón — el servidor y el
 *  navegador podrían quedar con órdenes distintos. Acá es un dato que se
 *  resuelve antes de dibujar, como cualquier consulta. */
async function tandaActual(): Promise<number> {
  return Math.floor(Date.now() / 600_000);
}

/* Server Component: resuelve las imágenes en el servidor (sin round-trip
   de JSON pesado en el cliente) para que el hero aparezca en el HTML inicial. */
export async function HeroSwiper() {
  const cards = await loadSetCards("perfect-order");

  /* Las cartas cambian solas, pero no al azar dentro del render: barajar con
     Math.random() puede dar un orden en el servidor y otro en el navegador, y
     entonces la carta que se precargo no es la que termina arriba. En su lugar
     la tanda se corre segun la hora, asi que la portada se renueva pero es la
     misma para todos los que la ven en ese momento. */
  /* Una misma carta figura varias veces en el set, una por variante (normal,
     reverse, holo), y todas apuntan a la misma foto: sin filtrar, el mazo
     mostraba la misma carta dos o tres veces. Se deja una por foto. */
  const vistas = new Set<string>();
  const unicas = cards.filter((c: { image: string }) => {
    if (!c.image || vistas.has(c.image)) return false;
    vistas.add(c.image);
    return true;
  });

  const tanda = await tandaActual();
  const desde = unicas.length > 0 ? (tanda * 10) % unicas.length : 0;
  const rotadas = [...unicas.slice(desde), ...unicas.slice(0, desde)];
  /* La de arriba en su tamaño original, porque es la que se mira; las nueve de
     atrás en copia chica, porque solo se les ve el borde. Son 1,9 MB contra
     unos 600 KB, sin que cambie nada en pantalla. */
  const images = rotadas
    .slice(0, 10)
    .map((c: { image: string }, i: number) => (i === 0 ? c.image : fotoChica(c.image)))
    .join(",");

  if (!images) return <div style={{ width: 264, height: 370 }} />;

  /* La carta de arriba es el elemento mas grande de la portada, o sea el que
     Google cronometra. Anunciarla en la cabecera hace que el navegador la pida
     apenas lee el HTML, en vez de esperar a que llegue el codigo del mazo. */
  ReactDOM.preload(images.split(",")[0], { as: "image", fetchPriority: "high" });

  return <ImageSwiper images={images} cardWidth={264} cardHeight={370} />;
}
