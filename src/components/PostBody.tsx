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
          border: 1px solid rgba(255,255,255,0.07); margin: 24px 0; display: block;
          /* Tocarla la abre grande; el dedito de "clic acá" lo pone el cursor */
          cursor: zoom-in; }
        .post-cuerpo figure { margin: 24px 0; }
        .post-cuerpo figure img { margin: 0 0 8px; }
        .post-cuerpo figcaption { font-size: 11px; color: ${INK2}; text-align: center; }
        .post-cuerpo iframe { width: 100%; aspect-ratio: 16 / 9; height: auto; border: 0;
          border-radius: 12px; margin: 24px 0; display: block; }
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
