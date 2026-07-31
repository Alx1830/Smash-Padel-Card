"use client";

import Image from "next/image";
import { Store, MapPin, BadgeCheck, Clock, Ban } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { StoreSections, type StoreHours } from "@/components/StoreSections";
import { FacebookIcon, InstagramIcon, WhatsappIcon } from "@/components/SocialIcons";

const COURT = "#2ee6c1";
const LIME  = "#d6ff3d";
const INK0  = "#f5f7fb";
const INK1  = "#b6bdcc";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

export interface StoreProfileData {
  username:      string;
  firstName:     string;
  lastName:      string;
  tipoPerfil:    string;
  pais:          string;
  ciudad:        string;
  photoUrl?:     string;
  coverUrl?:     string;
  /** Encuadre vertical de la portada en %: 0 arriba, 50 centro, 100 abajo */
  coverPosition?: number;
  /** Dirección física de la tienda, para el mapa */
  address?: string;
  hours?: StoreHours | null;
  /** Enlace de Google Maps pegado por la tienda */
  mapsUrl?: string;
  /** Redes: usuario o URL completa; el WhatsApp es solo dígitos */
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  storeStatus:   "pending" | "approved" | "rejected" | null;
  profileUserId?: string;
  currentUserId:  string | null;
  /** El dueño ve su perfil aunque esté pendiente, con el aviso de estado */
  isOwner:       boolean;
}

/** El nombre comercial vive en first_name + last_name, como en el resto de perfiles */
const storeName = (p: StoreProfileData) =>
  `${p.firstName}${p.lastName ? ` ${p.lastName}` : ""}`.trim() || p.username;

