"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { CustomSelect } from "@/components/ui/custom-select";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

type Torneo = { nombre: string; posicion: string };

interface PerfilForm {
  username: string;
  first_name: string;
  last_name: string;
  category: string;
  position: "Drive" | "Revés" | "";
  ciudad: string;
  edad: string;
  mano_dominante: string;
  pala: string;
  tenis: string;
  paletero: string;
  torneos: Torneo[];
  photo_url: string;
}

/* ── Comprime imagen en el cliente antes de subir ── */
async function compressImage(file: File, maxPx = 480, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => blob ? resolve(blob) : reject("compress failed"), "image/webp", quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <label style={{
        display: "block", fontFamily: MONO, fontSize: "10px",
        letterSpacing: "0.15em", textTransform: "uppercase",
        color: INK2, marginBottom: "8px",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "8px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: INK0, fontFamily: MONO, fontSize: "13px",
  outline: "none", boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const MANO_OPTS    = [
  { value: "Diestro",      label: "Diestro" },
  { value: "Zurdo",        label: "Zurdo" },
  { value: "Ambidiestro",  label: "Ambidiestro" },
];
const POSICION_OPTS = [
  { value: "Drive",  label: "Drive" },
  { value: "Revés",  label: "Revés" },
];
const CATEGORIA_OPTS = ["1RA","2DA","3RA","4TA","5TA","6TA","7MA"].map(c => ({
  value: `${c} CATEGORÍA`, label: `${c} CATEGORÍA`,
}));

export default function PerfilPage() {
  const supabase     = createClient();
  const fileRef      = useRef<HTMLInputElement>(null);
  const [saving, setSaving]           = useState(false);
  const [saved,  setSaved]            = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [photoSaved, setPhotoSaved]   = useState(false);
  const [photoError, setPhotoError]   = useState("");
  const [userId, setUserId]           = useState<string | null>(null);
  // Ref espejo de userId para acceso sincrónico dentro de callbacks asíncronos
  const userIdRef = useRef<string | null>(null);
  const [preview, setPreview]         = useState<string>("");
  const [usernameFixed, setUsernameFixed] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [form, setForm] = useState<PerfilForm>({
    username: "", first_name: "", last_name: "",
    category: "", position: "", ciudad: "",
    edad: "", mano_dominante: "",
    pala: "", tenis: "", paletero: "",
    torneos: [{ nombre: "", posicion: "" }],
    photo_url: "",
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      userIdRef.current = user.id;
      const { data } = await supabase
        .from("players").select("*").eq("user_id", user.id).single();
      if (data) {
        if (data.username) setUsernameFixed(true);
        setForm({
          username:       data.username ?? "",
          first_name:     data.first_name ?? "",
          last_name:      data.last_name ?? "",
          category:       data.category ?? "",
          position:       data.position ?? "",
          ciudad:         data.ciudad ?? "",
          edad:           data.edad?.toString() ?? "",
          mano_dominante: data.mano_dominante ?? "",
          pala:           data.pala ?? "",
          tenis:          data.tenis ?? "",
          paletero:       data.paletero ?? "",
          torneos:        data.torneos ?? [{ nombre: "", posicion: "" }],
          photo_url:      data.photo_url ?? "",
        });
        if (data.photo_url) setPreview(data.photo_url);
      }
    }
    load();
  }, []);

  function set(field: keyof PerfilForm, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function setTorneo(i: number, field: keyof Torneo, value: string) {
    setForm(f => {
      const torneos = [...f.torneos];
      torneos[i] = { ...torneos[i], [field]: value };
      return { ...f, torneos };
    });
  }

  function addTorneo() {
    setForm(f => ({ ...f, torneos: [...f.torneos, { nombre: "", posicion: "" }] }));
  }

  function removeTorneo(i: number) {
    setForm(f => ({ ...f, torneos: f.torneos.filter((_, idx) => idx !== i) }));
  }

  /* ── Subir foto ── */
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Usar el ref como fuente de verdad para evitar race condition con el state
    const uid = userIdRef.current ?? userId;
    if (!uid) {
      console.error("[handlePhoto] userId es null — el usuario no está autenticado todavía");
      setPhotoError("No se pudo identificar tu sesión. Recarga la página.");
      return;
    }

    setUploading(true);
    setPhotoSaved(false);
    setPhotoError("");

    // Preview local inmediato mientras se sube
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      // 1. Comprimir (≈480px, webp) antes de subir
      const compressed = await compressImage(file);
      const path = `${uid}.webp`;

      // 2. Subir al storage
      const { error: storageError } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true, contentType: "image/webp" });

      if (storageError) {
        console.error("[handlePhoto] Error al subir al storage:", storageError);
        setPhotoError(`Error al subir la imagen: ${storageError.message}`);
        setUploading(false);
        return;
      }

      // 3. Obtener URL pública con cache-buster
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      setPreview(url);
      setForm(f => ({ ...f, photo_url: url }));

      // 4. Persistir en DB: intentar UPDATE primero (respeta RLS de forma más segura);
      //    si no hay fila aún, caer en INSERT vía upsert.
      const { error: updateError, data: updatedRows } = await supabase
        .from("players")
        .update({ photo_url: url })
        .eq("user_id", uid)
        .select("user_id");

      if (updateError) {
        console.error("[handlePhoto] Error en UPDATE de photo_url:", updateError);
        // Intentar upsert como fallback si el UPDATE falló (ej: fila no existe aún)
        const { error: upsertError } = await supabase
          .from("players")
          .upsert({ user_id: uid, photo_url: url }, { onConflict: "user_id" });

        if (upsertError) {
          console.error("[handlePhoto] Error en UPSERT de photo_url (fallback):", upsertError);
          setPhotoError(`La foto se subió pero no se guardó en el perfil: ${upsertError.message}`);
          setUploading(false);
          return;
        }
      } else if (!updatedRows || updatedRows.length === 0) {
        // UPDATE no afectó ninguna fila → la fila aún no existe, crear con upsert
        console.warn("[handlePhoto] UPDATE no afectó filas — la fila del jugador no existe aún. Creando con upsert.");
        const { error: upsertError } = await supabase
          .from("players")
          .upsert({ user_id: uid, photo_url: url }, { onConflict: "user_id" });

        if (upsertError) {
          console.error("[handlePhoto] Error en UPSERT (fila nueva):", upsertError);
          setPhotoError(`La foto se subió pero no se guardó en el perfil: ${upsertError.message}`);
          setUploading(false);
          return;
        }
      }

      console.log("[handlePhoto] photo_url guardado correctamente en DB:", url);
      setPhotoSaved(true);
      setTimeout(() => setPhotoSaved(false), 3000);
    } catch (err) {
      console.error("[handlePhoto] Error inesperado:", err);
      setPhotoError("Ocurrió un error inesperado. Revisa la consola.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setUsernameError("");

    // Validar que el username no esté tomado por otro jugador
    if (form.username && !usernameFixed) {
      const { data: existing } = await supabase
        .from("players")
        .select("user_id")
        .eq("username", form.username)
        .neq("user_id", userId)
        .single();
      if (existing) {
        setUsernameError("Este nombre de usuario ya está en uso. Elige otro.");
        return;
      }
    }

    setSaving(true);
    await supabase.from("players").upsert({
      user_id:        userId,
      username:       form.username,
      first_name:     form.first_name,
      last_name:      form.last_name,
      category:       form.category,
      position:       form.position,
      ciudad:         form.ciudad,
      edad:           parseInt(form.edad) || null,
      mano_dominante: form.mano_dominante,
      pala:           form.pala,
      tenis:          form.tenis,
      paletero:       form.paletero,
      torneos:        form.torneos.filter(t => t.nombre),
      photo_url:      form.photo_url,
    }, { onConflict: "user_id" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const sectionTitle = (num: string, title: string) => (
    <div style={{
      display: "flex", alignItems: "center", gap: "16px",
      marginBottom: "24px", paddingBottom: "16px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <span style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.2em" }}>{num}</span>
      <h2 style={{ fontFamily: DISP, fontSize: "20px", color: INK0, margin: 0 }}>{title}</h2>
    </div>
  );

  return (
    <div className="page-container" style={{ maxWidth: "860px" }}>
      <style>{`
        .page-container { padding: 24px; }
        @media (min-width: 768px) { .page-container { padding: 48px; } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{
          fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em",
          textTransform: "uppercase", color: COURT,
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
        }}>
          <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
          Mi cuenta
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "36px", color: INK0, margin: 0 }}>Mi Perfil</h1>
      </div>

      <form onSubmit={handleSave}>

        {/* 00 FOTO DE PERFIL */}
        <div style={{ marginBottom: "48px" }}>
          {sectionTitle("00", "Foto de Perfil")}
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>

            {/* Avatar preview */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: "100px", height: "100px", borderRadius: "50%",
                border: `2px solid ${COURT}55`,
                background: "rgba(255,255,255,0.05)",
                overflow: "hidden", cursor: "pointer", position: "relative",
                flexShrink: 0, transition: "border-color 0.2s",
              }}
            >
              {preview ? (
                <Image src={preview} alt="Foto de perfil" fill style={{ objectFit: "cover" }} unoptimized />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "32px", color: INK2,
                }}>
                  👤
                </div>
              )}
              {/* Overlay hover */}
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0, transition: "opacity 0.2s",
                fontSize: "20px",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = "1"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = "0"}
              >
                📷
              </div>
            </div>

            {/* Info */}
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: "9px 20px", borderRadius: "8px",
                  background: uploading ? "rgba(255,255,255,0.06)" : `${COURT}22`,
                  border: `1px solid ${COURT}44`,
                  color: uploading ? INK2 : COURT,
                  fontFamily: MONO, fontSize: "12px",
                  cursor: uploading ? "not-allowed" : "pointer",
                  letterSpacing: "0.08em", marginBottom: "10px",
                  display: "block",
                }}
              >
                {uploading ? "Subiendo…" : "Cambiar foto"}
              </button>
              <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: 0, lineHeight: 1.6 }}>
                JPG, PNG o WEBP · Máx 10 MB<br />
                <span style={{ color: COURT + "99" }}>
                  Se comprime automáticamente a ~40 KB antes de subir
                </span>
              </p>
              {photoSaved && (
                <p style={{ fontFamily: MONO, fontSize: "10px", color: COURT, margin: "6px 0 0" }}>
                  ✓ Foto guardada correctamente
                </p>
              )}
              {photoError && (
                <p style={{ fontFamily: MONO, fontSize: "10px", color: "#ff4f4f", margin: "6px 0 0" }}>
                  ✕ {photoError}
                </p>
              )}
            </div>

            <input
              ref={fileRef} type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handlePhoto}
            />
          </div>
        </div>

        {/* 01 IDENTIDAD */}
        <div style={{ marginBottom: "48px" }}>
          {sectionTitle("01", "Identidad")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <Field label={`Usuario${usernameFixed ? "  🔒" : ""}`}>
              <div style={{ position: "relative" }}>
                <input
                  style={{
                    ...inputStyle,
                    opacity: usernameFixed ? 0.6 : 1,
                    cursor: usernameFixed ? "not-allowed" : "text",
                    paddingRight: usernameFixed ? "40px" : "14px",
                  }}
                  value={form.username}
                  onChange={e => !usernameFixed && set("username", e.target.value)}
                  placeholder="Crea tu nombre de usuario"
                  readOnly={usernameFixed}
                />
              </div>
              {usernameFixed ? (
                <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: "6px 0 0", lineHeight: 1.5 }}>
                  El usuario es permanente y no puede cambiarse — es tu identificador único en la plataforma.
                </p>
              ) : (
                <p style={{ fontFamily: MONO, fontSize: "10px", color: "#ffc800", margin: "6px 0 0", lineHeight: 1.5 }}>
                  ⚠ Elige bien tu usuario — una vez guardado no podrá cambiarse.
                </p>
              )}
              {usernameError && (
                <p style={{ fontFamily: MONO, fontSize: "10px", color: "#ff4f4f", margin: "6px 0 0" }}>
                  ✕ {usernameError}
                </p>
              )}
            </Field>
            <Field label="Ciudad">
              <input style={inputStyle} value={form.ciudad}
                onChange={e => set("ciudad", e.target.value)}
                placeholder="¿En qué ciudad juegas?" />
            </Field>
            <Field label="Nombre">
              <input style={inputStyle} value={form.first_name}
                onChange={e => set("first_name", e.target.value)} placeholder="Tu nombre" />
            </Field>
            <Field label="Apellido">
              <input style={inputStyle} value={form.last_name}
                onChange={e => set("last_name", e.target.value)} placeholder="Tus apellidos" />
            </Field>
            <Field label="Edad">
              <input style={inputStyle} type="number" min="1" max="99"
                value={form.edad} onChange={e => set("edad", e.target.value)} placeholder="Tu edad" />
            </Field>
            <Field label="Mano dominante">
              <CustomSelect
                value={form.mano_dominante}
                onChange={v => set("mano_dominante", v)}
                options={MANO_OPTS}
                placeholder="Seleccionar mano"
              />
            </Field>
          </div>
        </div>

        {/* 02 DATOS DE JUEGO */}
        <div style={{ marginBottom: "48px" }}>
          {sectionTitle("02", "Datos de Juego")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <Field label="Categoría">
              <CustomSelect
                value={form.category}
                onChange={v => set("category", v)}
                options={CATEGORIA_OPTS}
                placeholder="Seleccionar categoría"
              />
            </Field>
            <Field label="Posición">
              <CustomSelect
                value={form.position}
                onChange={v => set("position", v as "Drive" | "Revés")}
                options={POSICION_OPTS}
                placeholder="Seleccionar posición"
              />
            </Field>
          </div>
        </div>

        {/* 03 INDUMENTARIA */}
        <div style={{ marginBottom: "48px" }}>
          {sectionTitle("03", "Indumentaria")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <Field label="Pala">
              <input style={inputStyle} value={form.pala}
                onChange={e => set("pala", e.target.value)} placeholder="Ej: Nox AT10 Genius" />
            </Field>
            <Field label="Tenis">
              <input style={inputStyle} value={form.tenis}
                onChange={e => set("tenis", e.target.value)} placeholder="Ej: Adidas Adizero" />
            </Field>
            <Field label="Paletero">
              <input style={inputStyle} value={form.paletero}
                onChange={e => set("paletero", e.target.value)} placeholder="Ej: Nox Pro Series" />
            </Field>
          </div>
        </div>

        {/* 04 TORNEOS */}
        <div style={{ marginBottom: "48px" }}>
          {sectionTitle("04", "Torneos")}
          {form.torneos.map((t, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 140px auto",
              gap: "12px", alignItems: "end", marginBottom: "12px",
            }}>
              <Field label={`Torneo ${i + 1}`}>
                <input style={inputStyle} value={t.nombre}
                  onChange={e => setTorneo(i, "nombre", e.target.value)}
                  placeholder="Ej: Open Ciudad de Cúcuta" />
              </Field>
              <Field label="Posición #">
                <input style={inputStyle} type="number" min="1"
                  value={t.posicion}
                  onChange={e => setTorneo(i, "posicion", e.target.value)}
                  placeholder="Posición final" />
              </Field>
              {form.torneos.length > 1 && (
                <button type="button" onClick={() => removeTorneo(i)} style={{
                  padding: "10px 14px", borderRadius: "8px",
                  background: "rgba(255,79,79,0.1)", border: "1px solid rgba(255,79,79,0.2)",
                  color: "#ff4f4f", cursor: "pointer", fontFamily: MONO, fontSize: "12px",
                  alignSelf: "end", marginBottom: "20px",
                }}>✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addTorneo} style={{
            padding: "8px 18px", borderRadius: "8px",
            background: "transparent", border: `1px solid ${COURT}44`,
            color: COURT, fontFamily: MONO, fontSize: "11px",
            letterSpacing: "0.1em", cursor: "pointer",
          }}>
            + Agregar torneo
          </button>
        </div>

        {/* GUARDAR */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button type="submit" disabled={saving || uploading} style={{
            padding: "12px 32px", borderRadius: "10px",
            background: `linear-gradient(90deg, ${COURT}, ${BALL})`,
            border: "none", cursor: saving ? "not-allowed" : "pointer",
            fontFamily: MONO, fontSize: "13px", fontWeight: 700,
            color: BG0, letterSpacing: "0.08em",
            opacity: saving ? 0.7 : 1, transition: "opacity 0.2s",
          }}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          {saved && (
            <span style={{ fontFamily: MONO, fontSize: "12px", color: COURT }}>
              ✓ Guardado correctamente
            </span>
          )}
        </div>

      </form>
    </div>
  );
}
