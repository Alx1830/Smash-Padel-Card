"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { CustomSelect } from "@/components/ui/custom-select";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { CITIES_BY_COUNTRY } from "@/data/cities";
import { STORE_COVERS, isValidStoreCover } from "@/data/store-covers";
import type { StoreHours, HourSlot } from "@/components/StoreSections";
import {
  User, Camera, Lock, CheckCircle2, AlertTriangle, XCircle, Smartphone, Plus, Trash2,
} from "lucide-react";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface PerfilForm {
  username:            string;
  first_name:          string;
  last_name:           string;
  pais:                string;
  tipo_perfil:         string;
  ciudad:              string;
  edad:                string;
  set_favorito:        string;
  photo_url:           string;
  /** Solo para tiendas: una de las portadas autorizadas, o "" para ninguna */
  cover_url:           string;
  /** Encuadre vertical de la portada en %: 0 arriba, 50 centro, 100 abajo */
  cover_position:      number;
  store_address:       string;
  store_maps_url:      string;
  store_hours:         StoreHours;
  social_facebook:     string;
  social_instagram:    string;
  /** user_id de la tienda a la que pertenece el jugador */
  my_store_id:         string;
  whatsapp_indicativo: string;
  whatsapp_numero:     string;
}

const SET_OPTS = POKEMON_SERIES.flatMap(series =>
  series.sets.map(set => ({ value: set.id, label: `${series.name} — ${set.name}` }))
);

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

function Field({ label, children, locked }: {
  label: string;
  children: React.ReactNode;
  /** Muestra un candado: el campo ya no se puede cambiar */
  locked?: boolean;
}) {
  return (
    // El margen lo pone la rejilla; así todos los campos quedan alineados
    <div>
      <label style={{
        display: "flex", alignItems: "center", gap: "6px",
        fontFamily: MONO, fontSize: "10px",
        letterSpacing: "0.15em", textTransform: "uppercase",
        color: INK2, marginBottom: "8px",
      }}>
        {label}
        {locked && <Lock size={11} strokeWidth={2} />}
      </label>
      {children}
    </div>
  );
}

/** Texto de ayuda debajo de un campo */
function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: "7px 0 0", lineHeight: 1.6 }}>
      {children}
    </p>
  );
}

