import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Un carrusel de fotos dentro de una noticia.
 *
 * Nació para cubrir un set nuevo: son casi trescientas cartas y ponerlas una
 * debajo de otra deja una nota de veinte pantallas de alto que nadie termina.
 * En un carrusel ocupan una sola fila y quien quiera ver se desliza.
 *
 * Se guarda como HTML corriente —un `div` con las `img` adentro— y no como un
 * formato nuestro. Es a propósito: si algún día se cambia el editor, o si
 * alguien lee la nota sin que corra nada, las fotos siguen ahí y se ven. El
 * `data-slider` es solo la marca para que la hoja de estilos las acomode en
 * fila.
 */
export const SliderFotos = Node.create({
  name: "sliderFotos",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      /** Las direcciones, separadas por coma, en el orden en que se muestran */
      imagenes: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-imagenes") ?? "",
        renderHTML: (attrs) => ({ "data-imagenes": attrs.imagenes }),
      },
      /** Texto opcional debajo del carrusel */
      leyenda: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-leyenda") ?? "",
        renderHTML: (attrs) => (attrs.leyenda ? { "data-leyenda": attrs.leyenda } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-slider]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const urls = String(node.attrs.imagenes ?? "")
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);

    const fotos = urls.map((url) => [
      "img",
      { src: url, alt: "", loading: "lazy", decoding: "async" },
    ]);

    const leyenda = node.attrs.leyenda
      ? [["span", { class: "post-slider-leyenda" }, node.attrs.leyenda]]
      : [];

    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-slider": "", class: "post-slider" }),
      ["div", { class: "post-slider-fila" }, ...fotos],
      ...leyenda,
    ];
  },
});
