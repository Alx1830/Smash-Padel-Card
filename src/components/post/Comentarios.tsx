"use client";

/**
 * Comentarios de una noticia.
 *
 * Leerlos no pide nada: la nota se comparte por WhatsApp y se lee sin sesión.
 * Escribir sí exige estar registrado, y quien no lo esté ve una invitación a
 * entrar en lugar del cuadro de texto. Eso lo garantiza la RLS de
 * `post_comments`, no esta pantalla.
 *
 * Las respuestas son de un solo nivel: se responde a un comentario, no a una
 * respuesta. Un árbol de tres o cuatro niveles no se lee en un celular.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, Trash2, CornerDownRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { nombreAutor, type PostAuthor } from "@/lib/posts";

const COURT = "#2ee6c1";
const ERR   = "#ff5d5d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface Comentario {
  id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
}

type Perfiles = Record<string, PostAuthor & { user_id: string }>;

/** "hace 3 h", "hace 2 d". Más viejo que una semana, la fecha. */
function cuando(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1)   return "recién";
  if (min < 60)  return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7)     return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" });
}

function Avatar({ perfil, size = 34 }: { perfil?: PostAuthor; size?: number }) {
  const inicial = (nombreAutor(perfil ?? null)[0] ?? "?").toUpperCase();
  const estilo: React.CSSProperties = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    border: "1px solid rgba(255,255,255,0.1)", objectFit: "cover",
  };
  if (perfil?.photo_url) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={perfil.photo_url} alt="" loading="lazy" decoding="async" style={estilo} />;
  }
  return (
    <span style={{
      ...estilo, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(46,230,193,0.12)", color: COURT,
      fontFamily: DISP, fontSize: size * 0.42, fontWeight: 700,
    }}>
      {inicial}
    </span>
  );
}