/** Aviso con icono: confirmación, advertencia o error */
function Note({ kind, children }: { kind: "ok" | "warn" | "error"; children: React.ReactNode }) {
  const { color, Icon } = {
    ok:    { color: COURT,     Icon: CheckCircle2 },
    warn:  { color: "#ffc800", Icon: AlertTriangle },
    error: { color: "#ff4f4f", Icon: XCircle },
  }[kind];

  return (
    <p style={{
      display: "flex", alignItems: "flex-start", gap: "6px",
      fontFamily: MONO, fontSize: "10px", color, margin: "7px 0 0", lineHeight: 1.6,
    }}>
      <Icon size={12} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{children}</span>
    </p>
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


const PAISES_OPTS = [
  "Afganistán","Albania","Alemania","Andorra","Angola","Antigua y Barbuda","Arabia Saudita","Argelia","Argentina",
  "Armenia","Australia","Austria","Azerbaiyán","Bahamas","Bahrein","Bangladesh","Barbados","Bélgica","Belice",
  "Benín","Bielorrusia","Bolivia","Bosnia y Herzegovina","Botsuana","Brasil","Brunéi","Bulgaria","Burkina Faso",
  "Burundi","Bután","Cabo Verde","Camboya","Camerún","Canadá","Catar","Chad","Chile","China","Chipre",
  "Colombia","Comoras","Congo","Corea del Norte","Corea del Sur","Costa de Marfil","Costa Rica","Croacia","Cuba",
  "Dinamarca","Djibouti","Dominica","Ecuador","Egipto","El Salvador","Emiratos Árabes Unidos","Eritrea","Eslovaquia",
  "Eslovenia","España","Estados Unidos","Estonia","Etiopía","Filipinas","Finlandia","Fiyi","Francia","Gabón",
  "Gambia","Georgia","Ghana","Granada","Grecia","Guatemala","Guinea","Guinea Ecuatorial","Guinea-Bisáu","Guyana",
  "Haití","Honduras","Hungría","India","Indonesia","Irak","Irán","Irlanda","Islandia","Islas Marshall",
  "Islas Salomón","Israel","Italia","Jamaica","Japón","Jordania","Kazajistán","Kenia","Kirguistán","Kiribati",
  "Kuwait","Laos","Lesoto","Letonia","Líbano","Liberia","Libia","Liechtenstein","Lituania","Luxemburgo",
  "Madagascar","Malasia","Malaui","Maldivas","Mali","Malta","Marruecos","Mauricio","Mauritania","México",
  "Micronesia","Moldavia","Mónaco","Mongolia","Montenegro","Mozambique","Myanmar","Namibia","Nauru","Nepal",
  "Nicaragua","Níger","Nigeria","Noruega","Nueva Zelanda","Omán","Países Bajos","Pakistán","Palaos","Palestina",
  "Panamá","Papúa Nueva Guinea","Paraguay","Perú","Polonia","Portugal","Reino Unido","República Centroafricana",
  "República Checa","República Democrática del Congo","República Dominicana","Ruanda","Rumania","Rusia","Samoa",
  "San Cristóbal y Nieves","San Marino","San Vicente y las Granadinas","Santa Lucía","Santo Tomé y Príncipe",
  "Senegal","Serbia","Seychelles","Sierra Leona","Singapur","Siria","Somalia","Sri Lanka","Suazilandia",
  "Sudáfrica","Sudán","Sudán del Sur","Suecia","Suiza","Surinam","Tailandia","Tanzania","Tayikistán","Timor Oriental",
  "Togo","Tonga","Trinidad y Tobago","Túnez","Turkmenistán","Turquía","Tuvalu","Ucrania","Uganda","Uruguay",
  "Uzbekistán","Vanuatu","Venezuela","Vietnam","Yemen","Yibuti","Zambia","Zimbabue",
].map(p => ({ value: p, label: p }));

const INDICATIVOS_OPTS = [
  { value: "+1",   label: "+1 — EE.UU. / Canadá" },
  { value: "+52",  label: "+52 — México" },
  { value: "+57",  label: "+57 — Colombia" },
  { value: "+54",  label: "+54 — Argentina" },
  { value: "+56",  label: "+56 — Chile" },
  { value: "+51",  label: "+51 — Perú" },
  { value: "+58",  label: "+58 — Venezuela" },
  { value: "+593", label: "+593 — Ecuador" },
  { value: "+591", label: "+591 — Bolivia" },
  { value: "+595", label: "+595 — Paraguay" },
  { value: "+598", label: "+598 — Uruguay" },
  { value: "+506", label: "+506 — Costa Rica" },
  { value: "+507", label: "+507 — Panamá" },
  { value: "+503", label: "+503 — El Salvador" },
  { value: "+502", label: "+502 — Guatemala" },
  { value: "+504", label: "+504 — Honduras" },
  { value: "+505", label: "+505 — Nicaragua" },
  { value: "+53",  label: "+53 — Cuba" },
  { value: "+1809",label: "+1809 — Rep. Dominicana" },
  { value: "+34",  label: "+34 — España" },
  { value: "+55",  label: "+55 — Brasil" },
  { value: "+44",  label: "+44 — Reino Unido" },
  { value: "+49",  label: "+49 — Alemania" },
  { value: "+33",  label: "+33 — Francia" },
  { value: "+39",  label: "+39 — Italia" },
  { value: "+81",  label: "+81 — Japón" },
  { value: "+82",  label: "+82 — Corea del Sur" },
  { value: "+86",  label: "+86 — China" },
  { value: "+91",  label: "+91 — India" },
  { value: "+61",  label: "+61 — Australia" },
];


const TIPO_PERFIL_OPTS = [
  { value: "Inversionista",       label: "Inversionista" },
  { value: "Coleccionista",       label: "Coleccionista" },
  { value: "Jugador TCG",         label: "Jugador TCG" },
  { value: "Creador de Contenido",label: "Creador de Contenido" },
  { value: "Tienda Pokémon",      label: "Tienda Pokémon" },
];


export default function PerfilPage() {
  const supabase     = createClient();
  const fileRef      = useRef<HTMLInputElement>(null);
  const [saving, setSaving]           = useState(false);
  const [saved,  setSaved]            = useState(false);
  const [saveError, setSaveError]     = useState("");
  const [uploading, setUploading]     = useState(false);
  const [photoSaved, setPhotoSaved]   = useState(false);
  const [photoError, setPhotoError]   = useState("");
  const [userId, setUserId]           = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const [preview, setPreview]         = useState<string>("");
  const [usernameFixed, setUsernameFixed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [deleteText, setDeleteText]       = useState("");
  const [deleting, setDeleting]           = useState(false);
  const [form, setForm] = useState<PerfilForm>({
    username: "", first_name: "", last_name: "",
    pais: "", tipo_perfil: "", ciudad: "",
    edad: "",
    set_favorito: "", photo_url: "",
    whatsapp_indicativo: "+57",
    whatsapp_numero: "",
    cover_url: "", cover_position: 50,
    store_address: "", store_maps_url: "", store_hours: {},
    social_facebook: "", social_instagram: "", my_store_id: "",
  });

  /** Tiendas aprobadas, para que un jugador elija la suya */
  const [stores, setStores] = useState<{ user_id: string; label: string }[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      userIdRef.current = user.id;
      const { data } = await supabase
        .from("players").select("*").eq("user_id", user.id).single();
      if (data) {
        const admin = data.role === "admin";
        setIsAdmin(admin);
        if (data.username && !admin) setUsernameFixed(true);
        setForm({
          username:            data.username ?? "",
          first_name:          data.first_name ?? "",
          last_name:           data.last_name ?? "",
          pais:                data.pais ?? "",
          tipo_perfil:         data.tipo_perfil ?? "",
          ciudad:              data.ciudad ?? "",
          edad:                data.edad?.toString() ?? "",
          set_favorito:        data.set_favorito ?? "",
          photo_url:           data.photo_url ?? "",
          whatsapp_indicativo: data.whatsapp_indicativo ?? "+57",
          whatsapp_numero:     data.whatsapp_numero ?? "",
          cover_url:           data.cover_url ?? "",
          cover_position:      data.cover_position ?? 50,
          store_address:       data.store_address ?? "",
          store_maps_url:      data.store_maps_url ?? "",
          store_hours:         data.store_hours ?? {},
          social_facebook:     data.social_facebook ?? "",
          social_instagram:    data.social_instagram ?? "",
          my_store_id:         data.my_store_id ?? "",
        });
        if (data.photo_url) setPreview(data.photo_url);
      }

      // Tiendas aprobadas: la lista de "Mi tienda Pokémon"
      const { data: tiendas } = await supabase
        .from("players")
        .select("user_id, username, first_name, last_name, ciudad")
        .eq("tipo_perfil", "Tienda Pokémon")
        .eq("store_status", "approved")
        .order("first_name");

      setStores((tiendas ?? [])
        .filter(t => t.user_id !== user.id)
        .map(t => {
          const nombre = `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() || t.username || "Tienda";
          return {
            user_id: t.user_id,
            label: t.ciudad ? `${nombre} · ${t.ciudad}` : nombre,
          };
        }));
    }
    load();
  }, []);

  /** La portada solo se ofrece a los perfiles de tienda */
  const isTienda = form.tipo_perfil === "Tienda Pokémon";

  function set(field: keyof PerfilForm, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const uid = userIdRef.current ?? userId;
    if (!uid) { setPhotoError("No se pudo identificar tu sesión. Recarga la página."); return; }
    setUploading(true); setPhotoSaved(false); setPhotoError("");
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    try {
      const compressed = await compressImage(file);
      const path = `${uid}.webp`;
      const { error: storageError } = await supabase.storage
        .from("avatars").upload(path, compressed, { upsert: true, contentType: "image/webp" });
      if (storageError) { setPhotoError(`Error al subir: ${storageError.message}`); setUploading(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      setPreview(url);
      setForm(f => ({ ...f, photo_url: url }));
      const { error: updateError, data: updatedRows } = await supabase
        .from("players").update({ photo_url: url }).eq("user_id", uid).select("user_id");
      if (updateError || !updatedRows || updatedRows.length === 0) {
        const { error: upsertError } = await supabase
          .from("players").upsert({ user_id: uid, photo_url: url }, { onConflict: "user_id" });
        if (upsertError) { setPhotoError(`La foto se subió pero no se guardó: ${upsertError.message}`); setUploading(false); return; }
      }
      setPhotoSaved(true);
      setTimeout(() => setPhotoSaved(false), 3000);
    } catch { setPhotoError("Ocurrió un error inesperado."); }
    finally { setUploading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setUsernameError("");
    if (form.username && !usernameFixed) {
      const { data: existing } = await supabase
        .from("players").select("user_id").eq("username", form.username).neq("user_id", userId).single();
      if (existing) { setUsernameError("Este nombre de usuario ya está en uso. Elige otro."); return; }
    }
    setSaving(true);
    setSaveError("");
    const { error } = await supabase.from("players").upsert({
      user_id:             userId,
      username:            form.username.trim(),
      first_name:          form.first_name,
      last_name:           form.last_name,
      pais:                form.pais,
      tipo_perfil:         form.tipo_perfil,
      ciudad:              form.ciudad,
      edad:                parseInt(form.edad) || null,
      set_favorito:        form.set_favorito || null,
      photo_url:           form.photo_url,
      whatsapp_indicativo: form.whatsapp_indicativo || null,
      whatsapp_numero:     form.whatsapp_numero || null,
      // La portada solo aplica a las tiendas; en el resto se limpia
      cover_url:           isTienda && isValidStoreCover(form.cover_url)
                             ? (form.cover_url || null)
                             : null,
      cover_position:      Math.min(100, Math.max(0, Math.round(form.cover_position))),
      // Dirección y horarios solo tienen sentido en una tienda
      store_address:       isTienda ? (form.store_address.trim()  || null) : null,
      store_maps_url:      isTienda ? (form.store_maps_url.trim() || null) : null,
      store_hours:         isTienda ? form.store_hours : null,
      social_facebook:     isTienda ? (form.social_facebook.trim()  || null) : null,
      social_instagram:    isTienda ? (form.social_instagram.trim() || null) : null,
      // Una tienda no pertenece a otra tienda
      my_store_id:         isTienda ? null : (form.my_store_id || null),
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      setSaveError(`Error al guardar: ${error.message}`);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
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

  async function handleDeleteProfile() {
    if (!userId) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("players").update({ activo: false }).eq("user_id", userId);
    await supabase.auth.signOut();
    sessionStorage.removeItem("last_news_dismissed");
    window.location.href = "/";
  }

  return (
    <div className="page-container" style={{ maxWidth: "1100px" }}>
      <style>{`
        .page-container { padding: clamp(14px, 3vw, 48px); }
        /* Secciones apiladas a ancho completo: los campos quedan alineados en
           una sola rejilla en vez de dos columnas que se desfasaban. */
        .perfil-sections { display: flex; flex-direction: column; gap: clamp(16px, 2.5vw, 24px); }
        .perfil-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: clamp(16px, 2.5vw, 28px);
          min-width: 0;
        }
        /* auto-fit reparte las columnas que caben: no hace falta un media query
           por cada corte, y nunca deja un campo huérfano estrujado. */
        .perfil-grid-2 {
          display: grid; gap: clamp(14px, 2vw, 20px);
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          align-items: start;
        }
        .perfil-grid-2 > * { min-width: 0; }
        /* Un campo que necesita toda la fila */
        .perfil-full { grid-column: 1 / -1; }
        .perfil-wa-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
        input, select, textarea { max-width: 100%; }
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
        <div className="perfil-card" style={{ marginBottom: "clamp(16px, 2.5vw, 24px)" }}>
          {sectionTitle("00", "Foto de Perfil")}
          <div style={{ display: "flex", alignItems: "center", gap: "clamp(16px, 3vw, 28px)", flexWrap: "wrap" }}>
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
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: INK2 }}>
                  <User size={34} strokeWidth={1.5} />
                </div>
              )}
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0, transition: "opacity 0.2s", color: "#fff",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = "1"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = "0"}
              >
                <Camera size={22} strokeWidth={1.7} />
              </div>
            </div>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{
                padding: "9px 20px", borderRadius: "8px",
                background: uploading ? "rgba(255,255,255,0.06)" : `${COURT}22`,
                border: `1px solid ${COURT}44`, color: uploading ? INK2 : COURT,
                fontFamily: MONO, fontSize: "12px", cursor: uploading ? "not-allowed" : "pointer",
                letterSpacing: "0.08em", marginBottom: "10px", display: "block",
              }}>
                {uploading ? "Subiendo…" : "Cambiar foto"}
              </button>
              <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: 0, lineHeight: 1.6 }}>
                JPG, PNG o WEBP · Máx 10 MB<br />
                <span style={{ color: COURT + "99" }}>Se comprime automáticamente antes de subir</span>
              </p>
              {photoSaved && <Note kind="ok">Foto guardada correctamente</Note>}
              {photoError && <Note kind="error">{photoError}</Note>}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePhoto} suppressHydrationWarning />
          </div>
        </div>

        <div className="perfil-sections" style={{ marginBottom: "48px" }}>
          {/* 01 IDENTIDAD */}
          <div className="perfil-card">
            {sectionTitle("01", "Identidad")}
            <div className="perfil-grid-2">
              <Field label="Usuario" locked={usernameFixed}>
                <div style={{ position: "relative" }}>
                  <input
                    style={{ ...inputStyle, opacity: usernameFixed ? 0.6 : 1, cursor: usernameFixed ? "not-allowed" : "text" }}
                    value={form.username}
                    onChange={e => !usernameFixed && set("username", e.target.value.replace(/\s/g, ""))}
                    placeholder="Crea tu nombre de usuario"
                    readOnly={usernameFixed}
                  />
                </div>
                {isAdmin ? (
                  <Hint>Cuenta admin — puedes cambiar tu usuario las veces que quieras.</Hint>
                ) : usernameFixed ? (
                  <Hint>El usuario es permanente — es tu identificador único en la plataforma.</Hint>
                ) : (
                  <Note kind="warn">Elige bien tu usuario — una vez guardado no podrá cambiarse.</Note>
                )}
                {usernameError && <Note kind="error">{usernameError}</Note>}
              </Field>
              <Field label="Nombre">
                <input style={inputStyle} value={form.first_name}
                  onChange={e => set("first_name", e.target.value.replace(/[^a-záéíóúàèìòùäëïöüñA-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑ]/g, ""))} placeholder="Tu nombre" />
              </Field>
              <Field label="Apellido">
                <input style={inputStyle} value={form.last_name}
                  onChange={e => set("last_name", e.target.value.replace(/[^a-záéíóúàèìòùäëïöüñA-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑ]/g, ""))} placeholder="Tus apellidos" />
              </Field>
              <Field label="País">
                <CustomSelect
                  value={form.pais}
                  onChange={v => { set("pais", v); set("ciudad", ""); }}
                  options={PAISES_OPTS}
                  placeholder="Seleccionar país"
                />
              </Field>
              <Field label="Ciudad">
                {CITIES_BY_COUNTRY[form.pais] ? (
                  <CustomSelect
                    value={form.ciudad}
                    onChange={v => set("ciudad", v)}
                    options={CITIES_BY_COUNTRY[form.pais].map(c => ({ value: c, label: c }))}
                    placeholder="Seleccionar ciudad"
                  />
                ) : (
                  <input style={inputStyle} value={form.ciudad}
                    onChange={e => set("ciudad", e.target.value)} placeholder="¿En qué ciudad estás?" />
                )}
              </Field>
              <Field label="Edad">
                <input style={inputStyle} type="number" min="1" max="99"
                  value={form.edad} onChange={e => set("edad", e.target.value)} placeholder="Tu edad" />
              </Field>
            </div>

            {/* WhatsApp */}
            <div style={{
              marginTop: "20px", padding: "clamp(14px, 2vw, 20px)", borderRadius: "12px",
              background: "rgba(46,230,193,0.04)", border: "1px solid rgba(46,230,193,0.15)",
            }}>
              <div style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: COURT, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Smartphone size={13} strokeWidth={1.9} /> WhatsApp
              </div>
              <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: "0 0 14px", lineHeight: 1.6 }}>
                Requerido para vender en el Market. Solo lo verán compradores interesados.
              </p>
              <div className="perfil-wa-grid">
                <Field label="Indicativo">
                  <CustomSelect
                    value={form.whatsapp_indicativo}
                    onChange={v => set("whatsapp_indicativo", v)}
                    options={INDICATIVOS_OPTS}
                    placeholder="+57"
                  />
                </Field>
                <Field label="Número">
                  <input
                    style={inputStyle}
                    value={form.whatsapp_numero}
                    onChange={e => set("whatsapp_numero", e.target.value.replace(/\D/g, ""))}
                    placeholder="3001234567"
                    maxLength={15}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* 02 PERFIL POKÉMON */}
          <div className="perfil-card">
            {sectionTitle("02", "Perfil Pokémon")}
            <div className="perfil-grid-2">
              <Field label="Tipo de Perfil">
                <CustomSelect
                  value={form.tipo_perfil}
                  onChange={v => set("tipo_perfil", v)}
                  options={TIPO_PERFIL_OPTS}
                  placeholder="Seleccionar tipo"
                />
              </Field>

              <Field label="Tu Set Favorito">
                <CustomSelect
                  value={form.set_favorito}
                  onChange={v => set("set_favorito", v)}
                  options={SET_OPTS}
                  placeholder="Buscar set..."
                />
              </Field>

              {/* Los jugadores eligen a qué tienda pertenecen */}
              {!isTienda && (
                <div className="perfil-full">
                  <Field label="Mi tienda Pokémon">
                    <CustomSelect
                      value={form.my_store_id}
                      onChange={v => set("my_store_id", v)}
                      options={[
                        { value: "", label: "Ninguna por ahora" },
                        ...stores.map(s => ({ value: s.user_id, label: s.label })),
                      ]}
                      placeholder={stores.length ? "Seleccionar tienda" : "Todavía no hay tiendas aprobadas"}
                    />
                    <Hint>
                      La tienda donde juegas o compras habitualmente. Aparecerás en su comunidad de jugadores.
                    </Hint>
                  </Field>
                </div>
              )}
            </div>
          </div>

          {/* 03 TU TIENDA — solo para perfiles de tienda */}
          {isTienda && (
            <div className="perfil-card">
              {sectionTitle("03", "Tu tienda")}
              <div className="perfil-grid-2">
                <div className="perfil-full">
                  <Field label="Portada de tu tienda">
                    <CoverPicker
                      value={form.cover_url}
                      onChange={v => set("cover_url", v)}
                      position={form.cover_position}
                      onPositionChange={p => setForm(f => ({ ...f, cover_position: p }))}
                    />
                  </Field>
                </div>

                <Field label="Facebook">
                  <input
                    value={form.social_facebook}
                    onChange={e => set("social_facebook", e.target.value)}
                    placeholder="tutienda  ·  o pega el enlace"
                    maxLength={200}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Instagram">
                  <input
                    value={form.social_instagram}
                    onChange={e => set("social_instagram", e.target.value)}
                    placeholder="@tutienda  ·  o pega el enlace"
                    maxLength={200}
                    style={inputStyle}
                  />
                </Field>

                <div className="perfil-full">
                  <Hint>
                    El icono de WhatsApp usa el número que pusiste en Identidad.
                  </Hint>
                </div>

                <div className="perfil-full">
                  <Field label="Dirección de tu tienda">
                    <input
                      value={form.store_address}
                      onChange={e => set("store_address", e.target.value)}
                      placeholder="Ej: Calle 10 #5-23, Centro Comercial Ventura"
                      maxLength={200}
                      style={inputStyle}
                    />
                    <Hint>Se muestra en el mapa de tu perfil, junto con tu ciudad y país.</Hint>
                  </Field>
                </div>

                <div className="perfil-full">
                  <Field label="Enlace de Google Maps">
                    <input
                      value={form.store_maps_url}
                      onChange={e => set("store_maps_url", e.target.value)}
                      placeholder="https://maps.app.goo.gl/…"
                      maxLength={500}
                      style={inputStyle}
                    />
                    <Hint>
                      Busca tu tienda en Google Maps y pega el enlace de Compartir. El botón
                      “Ver en Google Maps” llevará justo ahí.
                    </Hint>
                  </Field>
                </div>

                <div className="perfil-full">
                  <Field label="Horarios de atención">
                    <HoursEditor
                      hours={form.store_hours}
                      onChange={h => setForm(f => ({ ...f, store_hours: h }))}
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* GUARDAR */}
        <div style={{
          display: "flex", alignItems: "center", gap: "16px",
          flexWrap: "wrap", marginTop: "clamp(20px, 3vw, 32px)",
        }}>
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
          {saved && <Note kind="ok">Guardado correctamente</Note>}
          {saveError && <Note kind="error">{saveError}</Note>}
        </div>

        {/* ELIMINAR PERFIL */}
        <div style={{ marginTop: "40px", paddingTop: "32px", borderTop: "1px solid rgba(255,79,79,0.15)" }}>
          <p style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#ff4f4f", marginBottom: "8px" }}>Zona de peligro</p>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, marginBottom: "16px", lineHeight: 1.6 }}>
            Tu perfil será eliminado y no será visible para nadie. Si vuelves a iniciar sesión dentro de 1 año, tu perfil será restaurado automáticamente.
          </p>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            style={{
              padding: "10px 24px", borderRadius: "10px",
              background: "rgba(255,79,79,0.08)", border: "1px solid rgba(255,79,79,0.3)",
              color: "#ff4f4f", fontFamily: MONO, fontSize: "12px", fontWeight: 700,
              letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,79,79,0.16)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,79,79,0.08)"; }}
          >
            Eliminar perfil
          </button>
        </div>

      </form>

      {/* MODAL ELIMINAR */}
      {deleteOpen && (
        <div onClick={() => { setDeleteOpen(false); setDeleteText(""); }} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(5,7,13,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(440px, 96vw)", background: "#0a0e1a", border: "1px solid rgba(255,79,79,0.25)", borderRadius: "20px", padding: "36px 32px" }}>
            <div style={{ fontSize: "36px", textAlign: "center", marginBottom: "16px" }}>⚠️</div>
            <h3 style={{ fontFamily: DISP, fontSize: "20px", color: INK0, margin: "0 0 12px", textAlign: "center" }}>Eliminar perfil</h3>
            <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, lineHeight: 1.7, margin: "0 0 24px", textAlign: "center" }}>
              Tu perfil será eliminado y no será visible para nadie. Si vuelves a iniciar sesión dentro de 1 año, tu perfil será restaurado automáticamente. Para confirmar, escribe exactamente:
            </p>
            <p style={{ fontFamily: MONO, fontSize: "12px", color: "#ff4f4f", textAlign: "center", marginBottom: "16px", letterSpacing: "0.04em" }}>
              Deseo eliminar mi perfil
            </p>
            <input
              value={deleteText}
              onChange={e => setDeleteText(e.target.value)}
              placeholder="Escribe la frase de confirmación..."
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "8px", boxSizing: "border-box",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                color: INK0, fontFamily: MONO, fontSize: "12px", outline: "none", marginBottom: "20px",
              }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => { setDeleteOpen(false); setDeleteText(""); }}
                style={{ flex: 1, padding: "11px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: INK2, fontFamily: MONO, fontSize: "12px", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                disabled={deleteText !== "Deseo eliminar mi perfil" || deleting}
                onClick={handleDeleteProfile}
                style={{
                  flex: 1, padding: "11px", borderRadius: "10px", border: "none",
                  background: deleteText === "Deseo eliminar mi perfil" ? "#ff4f4f" : "rgba(255,79,79,0.2)",
                  color: deleteText === "Deseo eliminar mi perfil" ? "#fff" : "rgba(255,79,79,0.4)",
                  fontFamily: MONO, fontSize: "12px", fontWeight: 700, cursor: deleteText === "Deseo eliminar mi perfil" ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                }}
              >
                {deleting ? "Eliminando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Selector de portada: solo las autorizadas ─────────────────────────── */
function CoverPicker({ value, onChange, position, onPositionChange }: {
  value: string;
  onChange: (v: string) => void;
  position: number;
  onPositionChange: (p: number) => void;
}) {
  const options = [
    { path: "", name: "Sin portada", hint: "Degradado por defecto" },
    ...STORE_COVERS.map(c => ({ path: c.path, name: c.name, hint: "" })),
  ];

  return (
    <div>
      <div style={{
        display: "grid", gap: "10px",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
      }}>
        {options.map(opt => {
          const active = value === opt.path;
          return (
            <button
              key={opt.path || "none"}
              type="button"
              onClick={() => onChange(opt.path)}
              aria-pressed={active}
              style={{
                position: "relative", padding: 0, cursor: "pointer",
                borderRadius: "10px", overflow: "hidden", textAlign: "left",
                border: `1px solid ${active ? COURT : "rgba(255,255,255,0.12)"}`,
                boxShadow: active ? `0 0 0 1px ${COURT}, 0 8px 24px -12px ${COURT}66` : "none",
                background: "rgba(255,255,255,0.03)",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
            >
              <div style={{
                position: "relative", width: "100%", aspectRatio: "16 / 7",
                background: opt.path
                  ? undefined
                  : `radial-gradient(ellipse 80% 70% at 30% 20%, rgba(46,230,193,0.30), transparent 60%),
                     radial-gradient(ellipse 60% 50% at 85% 80%, rgba(255,79,216,0.24), transparent 70%),
                     linear-gradient(180deg, #0a1320 0%, #060912 100%)`,
              }}>
                {opt.path && (
                  <Image src={opt.path} alt={opt.name} fill sizes="220px"
                    style={{ objectFit: "cover" }} />
                )}
                {active && (
                  <span style={{
                    position: "absolute", top: 6, right: 6,
                    width: 20, height: 20, borderRadius: "50%",
                    background: COURT, color: BG0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: MONO, fontSize: 12, fontWeight: 700, lineHeight: 1,
                  }}>✓</span>
                )}
              </div>
              <div style={{ padding: "8px 10px 9px" }}>
                <p style={{
                  fontFamily: MONO, fontSize: 10.5, margin: 0,
                  color: active ? COURT : INK0, letterSpacing: "0.04em",
                }}>
                  {opt.name}
                </p>
                {opt.hint && (
                  <p style={{ fontFamily: MONO, fontSize: 8.5, color: INK2, margin: "3px 0 0" }}>
                    {opt.hint}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!isValidStoreCover(value) && (
        <p style={{ fontFamily: MONO, fontSize: 10, color: "#ff6b6b", margin: "10px 0 0" }}>
          Esa portada no está entre las autorizadas. Elige una de la lista.
        </p>
      )}

      {value && (
        <CoverPositioner
          src={value}
          position={position}
          onChange={onPositionChange}
        />
      )}
    </div>
  );
}

/* ── Horarios de atención, día por día ─────────────────────────────────── */
const HOUR_DAYS = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

const MORNING: HourSlot = { open: "09:00", close: "13:00" };
const EVENING: HourSlot = { open: "15:00", close: "19:00" };

function HoursEditor({ hours, onChange }: {
  hours: StoreHours;
  onChange: (h: StoreHours) => void;
}) {
  const slotsOf = (key: string): HourSlot[] => hours[key] ?? [];

  function setSlots(key: string, slots: HourSlot[]) {
    const next = { ...hours };
    if (slots.length === 0) delete next[key];
    else next[key] = slots;
    onChange(next);
  }

  /** Cerrado → jornada corrida; ya abierto → cerrado */
  function toggleDay(key: string) {
    setSlots(key, slotsOf(key).length ? [] : [{ open: "10:00", close: "19:00" }]);
  }

  function setTime(key: string, i: number, field: keyof HourSlot, value: string) {
    const slots = [...slotsOf(key)];
    slots[i] = { ...slots[i], [field]: value };
    setSlots(key, slots);
  }

  /** Parte la jornada en mañana y tarde, con su descanso en medio */
  function splitDay(key: string) {
    setSlots(key, [{ ...MORNING }, { ...EVENING }]);
  }

  function removeSlot(key: string, i: number) {
    setSlots(key, slotsOf(key).filter((_, j) => j !== i));
  }

  /** Copia el horario del primer día abierto al resto */
  function applyToAll() {
    const first = HOUR_DAYS.find(d => slotsOf(d.key).length);
    if (!first) return;
    const model = slotsOf(first.key).map(s => ({ ...s }));
    const next: StoreHours = {};
    for (const d of HOUR_DAYS) next[d.key] = model.map(s => ({ ...s }));
    onChange(next);
  }

  const anyOpen = HOUR_DAYS.some(d => slotsOf(d.key).length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {HOUR_DAYS.map(d => {
        const slots = slotsOf(d.key);
        const open  = slots.length > 0;

        return (
          <div key={d.key} style={{
            display: "flex", alignItems: "flex-start", gap: "10px", flexWrap: "wrap",
            padding: "10px", borderRadius: "9px",
            background: open ? "rgba(46,230,193,0.05)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${open ? `${COURT}33` : "rgba(255,255,255,0.08)"}`,
          }}>
            <button type="button" onClick={() => toggleDay(d.key)} style={{
              fontFamily: MONO, fontSize: "10px", letterSpacing: "0.08em",
              padding: "6px 10px", borderRadius: "6px", cursor: "pointer",
              minWidth: "112px", textAlign: "left", flexShrink: 0,
              color: open ? COURT : INK2,
              background: "transparent",
              border: `1px solid ${open ? `${COURT}55` : "rgba(255,255,255,0.14)"}`,
            }}>
              {open ? "● " : "○ "}{d.label}
            </button>

            {!open ? (
              <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2, padding: "7px 0" }}>
                Cerrado
              </span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "7px", flex: 1, minWidth: 0 }}>
                {slots.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                    {slots.length > 1 && (
                      <span style={{ fontFamily: MONO, fontSize: "9px", color: INK2, minWidth: "48px", letterSpacing: "0.08em" }}>
                        {i === 0 ? "Mañana" : "Tarde"}
                      </span>
                    )}
                    <input type="time" value={s.open}
                      onChange={e => setTime(d.key, i, "open", e.target.value)}
                      style={{ ...inputStyle, width: "auto", padding: "6px 9px", fontSize: "11px" }} />
                    <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2 }}>a</span>
                    <input type="time" value={s.close}
                      onChange={e => setTime(d.key, i, "close", e.target.value)}
                      style={{ ...inputStyle, width: "auto", padding: "6px 9px", fontSize: "11px" }} />
                    {slots.length > 1 && (
                      <button type="button" onClick={() => removeSlot(d.key, i)}
                        title="Quitar esta franja"
                        style={{
                          display: "flex", padding: "6px", borderRadius: "6px", cursor: "pointer",
                          background: "transparent", border: "1px solid rgba(255,79,79,0.3)", color: "#ff6b6b",
                        }}>
                        <Trash2 size={12} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                ))}

                {slots.length === 1 && (
                  <button type="button" onClick={() => splitDay(d.key)} style={{
                    alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "6px",
                    fontFamily: MONO, fontSize: "9px", letterSpacing: "0.08em",
                    textTransform: "uppercase", padding: "5px 9px", borderRadius: "6px",
                    cursor: "pointer", color: INK2, background: "transparent",
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}>
                    <Plus size={11} strokeWidth={2.2} />
                    Cierro a mediodía
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {anyOpen && (
        <button type="button" onClick={applyToAll} style={{
          alignSelf: "flex-start", marginTop: "4px",
          fontFamily: MONO, fontSize: "9.5px", letterSpacing: "0.08em",
          textTransform: "uppercase", padding: "7px 12px", borderRadius: "7px",
          cursor: "pointer", color: BALL, background: "transparent",
          border: `1px solid ${BALL}44`,
        }}>
          Usar el mismo horario todos los días
        </button>
      )}
    </div>
  );
}

/* ── Reposicionar la portada arrastrándola, estilo Facebook ────────────── */
function CoverPositioner({ src, position, onChange }: {
  src: string;
  position: number;
  onChange: (p: number) => void;
}) {
  const boxRef    = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  // Se guardan al empezar a arrastrar para calcular el desplazamiento relativo
  const startRef  = useRef({ y: 0, pos: 50 });

  function clamp(n: number) { return Math.min(100, Math.max(0, n)); }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { y: e.clientY, pos: position };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const h = boxRef.current?.clientHeight ?? 1;
    // Arrastrar hacia abajo debe revelar la parte de arriba de la imagen
    const delta = ((e.clientY - startRef.current.y) / h) * 100;
    onChange(Math.round(clamp(startRef.current.pos - delta)));
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  }

  /** Con el teclado se ajusta de 5 en 5 */
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowUp")   { e.preventDefault(); onChange(clamp(position - 5)); }
    if (e.key === "ArrowDown") { e.preventDefault(); onChange(clamp(position + 5)); }
  }

  return (
    <div style={{ marginTop: "14px" }}>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: "10px", marginBottom: "8px", flexWrap: "wrap",
      }}>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: INK2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Arrastra para reposicionar
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: COURT, fontVariantNumeric: "tabular-nums" }}>
          {position}%
        </span>
      </div>

      <div
        ref={boxRef}
        role="slider"
        tabIndex={0}
        aria-label="Posición vertical de la portada"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={position}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        style={{
          position: "relative", width: "100%",
          // Mismo encuadre ancho que la portada real
          aspectRatio: "1200 / 340",
          borderRadius: "10px", overflow: "hidden",
          border: `1px solid ${dragging ? COURT : "rgba(255,255,255,0.12)"}`,
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none", userSelect: "none",
        }}
      >
        <Image
          src={src}
          alt="Previsualización de la portada"
          fill
          sizes="720px"
          draggable={false}
          style={{ objectFit: "cover", objectPosition: `center ${position}%`, pointerEvents: "none" }}
        />
        {/* Guía: dónde queda el avatar en el perfil real */}
        <div aria-hidden="true" style={{
          position: "absolute", left: "5%", bottom: "-14%",
          width: "13%", aspectRatio: "1", borderRadius: "50%",
          border: "2px dashed rgba(255,255,255,0.5)",
          background: "rgba(5,7,13,0.5)",
        }} />
      </div>

      <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
        <button type="button" onClick={() => onChange(0)} style={miniBtn(position === 0)}>Arriba</button>
        <button type="button" onClick={() => onChange(50)} style={miniBtn(position === 50)}>Centro</button>
        <button type="button" onClick={() => onChange(100)} style={miniBtn(position === 100)}>Abajo</button>
      </div>
    </div>
  );
}

function miniBtn(active: boolean): React.CSSProperties {
  return {
    fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "6px 12px", borderRadius: "7px", cursor: "pointer",
    color: active ? BG0 : INK2,
    background: active ? COURT : "transparent",
    border: `1px solid ${active ? COURT : "rgba(255,255,255,0.14)"}`,
  };
}
