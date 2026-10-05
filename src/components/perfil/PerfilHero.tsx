import Image from "next/image";
import { Crown, MapPin, Copy, Layers, BadgeDollarSign, UsersRound, UserRound, Store, Tag, BadgeCheck, Star } from "lucide-react";
import { FilaRedes } from "./Redes";
import { StatSeguidores } from "./ListaSeguidores";
import { PORTADA_DEGRADADO } from "@/data/store-covers";
import { PerfilAcciones } from "./PerfilAcciones";
import { COURT, CYAN, SKY, VIOLET, GOLD, BALL, INK0, INK1, INK2, MONO, DISP, BG0, ZOOM_PORTADA_MOVIL } from "./tokens";
import type { Perfil } from "@/app/[username]/(perfil)/datos";

/**
 * Cabecera del perfil nuevo: portada a todo el ancho, avatar con anillo,
 * nombre (con corona si está verificado), ubicación, etiquetas, acciones y la
 * tarjeta de números. Parte de la cabecera de tiendas que aprobó el usuario.
 */
export function PerfilHero({ perfil }: { perfil: Perfil }) {
  const { jugador: j, metricas: m, ventas } = perfil;
  const ubicacion = [j.ciudad, j.pais].filter(Boolean).join(" · ");
  const esTienda = j.tipoPerfil === "Tienda Pokémon";

  const chips: { icon: typeof Store; label: string; color?: string }[] = [];
  if (j.tipoPerfil) chips.push({ icon: esTienda ? Store : Layers, label: j.tipoPerfil });
  if (esTienda && j.tiendaAprobada) chips.push({ icon: BadgeCheck, label: "Tienda verificada", color: COURT });
  if (m.en_venta > 0) chips.push({ icon: Tag, label: "Vende cartas" });
  if (ventas.total > 0 && ventas.promedio != null) chips.push({ icon: Star, label: `${ventas.promedio.toLocaleString("es-CO", { minimumFractionDigits: 1 })} en reseñas`, color: GOLD });

  const stats = [
    { icon: Copy,            color: CYAN,   valor: m.cartas_total, label: "Cartas" },
    { icon: BadgeDollarSign, color: BALL,   valor: ventas.total,   label: "Vendidas" },
    { icon: UsersRound,      color: SKY,    valor: m.seguidores,   label: "Seguidores", lista: "seguidores" as const },
    { icon: UserRound,       color: VIOLET, valor: m.siguiendo,    label: "Siguiendo",  lista: "siguiendo" as const },
  ];

  return (
    <header className="pf-hero">
      <style>{`
        /* El anillo se pinta una vez y gira entero (transform): eso lo hace la
           tarjeta gráfica casi gratis. Antes se animaba el ángulo del degradado
           y el navegador repintaba el anillo en cada cuadro: ~10 % de CPU fijo. */
        /* Safari (iPhone) no recorta con border-radius + overflow a un hijo que
           gira: el anillo salía cortado y la foto se le montaba. clip-path sí lo
           respeta en todos los navegadores. */
        .pf-ring { position: relative; overflow: hidden; isolation: isolate; clip-path: circle(50% at 50% 50%); -webkit-clip-path: circle(50% at 50% 50%); }
        .pf-ring-giro {
          position: absolute; inset: 0; border-radius: 50%; z-index: 0;
          background: conic-gradient(#4ff0ff, #2ee6c1, #d6ff3d, #ffd24f, #ff4fd8, #a26bff, #4ff0ff);
          animation: pf-ring-spin 6s linear infinite;
        }
        @keyframes pf-ring-spin { to { transform: rotate(360deg); } }
        /* Cuadrícula de la portada por defecto: se desliza con background-position
           sobre una capa propia, sin repintar el resto de la cabecera. */
        .pf-cuadricula {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 80px 80px;
          -webkit-mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%);
          mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%);
          animation: pf-grid-pan 6s linear infinite;
        }
        @keyframes pf-grid-pan { to { background-position: 80px 80px; } }
        @media (prefers-reduced-motion: reduce) { .pf-ring-giro, .pf-cuadricula { animation: none; } }

        .pf-banner { position: relative; overflow: hidden; height: clamp(210px, calc(22vw + 30px), 360px); }
        .pf-cuerpo { position: relative; z-index: 1; max-width: 1400px; margin: 0 auto; padding: 0 clamp(16px, 3vw, 46px); }
        .pf-fila   { display: flex; align-items: flex-end; gap: 28px; margin-top: calc(-1 * clamp(90px, 11vw, 190px)); }
        .pf-avatar { width: clamp(112px, 10vw, 148px); }
        .pf-ident  { flex: 1; min-width: 0; padding-bottom: 4px; }
        /* El nombre y los datos caen sobre la portada, que puede ser clara u
           oscura: la sombra doble (cercana y difusa) los despega de cualquier fondo. */
        .pf-ident h1, .pf-ident p, .pf-ident .pf-chips span {
          text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.55);
        }
        .pf-ident .pf-arroba svg { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9)); }
        .pf-nombre-fila { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .pf-stats  {
          display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
          width: min(480px, 38vw); flex-shrink: 0; margin-bottom: 4px;
          border-radius: 14px; border: 1px solid rgba(46,230,193,0.18);
          background: rgba(8,17,24,0.82); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .pf-stat { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 18px 6px; min-width: 0; }
        .pf-stat + .pf-stat { border-left: 1px solid rgba(255,255,255,0.06); }
        .pf-stat-boton { background: none; border-top: none; border-right: none; border-bottom: none; cursor: pointer; font: inherit; color: inherit; transition: background .15s; }
        .pf-stat-boton:first-child { border-left: none; }
        .pf-stat-boton:hover { background: rgba(255,255,255,0.03); }
        .pf-stat-boton:last-of-type { border-radius: 0 14px 14px 0; }
        .pf-stat-num { font-family: ${DISP}; font-size: 19px; font-weight: 700; color: ${INK0}; margin-top: 6px; }
        .pf-stat-lbl { font-family: ${MONO}; font-size: 10px; color: ${INK2}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

        @media (max-width: 1240px) {
          .pf-fila { flex-wrap: wrap; }
          .pf-stats { width: 100%; order: 3; margin-top: 20px; }
        }
        /* Celular y tableta: la portada siempre muestra la parte de arriba de la
           imagen. El encuadre que el usuario elige (cover_position) se piensa
           para la franja ancha del escritorio; en una pantalla angosta el mismo
           porcentaje cortaba justo lo que importaba. Gana sobre el estilo en línea. */
        @media (max-width: 1023px), (pointer: coarse) {
          .pf-banner-img { object-position: center top !important; }
        }
        /* En celular y tablet la barra fija de arriba del sitio (71 px) caía
           encima de la portada y, con la foto de perfil tapando la parte de
           abajo, solo quedaban unos 75 px de imagen a la vista. La portada
           empieza debajo de la barra: se ve casi el doble. */
        @media (max-width: 1023px) {
          .pf-hero { padding-top: 71px; }
        }
        /* En el celular la franja es angosta: la imagen se ve de arriba a abajo
           y se recorta por los costados. Ahí manda el encuadre horizontal que el
           usuario elige para el celular (cover_position_movil). */
        @media (max-width: 767px) {
          .pf-banner-img {
            object-position: center !important;
            transform: scale(${ZOOM_PORTADA_MOVIL}); transform-origin: var(--pf-x, 50%) var(--pf-y, 0%);
          }
        }
        /* Celular y tablet: cabecera centrada, como pidió el usuario para móvil */
        @media (max-width: 1023px) {
          .pf-fila { flex-direction: column; align-items: center; text-align: center; gap: 14px; margin-top: -64px; }
          .pf-ident { width: 100%; padding-bottom: 0; display: flex; flex-direction: column; align-items: center; }
          /* Todo centrado y en el orden en que se lee: nombre, @, ubicación,
             etiquetas y recién después los botones (antes los botones quedaban
             metidos entre el nombre y el @). */
          .pf-nombre-fila { display: contents; }
          .pf-ident h1 { order: 1; max-width: 100%; justify-content: center; }
          .pf-arroba { order: 2; }
          .pf-ubic   { order: 3; }
          .pf-chips  { order: 4; }
          .pf-acciones { order: 5; margin-top: 16px; }
          .pf-ubic, .pf-chips, .pf-acciones, .pf-arroba { justify-content: center; }
          .pf-ubic { flex-wrap: wrap; letter-spacing: 0.1em !important; }
          .pf-chips { margin-top: 12px !important; }
          .pf-stats { margin-top: 4px; width: 100%; max-width: 620px; }
        }
        @media (max-width: 767px) {
          .pf-stat { padding: 12px 2px; }
          .pf-stat svg { display: none; }
          .pf-stat-num { font-size: 16px; margin-top: 0; }
          .pf-stat-lbl { font-size: 9px; }
        }
        /* En el celular más chico (iPhone SE) la tarjeta de números no entra en
           cuatro columnas con etiquetas legibles: pasa a dos por dos. */
        @media (max-width: 359px) {
          .pf-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .pf-stat:nth-child(3) { border-left: none; }
          .pf-stat:nth-child(n+3) { border-top: 1px solid rgba(255,255,255,0.06); }
          .pf-stat-boton:last-of-type { border-radius: 0 0 14px 0; }
        }
      `}</style>

      {/* ══ Portada ══ */}
      {/* La portada que el usuario elige en Editar perfil; sin elegir, el degradado con la cuadrícula en movimiento */}
      <div className="pf-banner" style={{ background: j.portadaUrl ? BG0 : PORTADA_DEGRADADO }}>
        {j.portadaUrl ? (
          <Image src={j.portadaUrl} alt={`Portada de ${j.nombre}`} fill priority unoptimized className="pf-banner-img"
            style={{ objectFit: "cover", objectPosition: `center ${j.portadaPos}%`, ["--pf-x" as string]: `${j.portadaPosMovil}%`, ["--pf-y" as string]: `${j.portadaPosMovilY}%` }} />
        ) : (
          <div aria-hidden="true" className="pf-cuadricula" />
        )}
        {/* Solo se funde abajo, donde se apoyan el avatar y el nombre: la imagen se ve viva */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #05070d 0%, rgba(5,7,13,0.55) 22%, transparent 48%)" }} />
      </div>

      {/* ══ Identidad ══ */}
      <div className="pf-cuerpo">
        <div className="pf-fila">
          <div className="pf-ring pf-avatar" style={{ aspectRatio: "1", borderRadius: "50%", padding: 6, flexShrink: 0 }}>
            <span aria-hidden="true" className="pf-ring-giro" />
            {/* La foto va fija a 6 px del borde (el ancho del anillo). Con width/height
                100% Safari calculaba mal la altura dentro de la caja con aspect-ratio
                y la foto tapaba el anillo arriba y abajo. */}
            <div style={{ position: "absolute", inset: 6, zIndex: 1, borderRadius: "50%", overflow: "hidden", background: j.fotoUrl ? "transparent" : "#0b1025" }}>
              {j.fotoUrl ? (
                <Image src={j.fotoUrl} alt={j.nombre} fill priority unoptimized style={{ objectFit: "cover" }} />
              ) : (
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISP, fontSize: 40, fontWeight: 800, color: COURT }}>
                  {j.nombre.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="pf-ident">
            <div className="pf-nombre-fila">
              <h1 style={{ margin: 0, minWidth: 0, display: "flex", alignItems: "center", gap: 10, fontFamily: DISP, fontSize: "clamp(26px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-0.01em", color: INK0, lineHeight: 1.05 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "10px 14px", margin: "-10px -14px" }}>{j.nombre}</span>
                {j.verificado && (
                  <span title="Usuario verificado" style={{ lineHeight: 0, flexShrink: 0 }}>
                    <Crown size={22} color={GOLD} fill={GOLD} strokeWidth={1.6} aria-label="Usuario verificado" />
                  </span>
                )}
              </h1>
              <PerfilAcciones profileUserId={j.userId} visitanteId={perfil.visitanteId} username={j.username} />
            </div>

            <p className="pf-arroba" style={{ margin: "4px 0 0", display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 13, color: INK0 }}>
              @{j.username}
              {j.esAdmin && <InsigniaVerificada />}
            </p>

            {ubicacion && (
              <p className="pf-ubic" style={{ margin: "10px 0 0", display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: INK1 }}>
                <MapPin size={14} color={COURT} strokeWidth={2} /> {ubicacion}
              </p>
            )}

            {(chips.length > 0 || perfil.redes.length > 0) && (
              <div className="pf-chips" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 14 }}>
                {chips.map(c => (
                  <span key={c.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 24, padding: "0 10px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", fontFamily: MONO, fontSize: 10, color: c.color ?? "#9aa3b5", whiteSpace: "nowrap" }}>
                    <c.icon size={11} color="#f5f7fb" strokeWidth={2} /> {c.label}
                  </span>
                ))}
                <FilaRedes links={perfil.redes} />
              </div>
            )}
          </div>

          <div className="pf-stats">
            {stats.map(s => {
              const contenido = (
                <>
                  <s.icon size={18} color={s.color} strokeWidth={1.8} />
                  <span className="pf-stat-num">{s.valor.toLocaleString("es-CO")}</span>
                  <span className="pf-stat-lbl">{s.label}</span>
                </>
              );
              // Seguidores y Siguiendo abren la lista de personas
              return "lista" in s && s.lista
                ? <StatSeguidores key={s.label} userId={j.userId} tipo={s.lista}>{contenido}</StatSeguidores>
                : <div key={s.label} className="pf-stat">{contenido}</div>;
            })}
          </div>
        </div>
      </div>
    </header>
  );
}

/** Insignia azul junto al @, como la de X o Instagram. */
function InsigniaVerificada() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" role="img" aria-label="Cuenta verificada" style={{ flexShrink: 0 }}>
      <title>Cuenta verificada</title>
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" fill="#1d9bf0" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
