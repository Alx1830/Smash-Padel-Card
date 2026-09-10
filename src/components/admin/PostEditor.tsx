"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import Highlight from "@tiptap/extension-highlight";
import DOMPurify from "dompurify";
import { Eye, Save, Send, Trash2, ExternalLink, Bell, BellOff, ImageUp, Loader2, X, BarChart3, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { POST_TAGS, POST_ATTR, POST_CATEGORIAS, CATEGORIA_POR_DEFECTO, slugify, extractoAuto, minutosDeLectura, type Post, type PostCategoria } from "@/lib/posts";
import { aWebp, peso } from "@/lib/imagen-webp";
import { PostEditorToolbar } from "./PostEditorToolbar";

const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const ERR   = "#ff5d5d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const campo: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 9,
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)",
  color: INK0, fontFamily: MONO, fontSize: 13, outline: "none", boxSizing: "border-box",
};

const etiqueta: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase",
  color: INK2, display: "block", marginBottom: 7,
};

/**
 * Una opción de la encuesta. Las que ya existen conservan su `id`: si se
 * borraran para reinsertarlas, cada corrección de una coma se llevaría puestos
 * los votos, porque los votos apuntan al id de la opción.
 */
interface Opcion { id?: string; label: string }

/** Saneado del cuerpo. Corre siempre antes de guardar, nunca al leer. */
function sanear(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: POST_TAGS,
    ALLOWED_ATTR: POST_ATTR,
    ALLOWED_URI_REGEXP: /^https?:\/\//i,
    ADD_ATTR: ["target"],
    FORCE_BODY: true,
  });
}

