"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter,
  Heading2, Heading3, List, ListOrdered, Quote, Code2, Minus,
  Link2, Link2Off, ImagePlus, CirclePlay, Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight,
} from "lucide-react";

const COURT = "#2ee6c1";
const INK1 = "#c9cfdd";
const INK2 = "#7a8298";

/** Una herramienta de la barra. `activa` la pinta como encendida. */
function Boton({
  onClick, activa, titulo, children, deshabilitada,
}: {
  onClick: () => void;
  activa?: boolean;
  titulo: string;
  children: React.ReactNode;
  deshabilitada?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      aria-pressed={activa}
      disabled={deshabilitada}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 32, height: 32, borderRadius: 7, cursor: deshabilitada ? "default" : "pointer",
        background: activa ? "rgba(46,230,193,0.14)" : "transparent",
        border: `1px solid ${activa ? COURT + "66" : "transparent"}`,
        color: deshabilitada ? "#4a5164" : activa ? COURT : INK1,
        transition: "background 120ms, color 120ms",
      }}
    >
      {children}
    </button>
  );
}

function Separador() {
  return <span style={{ width: 1, height: 20, background: "rgba(255,255,255,0.09)", margin: "0 2px" }} />;
}

export function PostEditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const ico = { size: 15, strokeWidth: 2 } as const;

  function ponerEnlace() {
    if (!editor) return;
    const previo = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Dirección del enlace", previo ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link")
      .setLink({ href: url.trim(), target: "_blank", rel: "noopener noreferrer" }).run();
  }

  function ponerImagen() {
    if (!editor) return;
    const url = window.prompt("Dirección de la imagen (https://...)");
    if (!url?.trim()) return;
    const alt = window.prompt("Descripción de la imagen (para quien no la puede ver)") ?? "";
    editor.chain().focus().setImage({ src: url.trim(), alt }).run();
  }

  function ponerVideo() {
    if (!editor) return;
    const url = window.prompt("Dirección del video de YouTube");
    if (!url?.trim()) return;
    editor.commands.setYoutubeVideo({ src: url.trim(), width: 640, height: 360 });
  }

  return (
    <div
      style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2,
        padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.02)", position: "sticky", top: 0, zIndex: 5,
        borderTopLeftRadius: 12, borderTopRightRadius: 12,
      }}
    >
      <Boton titulo="Negrita" onClick={() => editor.chain().focus().toggleBold().run()} activa={editor.isActive("bold")}><Bold {...ico} /></Boton>
      <Boton titulo="Cursiva" onClick={() => editor.chain().focus().toggleItalic().run()} activa={editor.isActive("italic")}><Italic {...ico} /></Boton>
      <Boton titulo="Subrayado" onClick={() => editor.chain().focus().toggleUnderline().run()} activa={editor.isActive("underline")}><UnderlineIcon {...ico} /></Boton>
      <Boton titulo="Tachado" onClick={() => editor.chain().focus().toggleStrike().run()} activa={editor.isActive("strike")}><Strikethrough {...ico} /></Boton>
      <Boton titulo="Resaltar" onClick={() => editor.chain().focus().toggleHighlight().run()} activa={editor.isActive("highlight")}><Highlighter {...ico} /></Boton>

      <Separador />

      <Boton titulo="Título de sección" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} activa={editor.isActive("heading", { level: 2 })}><Heading2 {...ico} /></Boton>
      <Boton titulo="Subtítulo" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} activa={editor.isActive("heading", { level: 3 })}><Heading3 {...ico} /></Boton>
      <Boton titulo="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()} activa={editor.isActive("bulletList")}><List {...ico} /></Boton>
      <Boton titulo="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()} activa={editor.isActive("orderedList")}><ListOrdered {...ico} /></Boton>
      <Boton titulo="Cita destacada" onClick={() => editor.chain().focus().toggleBlockquote().run()} activa={editor.isActive("blockquote")}><Quote {...ico} /></Boton>
      <Boton titulo="Bloque de código" onClick={() => editor.chain().focus().toggleCodeBlock().run()} activa={editor.isActive("codeBlock")}><Code2 {...ico} /></Boton>
      <Boton titulo="Línea separadora" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus {...ico} /></Boton>

      <Separador />

      <Boton titulo="Alinear a la izquierda" onClick={() => editor.chain().focus().setTextAlign("left").run()} activa={editor.isActive({ textAlign: "left" })}><AlignLeft {...ico} /></Boton>
      <Boton titulo="Centrar" onClick={() => editor.chain().focus().setTextAlign("center").run()} activa={editor.isActive({ textAlign: "center" })}><AlignCenter {...ico} /></Boton>
      <Boton titulo="Alinear a la derecha" onClick={() => editor.chain().focus().setTextAlign("right").run()} activa={editor.isActive({ textAlign: "right" })}><AlignRight {...ico} /></Boton>

      <Separador />

      <Boton titulo="Enlace" onClick={ponerEnlace} activa={editor.isActive("link")}><Link2 {...ico} /></Boton>
      <Boton titulo="Quitar enlace" onClick={() => editor.chain().focus().unsetLink().run()} deshabilitada={!editor.isActive("link")}><Link2Off {...ico} /></Boton>
      <Boton titulo="Imagen" onClick={ponerImagen}><ImagePlus {...ico} /></Boton>
      <Boton titulo="Video de YouTube" onClick={ponerVideo}><CirclePlay {...ico} /></Boton>

      <Separador />

      <Boton titulo="Deshacer" onClick={() => editor.chain().focus().undo().run()} deshabilitada={!editor.can().undo()}><Undo2 {...ico} /></Boton>
      <Boton titulo="Rehacer" onClick={() => editor.chain().focus().redo().run()} deshabilitada={!editor.can().redo()}><Redo2 {...ico} /></Boton>

      <span style={{ marginLeft: "auto", fontFamily: "var(--font-jetbrains)", fontSize: 9, letterSpacing: "0.14em", color: INK2, textTransform: "uppercase" }}>
        Editor
      </span>
    </div>
  );
}
