"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const COURT = "#2ee6c1";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";


interface Post {
  id: string;
  title: string;
  media_url: string | null;
  content: string | null;
  created_at: string;
  author: {
    username: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
  } | null;
}

/* ── Rich text toolbar ── */
function RichToolbar({ editorRef }: { editorRef: React.RefObject<HTMLDivElement> }) {
  const [clipOpen, setClipOpen] = useState(false);
  const [clipUrl,  setClipUrl]  = useState("");
  const clipRef = useRef<HTMLDivElement>(null);

  function cmd(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  function insertMedia() {
    const url = clipUrl.trim();
    if (!url) return;

    const isYouTube = /youtu\.be|youtube\.com/i.test(url);
    const isImage   = /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(url);
    const isVideo   = /\.(mp4|webm|ogg)(\?|$)/i.test(url);

    let html = "";
    if (isYouTube) {
      const id = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/)?.[1];
      if (id) html = `<div class="post-media-wrap"><iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;border-radius:10px;display:block;"></iframe></div><p><br></p>`;
    } else if (isImage) {
      html = `<div class="post-media-wrap"><img src="${url}" style="max-width:100%;border-radius:10px;display:block;"></div><p><br></p>`;
    } else if (isVideo) {
      html = `<div class="post-media-wrap"><video controls style="max-width:100%;border-radius:10px;display:block;"><source src="${url}"></video></div><p><br></p>`;
    } else {
      html = `<p><a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#2ee6c1;">${url}</a></p>`;
    }

    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    setClipUrl("");
    setClipOpen(false);
  }

  // Cerrar popover al hacer clic fuera
  useEffect(() => {
    if (!clipOpen) return;
    function onOutside(e: MouseEvent) {
      if (clipRef.current && !clipRef.current.contains(e.target as Node)) setClipOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [clipOpen]);

  const btnStyle = (title: string, children: React.ReactNode) => (
    <button
      key={title}
      title={title}
      onMouseDown={e => { e.preventDefault(); }}
      onClick={() => {
        if (title === "Bold") cmd("bold");
        else if (title === "Italic") cmd("italic");
        else if (title === "Tachado") cmd("strikeThrough");
        else if (title === "Izquierda") cmd("justifyLeft");
        else if (title === "Centro") cmd("justifyCenter");
        else if (title === "Derecha") cmd("justifyRight");
        else if (title === "Lista") cmd("insertUnorderedList");
        else if (title === "Lista numerada") cmd("insertOrderedList");
      }}
      style={{
        padding: "5px 9px", borderRadius: "5px", border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)", color: INK1, cursor: "pointer",
        fontFamily: MONO, fontSize: "11px", lineHeight: 1,
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.07)", alignItems: "center" }}>
      {btnStyle("Bold",           <b>B</b>)}
      {btnStyle("Italic",         <i>I</i>)}
      {btnStyle("Tachado",        <s>S</s>)}
      <div style={{ width: "1px", background: "rgba(255,255,255,0.1)", margin: "0 4px", alignSelf: "stretch" }} />
      {btnStyle("Izquierda",      "⬛︎ ≡")}
      {btnStyle("Centro",         "≡")}
      {btnStyle("Derecha",        "≡ ⬛︎")}
      <div style={{ width: "1px", background: "rgba(255,255,255,0.1)", margin: "0 4px", alignSelf: "stretch" }} />
      {btnStyle("Lista",          "• Lista")}
      {btnStyle("Lista numerada", "1. Lista")}
      <div style={{ width: "1px", background: "rgba(255,255,255,0.1)", margin: "0 4px", alignSelf: "stretch" }} />

      {/* Botón clip — insertar media */}
      <div ref={clipRef} style={{ position: "relative" }}>
        <button
          title="Insertar imagen o video"
          onMouseDown={e => e.preventDefault()}
          onClick={() => setClipOpen(v => !v)}
          style={{
            padding: "5px 9px", borderRadius: "5px", cursor: "pointer",
            fontFamily: MONO, fontSize: "13px", lineHeight: 1,
            border: clipOpen ? `1px solid ${COURT}88` : "1px solid rgba(255,255,255,0.1)",
            background: clipOpen ? `${COURT}18` : "rgba(255,255,255,0.04)",
            color: clipOpen ? COURT : INK1,
            transition: "all 0.15s",
          }}
        >
          📎
        </button>

        {clipOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 100,
            background: "#0e1119", border: `1px solid ${COURT}44`,
            borderRadius: "10px", padding: "12px", width: "280px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
          }}>
            <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: "0 0 8px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              URL de imagen, video o YouTube
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                autoFocus
                value={clipUrl}
                onChange={e => setClipUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); insertMedia(); } }}
                placeholder="https://…"
                style={{
                  flex: 1, padding: "8px 10px", borderRadius: "6px",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: INK0, fontFamily: MONO, fontSize: "11px", outline: "none",
                }}
              />
              <button
                onClick={insertMedia}
                style={{
                  padding: "8px 12px", borderRadius: "6px", border: "none", cursor: "pointer",
                  background: COURT, color: "#05070d",
                  fontFamily: MONO, fontSize: "11px", fontWeight: 700,
                }}
              >
                ↵
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Media renderer ── */
function MediaBlock({ url }: { url: string }) {
  const isYouTube = /youtu\.be|youtube\.com/i.test(url);
  const isImage   = /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(url);
  const isVideo   = /\.(mp4|webm|ogg)(\?|$)/i.test(url);

  if (isYouTube) {
    const id = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/)?.[1];
    if (!id) return null;
    return (
      <div style={{ position: "relative", paddingBottom: "56.25%", borderRadius: "12px", overflow: "hidden", background: "#000" }}>
        <iframe src={`https://www.youtube.com/embed/${id}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }

  if (isImage) {
    return (
      <div style={{ borderRadius: "12px", overflow: "hidden", position: "relative", width: "100%", maxHeight: "480px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" style={{ width: "100%", height: "auto", maxHeight: "480px", objectFit: "cover", display: "block" }} />
      </div>
    );
  }

  if (isVideo) {
    return (
      <video controls style={{ width: "100%", borderRadius: "12px", maxHeight: "480px" }}>
        <source src={url} />
      </video>
    );
  }

  /* Link genérico */
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: MONO, fontSize: "11px", color: COURT, borderBottom: `1px solid ${COURT}44`, textDecoration: "none" }}>
      🔗 {url}
    </a>
  );
}

/* ── Post card ── */
function PostCard({ post, isAdmin, onDelete }: { post: Post; isAdmin: boolean; onDelete: (id: string) => void }) {
  const date = new Date(post.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

  return (
    <article style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "18px", overflow: "hidden",
      marginBottom: "20px",
    }}>
      {/* Author row */}
      <div style={{ padding: "18px 20px 0", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: `${COURT}22`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISP, fontSize: "15px", fontWeight: 700, color: COURT }}>
          {post.author?.photo_url
            ? <Image src={post.author.photo_url} alt="" fill style={{ objectFit: "cover" }} unoptimized />
            : `${post.author?.first_name?.[0] ?? ""}${post.author?.last_name?.[0] ?? ""}`}
        </div>
        <div style={{ flex: 1 }}>
          <a href={`/${post.author?.username}`} style={{ fontFamily: MONO, fontSize: "12px", color: INK0, fontWeight: 600, textDecoration: "none" }}>
            @{post.author?.username}
          </a>
          <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: "2px 0 0", letterSpacing: "0.06em" }}>{date}</p>
        </div>
        {isAdmin && (
          <button onClick={() => onDelete(post.id)} style={{ background: "none", border: "none", color: "#d95555", cursor: "pointer", fontFamily: MONO, fontSize: "10px", letterSpacing: "0.08em", padding: "4px 8px", borderRadius: "6px", opacity: 0.7 }}>
            Eliminar
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "14px 20px 20px" }}>
        {post.title && (
          <h3 style={{ fontFamily: DISP, fontSize: "clamp(18px, 3vw, 24px)", color: INK0, margin: "0 0 12px", letterSpacing: "-0.01em" }}>
            {post.title}
          </h3>
        )}

        {post.media_url && (
          <div style={{ marginBottom: "14px" }}>
            <MediaBlock url={post.media_url} />
          </div>
        )}

        {post.content && (
          <div
            className="post-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
            style={{ fontFamily: MONO, fontSize: "13px", color: INK1, lineHeight: 1.75, letterSpacing: "0.02em" }}
          />
        )}
      </div>
    </article>
  );
}

/* ── Admin composer ── */
function AdminComposer({ authorId, onPublished }: { authorId: string; onPublished: (post: Post) => void }) {
  const supabase = createClient();
  const editorRef = useRef<HTMLDivElement>(null!);
  const [title,    setTitle]    = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [saving,   setSaving]   = useState(false);

  async function handlePublish() {
    const content = editorRef.current?.innerHTML ?? "";
    if (!title.trim() && !content.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("admin_posts")
      .insert({ user_id: authorId, title: title.trim(), media_url: mediaUrl.trim() || null, content: content || null })
      .select("id, title, media_url, content, created_at, user_id")
      .single();

    if (!error && data) {
      const { data: prof } = await supabase.from("players").select("username, first_name, last_name, photo_url").eq("user_id", authorId).single();
      onPublished({ ...data, author: prof ?? null });
      setTitle(""); setMediaUrl("");
      if (editorRef.current) editorRef.current.innerHTML = "";
    }
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
    color: INK0, fontFamily: MONO, fontSize: "13px", outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ background: "rgba(46,230,193,0.04)", border: `1px solid ${COURT}33`, borderRadius: "18px", marginBottom: "28px", overflow: "hidden" }}>
      {/* Header admin */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontFamily: MONO, fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: COURT }}>✦ Publicar como admin</span>
      </div>

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Título */}
        <input
          style={inputStyle}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título del post…"
        />

        {/* Media URL */}
        <input
          style={{ ...inputStyle, fontSize: "11px" }}
          value={mediaUrl}
          onChange={e => setMediaUrl(e.target.value)}
          placeholder="URL de imagen, video o YouTube (opcional)"
        />

        {/* Rich text editor */}
        <div style={{ border: "1px solid rgba(255,255,255,0.09)", borderRadius: "8px", overflow: "hidden" }}>
          <RichToolbar editorRef={editorRef} />
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Escribe el contenido del post…"
            style={{
              minHeight: "120px", padding: "12px 14px",
              color: INK1, fontFamily: MONO, fontSize: "13px",
              lineHeight: 1.75, outline: "none",
            }}
          />
        </div>

        <button
          onClick={handlePublish}
          disabled={saving}
          style={{
            alignSelf: "flex-end", padding: "10px 28px", borderRadius: "10px",
            background: `linear-gradient(90deg, ${COURT}, #d6ff3d)`,
            border: "none", cursor: saving ? "default" : "pointer",
            fontFamily: MONO, fontSize: "12px", fontWeight: 700, color: BG0,
            letterSpacing: "0.08em", opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Publicando…" : "Publicar →"}
        </button>
      </div>
    </div>
  );
}

/* ── Main component ── */
export function AdminFeed({ currentUserId, currentUsername, isAdmin = false }: { currentUserId: string; currentUsername: string | null; isAdmin?: boolean }) {
  const supabase = createClient();
  const [posts,   setPosts]   = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      /* Fetch admin user_id (busca el primer usuario con role = 'admin') */
      const { data: adminProf } = await supabase
        .from("players")
        .select("user_id")
        .eq("role", "admin")
        .single();

      if (!adminProf) { setLoading(false); return; }

      const { data: rows } = await supabase
        .from("admin_posts")
        .select("id, title, media_url, content, created_at, user_id")
        .eq("user_id", adminProf.user_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!rows || rows.length === 0) { setLoading(false); return; }

      /* Join author profile */
      const { data: prof } = await supabase
        .from("players")
        .select("username, first_name, last_name, photo_url")
        .eq("user_id", adminProf.user_id)
        .single();

      setPosts(rows.map(r => ({ ...r, author: prof ?? null })));
      setLoading(false);
    })();
  }, []);

  async function handleDelete(id: string) {
    await supabase.from("admin_posts").delete().eq("id", id);
    setPosts(prev => prev.filter(p => p.id !== id));
  }

  return (
    <section>
      <style>{`
        .post-content b, .post-content strong { color: #f5f7fb; }
        .post-content i, .post-content em { color: #c9cfdd; }
        .post-content s { opacity: 0.6; }
        .post-content ul, .post-content ol { padding-left: 20px; margin: 8px 0; }
        .post-content li { margin-bottom: 4px; }
        .post-content img { max-width: 100%; border-radius: 10px; display: block; margin: 12px 0; }
        .post-content video { max-width: 100%; border-radius: 10px; display: block; margin: 12px 0; }
        .post-content iframe { width: 100%; aspect-ratio: 16/9; border-radius: 10px; display: block; margin: 12px 0; border: none; }
        .post-content .post-media-wrap { margin: 12px 0; }
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #7a8298; pointer-events: none; }
        [contenteditable] img { max-width: 100%; border-radius: 10px; display: block; margin: 12px 0; }
        [contenteditable] iframe { width: 100%; aspect-ratio: 16/9; border-radius: 10px; display: block; margin: 12px 0; border: none; }
        [contenteditable] video { max-width: 100%; border-radius: 10px; display: block; margin: 12px 0; }
      `}</style>

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
        <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
        <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: COURT }}>Feed</span>
      </div>

      {/* Composer (solo admin) */}
      {isAdmin && (
        <AdminComposer
          authorId={currentUserId}
          onPublished={post => setPosts(prev => [post, ...prev])}
        />
      )}

      {/* Posts */}
      {loading ? (
        <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.1em" }}>Cargando feed…</p>
      ) : posts.length === 0 ? (
        <div style={{ border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "16px", padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
            {isAdmin ? "Aún no has publicado nada" : "No hay publicaciones aún"}
          </p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard key={post.id} post={post} isAdmin={isAdmin} onDelete={handleDelete} />
        ))
      )}
    </section>
  );
}
