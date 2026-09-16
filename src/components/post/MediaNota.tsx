/**
 * La foto de una nota, en una caja de proporción fija.
 *
 * Las portadas no vienen todas iguales: una foto apaisada de un torneo y el
 * escaneo vertical de una carta conviven en la misma grilla. Recortar a lo
 * ancho le corta la cabeza a la carta, así que la imagen va entera (`contain`)
 * sobre una copia de sí misma difuminada, que rellena el borde con su propio
 * color. Ninguna portada queda con franjas negras ni recortada.
 *
 * Vive acá afuera porque la usan la portada, que se dibuja en el servidor, y
 * el carrusel de arriba, que corre en el navegador.
 */
export function MediaNota({
  src, clase, prioritaria = false,
}: {
  src: string | null;
  clase: string;
  prioritaria?: boolean;
}) {
  if (!src) return <div className={`${clase} np-sinfoto`} />;
  const carga = prioritaria
    ? { fetchPriority: "high" as const }
    : { loading: "lazy" as const };
  return (
    <div className={`${clase} np-media`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden decoding="async" {...carga} className="np-media-fondo" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" decoding="async" {...carga} className="np-media-foto" />
    </div>
  );
}