/* ══ Perfil de Tienda Pokémon — formato fanpage ══ */
export function StoreProfilePage({ store }: { store: StoreProfileData }) {
  const name     = storeName(store);
  const approved = store.storeStatus === "approved";

  return (
    <div style={{ width: "100%" }}>
      <style>{`
        @property --store-ring-angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }
        @keyframes store-ring-spin { to { --store-ring-angle: 360deg; } }
        .store-avatar-ring {
          animation: store-ring-spin 4s linear infinite;
          background: conic-gradient(
            from var(--store-ring-angle),
            #4ff0ff, #2ee6c1, #d6ff3d, #ffd24f, #ff4fd8, #a26bff, #4ff0ff
          );
        }
        /* Sin animación para quien la haya desactivado en su sistema */
        @media (prefers-reduced-motion: reduce) {
          .store-avatar-ring { animation: none; }
        }
        .store-cover { height: clamp(184px, 34.5vw, 391px); }
        .store-identity { text-align: center; }
        @media (min-width: 900px) {
          .store-identity { text-align: left; }
        }
      `}</style>

      {/* ══ PORTADA ══ */}
      <section
        className="store-cover"
        style={{
          position: "relative", overflow: "hidden", isolation: "isolate",
          background: store.coverUrl
            ? undefined
            : `radial-gradient(ellipse 80% 70% at 30% 20%, rgba(46,230,193,0.30), transparent 60%),
               radial-gradient(ellipse 60% 50% at 85% 80%, rgba(255,79,216,0.24), transparent 70%),
               radial-gradient(ellipse 70% 50% at 60% 100%, rgba(79,240,255,0.20), transparent 70%),
               linear-gradient(180deg, #0a1320 0%, #060912 100%)`,
        }}
      >
        {store.coverUrl && (
          <Image
            src={store.coverUrl}
            alt={`Portada de ${name}`}
            fill
            priority
            unoptimized
            style={{
              objectFit: "cover",
              objectPosition: `center ${store.coverPosition ?? 50}%`,
            }}
          />
        )}

        {!store.coverUrl && (
          <div aria-hidden="true" style={{
            position: "absolute", inset: 0,
            backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
            WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
            maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
          }} />
        )}

        {/* Degradado inferior: el avatar y el nombre se apoyan sobre él */}
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(5,7,13,0.92) 0%, rgba(5,7,13,0.25) 45%, transparent 75%)",
        }} />
      </section>

      {/* ══ IDENTIDAD ══ */}
      <section style={{
        maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px, 4vw, 48px) 32px",
        // Se pinta sobre la portada: sin esto, el degradado absoluto del cover
        // tapa la mitad superior del anillo del avatar.
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          display: "flex", flexWrap: "wrap", alignItems: "flex-end",
          gap: "clamp(16px, 3vw, 28px)",
          marginTop: "clamp(-64px, -9vw, -84px)",
        }}>
          {/* Avatar circular con anillo arcoíris */}
          <div
            className="store-avatar-ring"
            style={{
              width: "clamp(120px, 18vw, 168px)", aspectRatio: "1",
              borderRadius: "50%", padding: 4, flexShrink: 0,
              margin: "0 auto",
              boxShadow: "0 24px 60px -18px rgba(79,240,255,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          >
            <div style={{
              position: "relative", width: "100%", height: "100%",
              borderRadius: "50%", overflow: "hidden",
              background: "radial-gradient(ellipse 100% 100% at 50% 0%, #1a2542 0%, #0b1025 60%, #05070f 100%)",
              border: "3px solid #05070d",
            }}>
              {store.photoUrl ? (
                <Image
                  src={store.photoUrl}
                  alt={name}
                  fill
                  priority
                  unoptimized
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%", display: "flex",
                  alignItems: "center", justifyContent: "center", color: COURT,
                }}>
                  <Store size={38} strokeWidth={1.6} />
                </div>
              )}
            </div>
          </div>

          {/* Nombre y datos */}
          <div className="store-identity" style={{ flex: 1, minWidth: 260, paddingBottom: 6 }}>
            <div className="store-name-row" style={{
              display: "flex", alignItems: "center", gap: 14,
              flexWrap: "wrap", justifyContent: "center",
            }}>
              <h1 style={{
                fontFamily: DISP, fontSize: "clamp(28px, 5vw, 46px)", lineHeight: 1.02,
                margin: 0, letterSpacing: "-0.02em", color: INK0,
              }}>
                {name}
              </h1>
              {/* Una tienda también sigue y es seguida; el propio botón
                  muestra "Seguidores" cuando el perfil es tuyo. */}
              {store.profileUserId && (
                <FollowButton
                  profileUserId={store.profileUserId}
                  currentUserId={store.currentUserId}
                />
              )}

              {/* Insignia al extremo derecho de la fila del nombre */}
              <div className="store-badge" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontFamily: MONO, fontSize: 10, letterSpacing: "0.2em",
                textTransform: "uppercase", color: COURT,
                border: `1px solid ${COURT}44`, background: `${COURT}12`,
                borderRadius: 999, padding: "5px 12px", whiteSpace: "nowrap",
              }}>
                <Store size={12} strokeWidth={2} />
                {store.tipoPerfil || "Tienda Pokémon"}
                {approved && <BadgeCheck size={13} strokeWidth={2.2} />}
              </div>
            </div>

            <p style={{
              margin: "8px 0 0", fontFamily: MONO, fontSize: 12,
              letterSpacing: "0.08em", color: INK2,
            }}>
              @{store.username}
            </p>

            {(store.ciudad !== "—" || store.pais !== "—") && (
              <p style={{
                margin: "10px 0 0", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 7, flexWrap: "wrap",
                fontFamily: MONO, fontSize: 11.5, letterSpacing: "0.12em",
                textTransform: "uppercase", color: INK1,
              }} className="store-meta">
                <MapPin size={13} strokeWidth={1.9} style={{ color: COURT, flexShrink: 0 }} />
                {[store.ciudad, store.pais].filter(v => v && v !== "—").join(" · ")}
              </p>
            )}

            <StoreSocial
              facebook={store.facebook}
              instagram={store.instagram}
              whatsapp={store.whatsapp}
            />

          </div>
        </div>

        {/* Aviso de estado, solo para el dueño */}
        {store.isOwner && store.storeStatus !== "approved" && (
          <StoreStatusNotice status={store.storeStatus} />
        )}
      </section>

      <StoreSections
        username={store.username}
        profileUserId={store.profileUserId}
        address={store.address}
        mapsUrl={store.mapsUrl}
        hours={store.hours}
        city={store.ciudad}
        pais={store.pais}
      />

      <style>{`
        @media (min-width: 900px) {
          .store-avatar-ring { margin: 0 !important; }
          .store-meta, .store-name-row, .store-social { justify-content: flex-start !important; }
          /* La insignia se va al extremo derecho de la fila del nombre */
          .store-badge { margin-left: auto; }
        }
      `}</style>
    </div>
  );
}