export function Comentarios({ postId }: { postId: string }) {
  const supabase = createClient();

  const [usuario, setUsuario]   = useState<string | null>(null);
  const [esAdmin, setEsAdmin]   = useState(false);
  const [lista, setLista]       = useState<Comentario[]>([]);
  const [perfiles, setPerfiles] = useState<Perfiles>({});
  const [cargando, setCargando] = useState(true);

  const [texto, setTexto]       = useState("");
  const [respondiendo, setRespondiendo] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  /** Trae los comentarios y, en una segunda consulta, quiénes los escribieron. */
  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("id, user_id, parent_id, body, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    const filas = (data ?? []) as Comentario[];
    setLista(filas);

    // La llave foránea apunta a auth.users, así que el perfil no se puede
    // traer con un join: va en una consulta aparte, por lote.
    const ids = [...new Set(filas.map((c) => c.user_id))];
    if (ids.length) {
      const { data: gente } = await supabase
        .from("players")
        .select("user_id, username, first_name, last_name, photo_url")
        .in("user_id", ids);
      const mapa: Perfiles = {};
      for (const p of gente ?? []) mapa[p.user_id] = p as Perfiles[string];
      setPerfiles(mapa);
    }
    setCargando(false);
  }, [supabase, postId]);

  useEffect(() => {
    let vivo = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!vivo) return;
      setUsuario(user?.id ?? null);
      if (user) {
        const { data: perfil } = await supabase
          .from("players").select("role").eq("user_id", user.id).maybeSingle();
        if (vivo) setEsAdmin(perfil?.role === "admin");
      }
      await cargar();
    })();

    return () => { vivo = false; };
  }, [supabase, cargar]);

  async function comentar(cuerpo: string, parent: string | null) {
    const limpio = cuerpo.trim();
    if (!limpio || !usuario) return;

    setEnviando(true);
    setError(null);
    const { data: creado, error: err } = await supabase.from("post_comments").insert({
      post_id: postId, user_id: usuario, parent_id: parent, body: limpio,
    }).select("id").single();
    setEnviando(false);

    if (err) { setError(`No se pudo publicar: ${err.message}`); return; }

    // Los admins se enteran del comentario. Que el aviso falle no es motivo
    // para decirle a nadie que su comentario no se publicó: ya está guardado.
    if (creado) {
      fetch("/api/post-comments/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: creado.id }),
      }).catch(() => { /* el comentario ya quedó; el aviso es secundario */ });
    }

    if (parent) { setRespuesta(""); setRespondiendo(null); } else { setTexto(""); }
    await cargar();
  }

  async function borrar(id: string) {
    if (!window.confirm("¿Borrar este comentario?")) return;
    const { error: err } = await supabase.from("post_comments").delete().eq("id", id);
    if (err) { setError(`No se pudo borrar: ${err.message}`); return; }
    await cargar();
  }

  const raiz = lista.filter((c) => !c.parent_id);
  const hijos = (id: string) => lista.filter((c) => c.parent_id === id);

  const caja: React.CSSProperties = {
    width: "100%", padding: "11px 13px", borderRadius: 10, resize: "vertical",
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)",
    color: INK0, fontFamily: MONO, fontSize: 13, lineHeight: 1.6, outline: "none",
    boxSizing: "border-box", minHeight: 74,
  };

  const boton: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px",
    borderRadius: 9, border: "none", background: COURT, color: "#05070d",
    fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer",
  };

  function Comentario({ c, respuestaDe }: { c: Comentario; respuestaDe?: boolean }) {
    const perfil = perfiles[c.user_id];
    const propio = c.user_id === usuario;
    return (
      <div style={{ display: "flex", gap: 11, marginLeft: respuestaDe ? 26 : 0 }}>
        {perfil?.username ? (
          <Link href={`/${perfil.username}`} style={{ display: "flex", flexShrink: 0 }}>
            <Avatar perfil={perfil} size={respuestaDe ? 28 : 34} />
          </Link>
        ) : (
          <Avatar perfil={perfil} size={respuestaDe ? 28 : 34} />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            {perfil?.username ? (
              <Link href={`/${perfil.username}`} style={{
                fontFamily: DISP, fontSize: 13, fontWeight: 700, color: INK0, textDecoration: "none",
              }}>
                {nombreAutor(perfil)}
              </Link>
            ) : (
              <span style={{ fontFamily: DISP, fontSize: 13, fontWeight: 700, color: INK0 }}>
                {nombreAutor(perfil ?? null)}
              </span>
            )}
            <span style={{ fontFamily: MONO, fontSize: 10, color: INK2 }}>{cuando(c.created_at)}</span>
          </div>

          <p style={{
            fontFamily: MONO, fontSize: 13, lineHeight: 1.7, color: INK1,
            margin: "5px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {c.body}
          </p>

          <div style={{ display: "flex", gap: 14, marginTop: 7 }}>
            {usuario && !respuestaDe && (
              <button type="button" onClick={() => { setRespondiendo(respondiendo === c.id ? null : c.id); setRespuesta(""); }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none",
                               padding: 0, cursor: "pointer", fontFamily: MONO, fontSize: 10.5, color: INK2 }}>
                <CornerDownRight size={11} /> Responder
              </button>
            )}
            {(propio || esAdmin) && (
              <button type="button" onClick={() => borrar(c.id)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none",
                               padding: 0, cursor: "pointer", fontFamily: MONO, fontSize: 10.5, color: ERR }}>
                <Trash2 size={11} /> Borrar
              </button>
            )}
          </div>

          {respondiendo === c.id && (
            <div style={{ marginTop: 10 }}>
              <textarea style={{ ...caja, minHeight: 60 }} value={respuesta} autoFocus
                        placeholder={`Respondiendo a ${nombreAutor(perfil ?? null)}`}
                        onChange={(e) => setRespuesta(e.target.value)} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" style={{ ...boton, opacity: enviando || !respuesta.trim() ? 0.5 : 1 }}
                        disabled={enviando || !respuesta.trim()}
                        onClick={() => comentar(respuesta, c.id)}>
                  <Send size={12} /> Responder
                </button>
                <button type="button" onClick={() => setRespondiendo(null)}
                        style={{ background: "none", border: "none", cursor: "pointer",
                                 fontFamily: MONO, fontSize: 11, color: INK2 }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section style={{ marginTop: 46, paddingTop: 26, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 20 }}>
        <MessageCircle size={16} color={COURT} />
        <h2 style={{ fontFamily: DISP, fontSize: 18, fontWeight: 700, color: INK0, margin: 0 }}>
          Comentarios
        </h2>
        {!cargando && lista.length > 0 && (
          <span style={{ fontFamily: MONO, fontSize: 11, color: INK2 }}>({lista.length})</span>
        )}
      </div>

      {usuario ? (
        <div style={{ marginBottom: 26 }}>
          <textarea style={caja} value={texto} placeholder="Escribí lo que pensás de esta noticia"
                    onChange={(e) => setTexto(e.target.value)} />
          <button type="button" style={{ ...boton, marginTop: 9, opacity: enviando || !texto.trim() ? 0.5 : 1 }}
                  disabled={enviando || !texto.trim()} onClick={() => comentar(texto, null)}>
            {enviando ? <Loader2 size={12} className="pd-girando" /> : <Send size={12} />} Comentar
          </button>
        </div>
      ) : (
        <div style={{
          border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 12, padding: "20px 22px",
          marginBottom: 26, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14,
        }}>
          <p style={{ fontFamily: MONO, fontSize: 12, color: INK2, margin: 0, lineHeight: 1.7, flex: 1, minWidth: 200 }}>
            Los comentarios son para la gente registrada en FaceBinder. Entrá con tu cuenta para dejar el tuyo.
          </p>
          <Link href="/login" style={{ ...boton, textDecoration: "none" }}>Entrar</Link>
        </div>
      )}

      {error && (
        <p style={{ fontFamily: MONO, fontSize: 12, color: ERR, marginBottom: 16 }}>{error}</p>
      )}

      {cargando ? (
        <p style={{ fontFamily: MONO, fontSize: 12, color: INK2 }}>Cargando comentarios…</p>
      ) : raiz.length === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: 12, color: INK2, lineHeight: 1.7 }}>
          Todavía no hay comentarios. Sé el primero en opinar.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {raiz.map((c) => (
            <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Comentario c={c} />
              {hijos(c.id).map((r) => <Comentario key={r.id} c={r} respuestaDe />)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