export function PostEditor({ post, authorId }: { post: Post | null; authorId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [titulo,   setTitulo]   = useState(post?.title ?? "");
  const [bajada,   setBajada]   = useState(post?.excerpt ?? "");
  const [portada,  setPortada]  = useState(post?.cover_url ?? post?.media_url ?? "");
  const [categoria, setCategoria] = useState<PostCategoria>(post?.category ?? CATEGORIA_POR_DEFECTO);
  const [direccion, setDireccion] = useState(post?.slug ?? "");
  const [tocoDireccion, setTocoDireccion] = useState(Boolean(post?.slug));
  const [avisar,   setAvisar]   = useState(!post?.notified_at);
  // La encuesta se guarda aparte del post, después de tener su id.
  const [pregunta, setPregunta] = useState("");
  const [opciones, setOpciones] = useState<Opcion[]>([{ label: "" }, { label: "" }]);
  const [cerrada, setCerrada]   = useState(false);
  const [encuestaId, setEncuestaId] = useState<string | null>(null);
  const [borradas, setBorradas] = useState<string[]>([]);

  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
      }),
      Image.configure({ HTMLAttributes: { loading: "lazy", decoding: "async" } }),
      Youtube.configure({ controls: true, nocookie: true }),
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Escribí la noticia acá. Usá la barra de arriba para dar formato." }),
    ],
    content: post?.content_html ?? post?.content ?? "",
    editorProps: { attributes: { class: "post-editor-cuerpo" } },
  });

  /** Trae la encuesta guardada, si esta publicación ya tiene una. */
  useEffect(() => {
    if (!post) return;
    let vivo = true;
    (async () => {
      const { data } = await supabase
        .from("post_polls")
        .select("id, question, closes_at, post_poll_options(id, label, orden)")
        .eq("post_id", post.id)
        .maybeSingle();
      if (!vivo || !data) return;
      setEncuestaId(data.id);
      setPregunta(data.question);
      setCerrada(Boolean(data.closes_at && new Date(data.closes_at) <= new Date()));
      const ops = [...(data.post_poll_options ?? [])].sort((a, b) => a.orden - b.orden);
      if (ops.length) setOpciones(ops.map((o) => ({ id: o.id, label: o.label })));
    })();
    return () => { vivo = false; };
  }, [supabase, post]);

  /**
   * Guarda, cambia o borra la encuesta de la publicación.
   *
   * Sin pregunta o con menos de dos opciones no hay encuesta: si había una, se
   * borra. Es la forma de sacarla sin un botón aparte.
   */
  async function guardarEncuesta(postId: string) {
    const texto = pregunta.trim();
    const validas = opciones.filter((o) => o.label.trim());

    if (!texto || validas.length < 2) {
      if (encuestaId) {
        await supabase.from("post_polls").delete().eq("id", encuestaId);
        setEncuestaId(null);
      }
      return;
    }

    const { data: enc, error: errEnc } = await supabase
      .from("post_polls")
      .upsert({ post_id: postId, question: texto, closes_at: cerrada ? new Date().toISOString() : null },
              { onConflict: "post_id" })
      .select("id")
      .single();
    if (errEnc || !enc) throw new Error(errEnc?.message ?? "No se pudo guardar la encuesta");
    setEncuestaId(enc.id);

    if (borradas.length) {
      await supabase.from("post_poll_options").delete().in("id", borradas);
      setBorradas([]);
    }

    const viejas = validas.filter((o) => o.id);
    const nuevas = validas.filter((o) => !o.id);

    for (const o of viejas) {
      await supabase.from("post_poll_options")
        .update({ label: o.label.trim(), orden: validas.indexOf(o) })
        .eq("id", o.id!);
    }
    if (nuevas.length) {
      await supabase.from("post_poll_options").insert(
        nuevas.map((o) => ({ poll_id: enc.id, label: o.label.trim(), orden: validas.indexOf(o) }))
      );
    }

    const { data: frescas } = await supabase
      .from("post_poll_options").select("id, label, orden").eq("poll_id", enc.id).order("orden");
    if (frescas) setOpciones(frescas.map((o) => ({ id: o.id, label: o.label })));
  }

  /**
   * Elegir una imagen: se convierte a WebP acá mismo y se sube a R2 ya
   * liviana. La dirección que devuelve el servidor queda en el campo de
   * portada, así que también se puede pegar una a mano como siempre.
   */
  async function subirPortada(file: File) {
    setSubiendo(true);
    setMensaje(null);
    try {
      const lista = await aWebp(file);

      const form = new FormData();
      form.append("archivo", lista.archivo);
      form.append("nombre", titulo || direccion || "portada");
      if (portada.trim()) form.append("anterior", portada.trim());

      const res  = await fetch("/api/admin/posts/cover", { method: "POST", body: form });
      const info = await res.json().catch(() => null);
      if (!res.ok) throw new Error(info?.error ?? `Error ${res.status}`);

      setPortada(info.url);
      setMensaje({
        tipo: "ok",
        texto: lista.esWebp
          ? `Imagen subida: ${peso(lista.pesoOriginal)} → ${peso(lista.archivo.size)} en WebP.`
          : `Imagen subida (${peso(lista.archivo.size)}). Este navegador no exporta WebP, quedó en su formato original.`,
      });
    } catch (e) {
      setMensaje({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo subir la imagen" });
    } finally {
      setSubiendo(false);
      if (archivoRef.current) archivoRef.current.value = "";
    }
  }

  /** El título propone la dirección hasta que el admin la escribe a mano. */
  function cambiarTitulo(v: string) {
    setTitulo(v);
    if (!tocoDireccion) setDireccion(slugify(v));
  }

  async function guardar(estado: "draft" | "published") {
    if (!titulo.trim()) {
      setMensaje({ tipo: "error", texto: "Falta el título." });
      return;
    }
    const cuerpo = sanear(editor?.getHTML() ?? "");
    const ruta = (direccion.trim() ? slugify(direccion) : slugify(titulo)) || `post-${Date.now()}`;

    setGuardando(true);
    setMensaje(null);

    const fila = {
      user_id: authorId,
      title: titulo.trim(),
      slug: ruta,
      excerpt: bajada.trim() || extractoAuto(cuerpo),
      cover_url: portada.trim() || null,
      category: categoria,
      content_html: cuerpo,
      status: estado,
      published_at: estado === "published" ? (post?.published_at ?? new Date().toISOString()) : null,
    };

    const consulta = post
      ? supabase.from("admin_posts").update(fila).eq("id", post.id).select("id, slug").single()
      : supabase.from("admin_posts").insert(fila).select("id, slug").single();

    const { data, error } = await consulta;

    if (error) {
      const duplicado = error.code === "23505";
      setMensaje({
        tipo: "error",
        texto: duplicado
          ? "Ya existe otra publicación con esa dirección. Cambiala."
          : `No se pudo guardar: ${error.message}`,
      });
      setGuardando(false);
      return;
    }

    try {
      await guardarEncuesta(data.id);
    } catch (e) {
      setMensaje({ tipo: "error", texto: e instanceof Error ? e.message : "La publicación se guardó, pero la encuesta no." });
      setGuardando(false);
      router.refresh();
      return;
    }

    if (estado === "published" && avisar) {
      const res = await fetch("/api/admin/posts/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: data.id }),
      });
      const info = await res.json().catch(() => null);
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: `Se publicó, pero el aviso falló: ${info?.error ?? res.status}` });
        setGuardando(false);
        router.refresh();
        return;
      }
      setMensaje({
        tipo: "ok",
        texto: `Publicado. Avisamos a ${info?.notificados ?? 0} usuarios (${info?.push ?? 0} por push).`,
      });
    } else {
      setMensaje({ tipo: "ok", texto: estado === "published" ? "Publicado, sin avisar." : "Borrador guardado." });
    }

    setGuardando(false);
    if (!post) router.replace(`/dashboard/admin/feed/${data.id}`);
    else router.refresh();
  }

  async function borrar() {
    if (!post) return;
    if (!window.confirm("¿Borrar esta publicación? No se puede deshacer.")) return;
    setGuardando(true);
    const { error } = await supabase.from("admin_posts").delete().eq("id", post.id);
    if (error) {
      setMensaje({ tipo: "error", texto: `No se pudo borrar: ${error.message}` });
      setGuardando(false);
      return;
    }
    router.replace("/dashboard/admin/feed");
  }

  const cuerpoActual = editor?.getHTML() ?? "";
  const minutos = minutosDeLectura(cuerpoActual);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <style>{`
        .post-editor-cuerpo { min-height: 340px; padding: 18px 20px; outline: none;
          font-family: ${MONO}; font-size: 14px; line-height: 1.75; color: ${INK1}; }
        .post-editor-cuerpo p { margin: 0 0 14px; }
        .post-editor-cuerpo h2 { font-family: ${DISP}; font-size: 22px; color: ${INK0}; margin: 26px 0 12px; }
        .post-editor-cuerpo h3 { font-family: ${DISP}; font-size: 17px; color: ${INK0}; margin: 22px 0 10px; }
        .post-editor-cuerpo h4 { font-family: ${DISP}; font-size: 15px; color: ${INK0}; margin: 18px 0 8px; }
        .post-editor-cuerpo ul, .post-editor-cuerpo ol { margin: 0 0 14px; padding-left: 22px; }
        .post-editor-cuerpo li { margin-bottom: 6px; }
        .post-editor-cuerpo a { color: ${COURT}; text-decoration: underline; }
        .post-editor-cuerpo blockquote { margin: 18px 0; padding: 4px 0 4px 16px;
          border-left: 2px solid ${COURT}; color: ${INK0}; font-style: italic; }
        .post-editor-cuerpo img { max-width: 100%; border-radius: 10px; margin: 8px 0; }
        .post-editor-cuerpo iframe { max-width: 100%; aspect-ratio: 16 / 9; height: auto;
          border: 0; border-radius: 10px; margin: 8px 0; }
        .post-editor-cuerpo hr { border: 0; border-top: 1px solid rgba(255,255,255,0.12); margin: 24px 0; }
        .post-editor-cuerpo mark { background: ${LIME}; color: #05070d; padding: 0 3px; border-radius: 3px; }
        .post-editor-cuerpo pre { background: rgba(255,255,255,0.05); padding: 12px 14px;
          border-radius: 8px; overflow-x: auto; font-size: 12px; }
        .post-girando { animation: post-giro 900ms linear infinite; }
        @keyframes post-giro { to { transform: rotate(360deg); } }
        .post-editor-cuerpo p.is-editor-empty:first-child::before {
          content: attr(data-placeholder); float: left; height: 0; pointer-events: none; color: #4a5164; }
      `}</style>

      {/* Portada, título y bajada */}
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <label style={etiqueta} htmlFor="post-portada">Imagen de portada</label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input id="post-portada" style={{ ...campo, flex: 1, minWidth: 220 }} value={portada}
                   placeholder="Subí una imagen o pegá una dirección https"
                   onChange={(e) => setPortada(e.target.value)} />

            <input ref={archivoRef} type="file" accept="image/*" hidden
                   onChange={(e) => { const f = e.target.files?.[0]; if (f) subirPortada(f); }} />

            <button type="button" onClick={() => archivoRef.current?.click()} disabled={subiendo}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderRadius: 9,
                             border: `1px solid ${COURT}55`, background: "rgba(46,230,193,0.06)", color: COURT,
                             fontFamily: MONO, fontSize: 12, cursor: subiendo ? "default" : "pointer",
                             whiteSpace: "nowrap", opacity: subiendo ? 0.6 : 1 }}>
              {subiendo
                ? <><Loader2 size={14} className="post-girando" /> Subiendo…</>
                : <><ImageUp size={14} /> Subir imagen</>}
            </button>

            {portada.trim() && !subiendo && (
              <button type="button" onClick={() => setPortada("")} title="Quitar la portada"
                      style={{ display: "flex", alignItems: "center", padding: 11, borderRadius: 9,
                               border: "1px solid rgba(255,255,255,0.14)", background: "transparent",
                               color: INK2, cursor: "pointer" }}>
                <X size={14} />
              </button>
            )}
          </div>

          <span style={{ display: "block", fontFamily: MONO, fontSize: 10, color: INK2, marginTop: 7, lineHeight: 1.6 }}>
            Se convierte a WebP y se achica a 1600px antes de subirla, así pesa poco y carga rápido en el celular.
          </span>

          {portada.trim() && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={portada} alt="" loading="lazy" decoding="async"
                 style={{ marginTop: 10, width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)" }} />
          )}
        </div>

        <div>
          <label style={etiqueta} htmlFor="post-titulo">Título</label>
          <input id="post-titulo" style={{ ...campo, fontFamily: DISP, fontSize: 20, fontWeight: 700 }}
                 value={titulo} placeholder="Llegó Pitch Black" onChange={(e) => cambiarTitulo(e.target.value)} />
        </div>

        <div>
          <label style={etiqueta}>Sección</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {POST_CATEGORIAS.map((c) => {
              const activa = c.id === categoria;
              return (
                <button key={c.id} type="button" onClick={() => setCategoria(c.id)}
                        style={{
                          padding: "7px 14px", borderRadius: 999, cursor: "pointer",
                          fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
                          background: activa ? COURT : "rgba(255,255,255,0.03)",
                          color: activa ? "#05070d" : INK2,
                          border: `1px solid ${activa ? COURT : "rgba(255,255,255,0.09)"}`,
                        }}>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label style={etiqueta} htmlFor="post-bajada">
            Bajada — el resumen que se ve en la lista y al compartir (si la dejás vacía, se arma sola)
          </label>
          <textarea id="post-bajada" style={{ ...campo, minHeight: 60, resize: "vertical" }} value={bajada}
                    placeholder="Una o dos líneas contando de qué se trata"
                    onChange={(e) => setBajada(e.target.value)} />
        </div>

        <div>
          <label style={etiqueta} htmlFor="post-slug">Dirección de la publicación</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: INK2 }}>facebinder.com/post/</span>
            <input id="post-slug" style={{ ...campo, flex: 1, minWidth: 180 }} value={direccion}
                   placeholder="llego-pitch-black"
                   onChange={(e) => { setTocoDireccion(true); setDireccion(e.target.value); }} />
          </div>
        </div>
      </div>

      {/* Cuerpo */}
      <div style={{ border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>
        <PostEditorToolbar editor={editor} />
        <EditorContent editor={editor} />
        <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", fontFamily: MONO, fontSize: 10, color: INK2, letterSpacing: "0.1em" }}>
          {minutos} min de lectura
        </div>
      </div>

      {/* Encuesta */}
      <div style={{ border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "16px 18px", background: "rgba(255,255,255,0.02)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
          <BarChart3 size={14} color={COURT} />
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: COURT }}>
            Encuesta (opcional)
          </span>
        </div>
        <span style={{ display: "block", fontFamily: MONO, fontSize: 10, color: INK2, marginBottom: 13, lineHeight: 1.6 }}>
          Aparece al final de la nota. Solo pueden votar quienes tengan cuenta, y cada uno vota una vez.
          Dejá la pregunta vacía para que no haya encuesta.
        </span>

        <input style={campo} value={pregunta} placeholder="¿Vas a comprar sobres de 30th Celebration?"
               onChange={(e) => setPregunta(e.target.value)} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {opciones.map((o, i) => (
            <div key={o.id ?? `nueva-${i}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input style={{ ...campo, flex: 1 }} value={o.label} placeholder={`Opción ${i + 1}`}
                     onChange={(e) => setOpciones(opciones.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
              {opciones.length > 2 && (
                <button type="button" title="Quitar esta opción"
                        onClick={() => {
                          if (o.id) setBorradas([...borradas, o.id]);
                          setOpciones(opciones.filter((_, j) => j !== i));
                        }}
                        style={{ display: "flex", padding: 11, borderRadius: 9, cursor: "pointer",
                                 border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: INK2 }}>
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", marginTop: 11 }}>
          {opciones.length < 6 && (
            <button type="button" onClick={() => setOpciones([...opciones, { label: "" }])}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9,
                             border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: INK1,
                             fontFamily: MONO, fontSize: 11, cursor: "pointer" }}>
              <Plus size={12} /> Agregar opción
            </button>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: MONO, fontSize: 11, color: INK1 }}>
            <input type="checkbox" checked={cerrada} onChange={(e) => setCerrada(e.target.checked)}
                   style={{ accentColor: COURT, width: 15, height: 15 }} />
            Cerrar la votación (se siguen viendo los resultados)
          </label>
        </div>
      </div>

      {/* Vista previa */}
      {vistaPrevia && (
        <div style={{ border: `1px solid ${COURT}44`, borderRadius: 12, padding: "18px 20px", background: "rgba(46,230,193,0.03)" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: COURT, marginBottom: 12 }}>
            Así se va a ver
          </div>
          <h2 style={{ fontFamily: DISP, fontSize: "clamp(20px, 3vw, 28px)", color: INK0, margin: "0 0 8px" }}>{titulo || "Sin título"}</h2>
          <p style={{ fontFamily: MONO, fontSize: 12, color: INK2, margin: "0 0 16px" }}>{bajada || extractoAuto(cuerpoActual)}</p>
          <div className="post-editor-cuerpo" style={{ minHeight: 0, padding: 0 }}
               dangerouslySetInnerHTML={{ __html: sanear(cuerpoActual) }} />
        </div>
      )}

      {/* Aviso a los usuarios */}
      <label style={{
        display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", cursor: "pointer",
        borderRadius: 10, border: `1px solid ${avisar ? COURT + "55" : "rgba(255,255,255,0.09)"}`,
        background: avisar ? "rgba(46,230,193,0.05)" : "rgba(255,255,255,0.02)",
      }}>
        <input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)}
               style={{ marginTop: 2, accentColor: COURT, width: 16, height: 16 }} />
        <span>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 12, color: INK0 }}>
            {avisar ? <Bell size={13} color={COURT} /> : <BellOff size={13} color={INK2} />}
            Avisar a todos los usuarios al publicar
          </span>
          <span style={{ display: "block", fontFamily: MONO, fontSize: 10, color: INK2, marginTop: 5, lineHeight: 1.6 }}>
            Les llega el título en la campana y, a quienes las tengan activadas, también como notificación del celular.
            {post?.notified_at && " Esta publicación ya avisó una vez; si lo dejás marcado, vuelve a avisar."}
          </span>
        </span>
      </label>

      {mensaje && (
        <div style={{
          fontFamily: MONO, fontSize: 12, padding: "10px 14px", borderRadius: 9,
          color: mensaje.tipo === "ok" ? COURT : ERR,
          background: mensaje.tipo === "ok" ? "rgba(46,230,193,0.07)" : "rgba(255,93,93,0.07)",
          border: `1px solid ${mensaje.tipo === "ok" ? COURT + "44" : ERR + "44"}`,
        }}>
          {mensaje.texto}
        </div>
      )}

      {/* Acciones */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button type="button" onClick={() => guardar("published")} disabled={guardando}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 9, border: "none",
                         background: COURT, color: "#05070d", fontFamily: MONO, fontSize: 12, fontWeight: 700,
                         letterSpacing: "0.08em", cursor: guardando ? "default" : "pointer", opacity: guardando ? 0.6 : 1 }}>
          <Send size={14} /> {post?.status === "published" ? "Guardar cambios" : "Publicar"}
        </button>

        <button type="button" onClick={() => guardar("draft")} disabled={guardando}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 9,
                         border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: INK1,
                         fontFamily: MONO, fontSize: 12, cursor: guardando ? "default" : "pointer" }}>
          <Save size={14} /> Guardar borrador
        </button>

        <button type="button" onClick={() => setVistaPrevia((v) => !v)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 9,
                         border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: INK1,
                         fontFamily: MONO, fontSize: 12, cursor: "pointer" }}>
          <Eye size={14} /> {vistaPrevia ? "Ocultar vista previa" : "Vista previa"}
        </button>

        {post?.status === "published" && post.slug && (
          <a href={`/post/${post.slug}`} target="_blank" rel="noopener noreferrer"
             style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 9,
                      border: "1px solid rgba(255,255,255,0.14)", color: INK1, fontFamily: MONO, fontSize: 12, textDecoration: "none" }}>
            <ExternalLink size={14} /> Ver publicada
          </a>
        )}

        {post && (
          <button type="button" onClick={borrar} disabled={guardando}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 9,
                           border: `1px solid ${ERR}44`, background: "transparent", color: ERR,
                           fontFamily: MONO, fontSize: 12, cursor: "pointer", marginLeft: "auto" }}>
            <Trash2 size={14} /> Borrar
          </button>
        )}
      </div>
    </div>
  );
}
