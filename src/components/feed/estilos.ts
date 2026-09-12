/**
 * Lo que comparten los dos muros del panel: el marco, la cabecera y la lista
 * que se recorre por dentro.
 *
 * Vive acá y no dentro de uno de los dos porque si no el otro dependía de que
 * su hermano estuviera en pantalla para verse bien, y bastaba con esconder uno
 * para que el otro se desarmara.
 */

const MONO  = "var(--font-jetbrains)";
const COURT = "#2ee6c1";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";

export const ESTILOS_MURO = `
  .mu-caja { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px; padding: 18px; display: flex; flex-direction: column;
    min-width: 0; height: 100%; min-height: 0; }

  /* Sin columna al lado que le dé el alto —el celular, o cuando los muros
     bajan a lo ancho— se le pone uno cómodo y la lista sigue recorriéndose
     por dentro. */
  @media (max-width: 1500px) {
    .mu-caja { max-height: 640px; }
  }

  .mu-cabeza { display: flex; align-items: center; gap: 9px; margin-bottom: 14px;
    flex-shrink: 0; }
  .mu-titulo { font-family: ${MONO}; font-size: 9px; letter-spacing: 0.18em;
    text-transform: uppercase; color: ${INK2}; margin: 0; font-weight: 400; }
  .mu-vertodo { margin-left: auto; font-family: ${MONO}; font-size: 9px;
    letter-spacing: 0.1em; text-transform: uppercase; color: ${COURT};
    text-decoration: none; }

  /* Se recorre por dentro: así las columnas quedan parejas y el panel no se
     estira hasta el infinito a medida que llegan más. */
  .mu-lista { flex: 1; min-height: 0; display: flex; flex-direction: column;
    gap: 9px; overflow-y: auto; padding-right: 4px; }
  .mu-lista::-webkit-scrollbar { width: 5px; }
  .mu-lista::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }

  .mu-hueco { height: 74px; border-radius: 11px; background: rgba(255,255,255,0.05);
    animation: mu-late 1.4s ease-in-out infinite; flex-shrink: 0; }
  @keyframes mu-late { 0%, 100% { opacity: 0.3 } 50% { opacity: 0.65 } }

  .mu-vacio, .mu-fin { font-family: ${MONO}; font-size: 10px; color: ${INK2};
    margin: 0; text-align: center; padding: 10px 0; line-height: 1.7; }
  .mu-caja p, .mu-caja span { color: ${INK1}; }
`;
