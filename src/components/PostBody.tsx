/**
 * El cuerpo de una noticia, con los estilos de lectura.
 *
 * El HTML llega ya saneado desde el editor (DOMPurify corre antes de guardar) y
 * solo un admin puede escribir en `admin_posts`, así que acá se pinta tal cual:
 * en el servidor no hay DOM para volver a sanearlo.
 */

const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export function PostBody({ html }: { html: string }) {
  return (
    <>
      <style>{`
        .post-cuerpo { font-family: ${MONO}; font-size: 15px; line-height: 1.85; color: ${INK1}; }
        .post-cuerpo > *:first-child { margin-top: 0; }
        .post-cuerpo p { margin: 0 0 18px; }
        .post-cuerpo h2 { font-family: ${DISP}; font-size: clamp(20px, 3.4vw, 26px); color: ${INK0};
          margin: 38px 0 14px; line-height: 1.25; letter-spacing: -0.01em; }
        .post-cuerpo h3 { font-family: ${DISP}; font-size: clamp(17px, 2.8vw, 20px); color: ${INK0};
          margin: 30px 0 12px; line-height: 1.3; }
        .post-cuerpo h4 { font-family: ${DISP}; font-size: 16px; color: ${INK0}; margin: 24px 0 10px; }
        .post-cuerpo ul, .post-cuerpo ol { margin: 0 0 18px; padding-left: 24px; }
        .post-cuerpo li { margin-bottom: 8px; }
        .post-cuerpo li::marker { color: ${COURT}; }
        .post-cuerpo a { color: ${COURT}; text-decoration: underline; text-underline-offset: 3px; }
        .post-cuerpo strong, .post-cuerpo b { color: ${INK0}; font-weight: 700; }
        .post-cuerpo mark { background: ${LIME}; color: #05070d; padding: 1px 4px; border-radius: 3px; }
        .post-cuerpo blockquote { margin: 26px 0; padding: 14px 0 14px 20px;
          border-left: 2px solid ${COURT}; font-family: ${DISP}; font-size: 17px;
          font-style: italic; color: ${INK0}; line-height: 1.6; }
        .post-cuerpo blockquote p:last-child { margin-bottom: 0; }
        .post-cuerpo img { max-width: 100%; height: auto; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.07); margin: 24px 0; display: block; }
        .post-cuerpo figure { margin: 24px 0; }
        .post-cuerpo figure img { margin: 0 0 8px; }
        .post-cuerpo figcaption { font-size: 11px; color: ${INK2}; text-align: center; }
        .post-cuerpo iframe { width: 100%; aspect-ratio: 16 / 9; height: auto; border: 0;
          border-radius: 12px; margin: 24px 0; display: block; }
        /* ── Carrusel de fotos ──────────────────────────────────────────
           Una fila que se desliza, con enganche: el dedo suelta y la foto
           queda derecha. Es CSS y nada más, así que funciona aunque el
           navegador no corra nada y no hay salto de diseño al cargar. */
        .post-slider { margin: 26px 0; position: relative; }
        .post-slider-fila {
          display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px;
          scroll-snap-type: x mandatory; scroll-behavior: smooth;
          scrollbar-width: thin; scrollbar-color: ${COURT}66 rgba(255,255,255,0.06);
          /* La barra fija de iOS se despega si un ancestro crea contenedor de
             scroll vertical; acá el scroll es solo horizontal, que no molesta. */
          overscroll-behavior-x: contain;
        }
        .post-slider-fila::-webkit-scrollbar { height: 6px; }
        .post-slider-fila::-webkit-scrollbar-track { background: rgba(255,255,255,0.06); border-radius: 3px; }
        .post-slider-fila::-webkit-scrollbar-thumb { background: ${COURT}66; border-radius: 3px; }
        .post-slider-fila img {
          flex: 0 0 auto; width: 150px; height: auto; margin: 0;
          scroll-snap-align: start; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.07);
        }
        .post-slider-leyenda {
          display: block; font-size: 11px; color: ${INK2}; margin-top: 8px;
          letter-spacing: 0.04em;
        }
        .post-slider-flecha {
          position: absolute; top: calc(50% - 24px); transform: translateY(-50%);
          width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center;
          background: rgba(5,7,13,0.86); border: 1px solid rgba(255,255,255,0.14);
          color: ${INK0}; cursor: pointer; font-size: 16px; line-height: 1;
          transition: border-color 140ms, background 140ms; z-index: 2;
        }
        .post-slider-flecha:hover { border-color: ${COURT}; background: #05070d; }
        .post-slider-flecha[hidden] { display: none; }
        .post-slider-flecha.izq { left: 4px; }
        .post-slider-flecha.der { right: 4px; }

        @media (pointer: coarse) {
          /* En el celular se desliza con el dedo: las flechas estorban */
          .post-slider-flecha { display: none; }
          .post-slider-fila img { width: 122px; }
        }

        .post-cuerpo hr { border: 0; border-top: 1px solid rgba(255,255,255,0.12); margin: 34px 0; }
        .post-cuerpo pre { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          padding: 14px 16px; border-radius: 10px; overflow-x: auto; font-size: 12.5px; margin: 0 0 18px; }
        .post-cuerpo code { font-size: 13px; color: ${LIME}; }
        .post-cuerpo pre code { color: ${INK1}; }

        @media (max-width: 767px), (pointer: coarse) {
          .post-cuerpo { font-size: 14px; line-height: 1.8; }
        }
      `}</style>
      <div className="post-cuerpo" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
