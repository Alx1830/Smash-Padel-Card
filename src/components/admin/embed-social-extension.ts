import { Node, mergeAttributes } from "@tiptap/core";
import { direccionIncrustado, type RedSocial } from "@/lib/embed-social";

/**
 * Un video de Instagram, TikTok o X dentro de una noticia.
 *
 * Igual que el carrusel, se guarda como HTML corriente —un `div` con un
 * `iframe` adentro— y no como un formato nuestro: si mañana se cambia el
 * editor, o si alguien lee la nota sin que corra nada, el video sigue ahí.
 * `data-embed` es la marca que usa la hoja de estilos para darle a cada red su
 * medida, y `data-embed-id` es lo que permite volver a editarlo después.
 */
export const EmbedSocial = Node.create({
  name: "embedSocial",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      /** "instagram" | "tiktok" | "x" */
      red: {
        default: "instagram",
        parseHTML: (el) => el.getAttribute("data-embed") ?? "instagram",
        renderHTML: (attrs) => ({ "data-embed": attrs.red }),
      },
      /** El código de la publicación en esa red */
      id: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-embed-id") ?? "",
        renderHTML: (attrs) => ({ "data-embed-id": attrs.id }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-embed]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const red = String(node.attrs.red ?? "instagram") as RedSocial;
    const id = String(node.attrs.id ?? "");

    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "post-embed" }),
      [
        "iframe",
        {
          src: direccionIncrustado(red, id),
          loading: "lazy",
          frameborder: "0",
          scrolling: "no",
          allowfullscreen: "true",
          allow: "accelerometer; clipboard-write; encrypted-media; picture-in-picture",
        },
      ],
    ];
  },
});