/* ══ Redes sociales de la tienda ══ */
/** Acepta usuario suelto o URL completa; en ambos casos arma un enlace válido */
const socialHref = (kind: "facebook" | "instagram", value: string) => {
  const v = value.trim().replace(/^@/, "");
  if (/^https?:\/\//i.test(v)) return v;
  return `https://www.${kind}.com/${v}`;
};

function StoreSocial({ facebook, instagram, whatsapp }: {
  facebook?: string; instagram?: string; whatsapp?: string;
}) {
  const wa = whatsapp?.replace(/\D/g, "");
  if (!facebook && !instagram && !wa) return null;

  const links = [
    facebook  && { key: "fb", label: "Facebook",  href: socialHref("facebook", facebook),   Icon: FacebookIcon,  color: "#4c8bf5" },
    instagram && { key: "ig", label: "Instagram", href: socialHref("instagram", instagram), Icon: InstagramIcon, color: "#e1478f" },
    wa        && { key: "wa", label: "WhatsApp",  href: `https://wa.me/${wa}`,              Icon: WhatsappIcon,  color: "#25D366" },
  ].filter(Boolean) as { key: string; label: string; href: string; Icon: typeof FacebookIcon; color: string }[];

  return (
    <div className="store-social" style={{
      display: "flex", gap: 9, marginTop: 14,
      justifyContent: "center", flexWrap: "wrap",
    }}>
      {links.map(({ key, label, href, Icon, color }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={label}
          aria-label={label}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 38, height: 38, borderRadius: "50%",
            border: `1px solid ${color}55`, background: `${color}14`,
            color, textDecoration: "none",
          }}
        >
          <Icon size={18} strokeWidth={1.8} color={color} />
        </a>
      ))}
    </div>
  );
}

/* ══ Aviso de moderación ══ */
function StoreStatusNotice({ status }: { status: StoreProfileData["storeStatus"] }) {
  const rejected = status === "rejected";
  const accent   = rejected ? "#ff6b6b" : LIME;

  return (
    <div style={{
      marginTop: 28, padding: "14px 16px", borderRadius: 12,
      border: `1px solid ${accent}44`, background: `${accent}0e`,
      display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      <span style={{ color: accent, flexShrink: 0, marginTop: 1 }}>
        {rejected ? <Ban size={16} strokeWidth={2} /> : <Clock size={16} strokeWidth={2} />}
      </span>
      <div>
        <p style={{
          fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em",
          textTransform: "uppercase", color: accent, margin: 0,
        }}>
          {rejected ? "Perfil no aprobado" : "Perfil en revisión"}
        </p>
        <p style={{
          fontFamily: MONO, fontSize: 11.5, color: INK1, margin: "6px 0 0", lineHeight: 1.6,
        }}>
          {rejected
            ? "Un administrador revisó tu tienda y no la aprobó. Escríbenos si crees que fue un error."
            : "Así se verá tu tienda cuando la aprobemos. Por ahora solo tú puedes verla: los visitantes ven un aviso de que está en revisión."}
        </p>
      </div>
    </div>
  );
}

/* ══ Lo que ve un visitante si la tienda no está aprobada ══ */
export function StorePendingScreen({ username }: { username: string }) {
  return (
    <section style={{
      minHeight: "70vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: "80px 24px", gap: 18,
    }}>
      <div style={{
        width: 68, height: 68, borderRadius: "50%",
        border: `1px solid ${COURT}44`, background: `${COURT}12`,
        display: "flex", alignItems: "center", justifyContent: "center", color: COURT,
      }}>
        <Store size={28} strokeWidth={1.6} />
      </div>
      <h1 style={{
        fontFamily: DISP, fontSize: "clamp(24px, 4vw, 34px)", color: INK0,
        margin: 0, letterSpacing: "-0.02em",
      }}>
        Esta tienda está en revisión
      </h1>
      <p style={{
        fontFamily: MONO, fontSize: 12, color: INK2, margin: 0,
        lineHeight: 1.7, maxWidth: 420,
      }}>
        El perfil de <b style={{ color: INK1 }}>@{username}</b> todavía no fue aprobado
        por un administrador de FaceBinder. Vuelve pronto.
      </p>
    </section>
  );
}
