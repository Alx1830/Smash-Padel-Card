"use client";

/**
 * Pestaña "En vivo": quién está en la página ahora mismo y cómo va el día.
 * "En línea" es quien avisó en los últimos 135 s (lo decide panel_en_vivo()).
 */

import { useMemo } from "react";
import Link from "next/link";
import {
  Radio, Smartphone, Tablet, Monitor, MapPin, Globe, Clock, Eye, UserRound,
  UserCheck, Sparkles, Layers, AppWindow, Compass, MoonStar, Activity, Languages, Building2,
} from "lucide-react";
import {
  MONO, DISP, COURT, ADMIN, INK0, INK1, INK2, SERIE, COLOR,
  type Panel, type Visitante, type Par,
  nombrePais, nombreRuta, nombreOrigen, nombreIdioma, duracion, contar, horaMinuto, num,
  ETIQUETA_DISPOSITIVO, SIN_DATO, Tarjeta, Titulo, Seccion, Vacio,
} from "./comun";
import {
  Columnas, Dona, ListaBarras, porciones, colorFijo,
  COLOR_SO, COLOR_NAVEGADOR, COLOR_DISPOSITIVO, COLOR_APP, type FilaBarra,
} from "./graficos";
import { Cifra } from "./cifras";

const aFilas = (pares: Par[], etiqueta: (k: string) => string = k => k): FilaBarra[] =>
  pares.map(p => ({ k: p.k, etiqueta: p.k === SIN_DATO ? SIN_DATO : etiqueta(p.k), n: p.n }));

export function VistaEnVivo({ panel, ahora }: { panel: Panel; ahora: number }) {
  const lista = panel.en_linea;

  const resumen = useMemo(() => {
    const conSesion = lista.filter(v => v.user_id).length;
    return {
      total: lista.length,
      conSesion,
      anonimos: lista.length - conSesion,
      segundoPlano: lista.filter(v => !v.en_primer_plano).length,
      paginas:      contar(lista, v => v.ruta),
      paises:       contar(lista, v => v.pais),
      ciudades:     contar(lista, v => v.ciudad ? `${v.ciudad}${v.pais ? `, ${v.pais}` : ""}` : null),
      dispositivos: contar(lista, v => v.dispositivo ? ETIQUETA_DISPOSITIVO[v.dispositivo] : null),
      so:           contar(lista, v => v.so),
      navegadores:  contar(lista, v => v.navegador),
      origen:       contar(lista, v => nombreOrigen(v.utm_fuente ?? v.referido)),
      app:          contar(lista, v => v.pwa ? "App instalada" : "Navegador"),
      idiomas:      contar(lista, v => v.idioma),
    };
  }, [lista]);

  /* Los 30 minutos completos: los que no tuvieron visitas van en cero */
  const minutos = useMemo(() => {
    const porClave = new Map(panel.por_minuto.map(d => [new Date(d.m).getTime(), d]));
    const actual = Math.floor(ahora / 60_000) * 60_000;
    return Array.from({ length: 30 }, (_, i) => {
      const t = actual - (29 - i) * 60_000;
      const d = porClave.get(t);
      return {
        clave: String(t),
        eje: i === 29 ? "ahora" : horaMinuto(t),
        titulo: i === 29 ? `Este minuto · ${horaMinuto(t)}` : `${horaMinuto(t)} · hace ${29 - i} min`,
        valor: d?.vistas ?? 0,
        detalle: `${d?.visitantes ?? 0} ${d?.visitantes === 1 ? "visitante" : "visitantes"}`,
      };
    });
  }, [panel.por_minuto, ahora]);

  return (
    <>
      {/* Cifras */}
      <div className="ev-kpis">
        <Tarjeta acento={COURT} className="ev-hero">
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: COURT }}>
            <span className="ev-pulso" /> En línea ahora
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
            <div className="ev-hero-num">{resumen.total}</div>
            <div style={{ paddingBottom: 8, fontFamily: MONO, fontSize: 10, color: INK1, lineHeight: 1.7 }}>
              <div><UserCheck size={11} color={COURT} style={{ display: "inline-block", verticalAlign: -1, marginRight: 5 }} />{resumen.conSesion} con sesión</div>
              <div><UserRound size={11} color={SERIE[1]} style={{ display: "inline-block", verticalAlign: -1, marginRight: 5 }} />{resumen.anonimos} sin cuenta</div>
            </div>
          </div>
          {resumen.total > 0 && (
            <div className="ev-proporcion" aria-hidden>
              <span style={{ flex: resumen.conSesion, background: COURT }} />
              <span style={{ flex: resumen.anonimos, background: SERIE[1] }} />
            </div>
          )}
          {resumen.segundoPlano > 0 && (
            <div style={{ fontFamily: MONO, fontSize: 9.5, color: INK2, marginTop: 10 }}>
              <MoonStar size={10} style={{ display: "inline-block", verticalAlign: -1, marginRight: 5 }} />
              {resumen.segundoPlano} con la pestaña en segundo plano
            </div>
          )}
        </Tarjeta>
        <Cifra Icon={Activity}  color={COLOR.visitantes} label="Últimos 30 min"     valor={num(panel.ultimos_30)} nota="personas distintas" />
        <Cifra Icon={UserRound} color={COLOR.sesiones}   label="Visitantes hoy"     valor={num(panel.hoy_visitantes)} nota={`${num(panel.hoy_con_sesion)} con sesión`} />
        <Cifra Icon={Eye}       color={COLOR.vistas}     label="Páginas vistas hoy" valor={num(panel.hoy_vistas)}
          nota={panel.hoy_visitantes ? `${(panel.hoy_vistas / panel.hoy_visitantes).toFixed(1).replace(".", ",")} por visitante` : undefined} />
        <Cifra Icon={Sparkles}  color={COLOR.nuevos}     label="Nuevos hoy"         valor={num(panel.hoy_nuevos)} nota="primera vez en el sitio" />
      </div>

      {/* Por minuto + lo más visto hoy */}
      <div className="ev-dos">
        <Tarjeta acento={COLOR.visitantes}>
          <Titulo Icon={Clock} acento={COLOR.visitantes} texto="Páginas vistas por minuto"
            extra={<span style={{ fontFamily: MONO, fontSize: 9, color: INK2 }}>últimos 30 min</span>} />
          {minutos.some(m => m.valor > 0)
            ? <Columnas datos={minutos} color={COLOR.visitantes} unidad="páginas vistas" alto={236} />
            : <Vacio compacto Icon={Clock} texto="Nadie abrió páginas en los últimos 30 minutos." />}
        </Tarjeta>
        <Tarjeta acento={COLOR.vistas}>
          <Titulo Icon={Eye} acento={COLOR.vistas} texto="Lo más visto hoy" />
          {panel.paginas_hoy.length === 0
            ? <Vacio compacto Icon={Eye} texto="Todavía no hay visitas hoy." />
            : <ListaBarras color={COLOR.vistas} unidad="vistas" visibles={6}
                filas={panel.paginas_hoy.map(p => ({ k: p.ruta, etiqueta: nombreRuta(p.ruta), n: p.vistas, href: p.ruta }))} />}
        </Tarjeta>
      </div>

      <Seccion>Los que están ahora ({resumen.total})</Seccion>

      {lista.length === 0 ? (
        <Vacio Icon={Radio} texto="No hay nadie conectado en este momento. Apenas alguien abra la página aparece aquí, sin recargar." />
      ) : (
        <>
          {/* Proporciones */}
          <div className="ev-g4">
            <Tarjeta acento={SERIE[0]}>
              <Titulo Icon={Smartphone} acento={SERIE[0]} texto="Dispositivo" />
              <Dona unidad="personas" datos={porciones(resumen.dispositivos, colorFijo(COLOR_DISPOSITIVO, SERIE))} />
            </Tarjeta>
            <Tarjeta acento={SERIE[1]}>
              <Titulo Icon={AppWindow} acento={SERIE[1]} texto="App o navegador" />
              <Dona unidad="personas" datos={porciones(resumen.app, colorFijo(COLOR_APP, SERIE))} />
            </Tarjeta>
            <Tarjeta acento={SERIE[3]}>
              <Titulo Icon={Monitor} acento={SERIE[3]} texto="Sistema operativo" />
              <Dona unidad="personas" datos={porciones(resumen.so, colorFijo(COLOR_SO, SERIE))} />
            </Tarjeta>
            <Tarjeta acento={SERIE[2]}>
              <Titulo Icon={Compass} acento={SERIE[2]} texto="Navegador" />
              <Dona unidad="personas" datos={porciones(resumen.navegadores, colorFijo(COLOR_NAVEGADOR, SERIE))} />
            </Tarjeta>
          </div>

          {/* Listas */}
          <div className="ev-g3" style={{ marginTop: 14 }}>
            <Tarjeta acento={SERIE[6]}>
              <Titulo Icon={Layers} acento={SERIE[6]} texto="Dónde están en el sitio" />
              <ListaBarras color={SERIE[6]} unidad="personas"
                filas={resumen.paginas.map(p => ({ k: p.k, etiqueta: p.k === SIN_DATO ? SIN_DATO : nombreRuta(p.k), n: p.n, href: p.k === SIN_DATO ? undefined : p.k }))} />
            </Tarjeta>
            <Tarjeta acento={SERIE[0]}>
              <Titulo Icon={Globe} acento={SERIE[0]} texto="País" />
              <ListaBarras color={SERIE[0]} unidad="personas"
                filas={resumen.paises.map(p => ({ k: p.k, etiqueta: nombrePais(p.k), n: p.n, chip: p.k === SIN_DATO ? undefined : p.k }))} />
            </Tarjeta>
            <Tarjeta acento={SERIE[5]}>
              <Titulo Icon={Building2} acento={SERIE[5]} texto="Ciudad" />
              <ListaBarras color={SERIE[5]} unidad="personas" filas={aFilas(resumen.ciudades)} />
            </Tarjeta>
            <Tarjeta acento={SERIE[4]}>
              <Titulo Icon={Radio} acento={SERIE[4]} texto="Cómo llegaron" />
              <ListaBarras color={SERIE[4]} unidad="personas" filas={aFilas(resumen.origen)} />
            </Tarjeta>
            <Tarjeta acento={SERIE[7]}>
              <Titulo Icon={Languages} acento={SERIE[7]} texto="Idioma del equipo" />
              <ListaBarras color={SERIE[7]} unidad="personas" filas={aFilas(resumen.idiomas, nombreIdioma)} />
            </Tarjeta>
          </div>

          <Seccion>Cada visitante</Seccion>
          <div className="ev-gente">
            {lista.map(v => <TarjetaVisitante key={v.visitante_id} v={v} ahora={ahora} />)}
          </div>
        </>
      )}
    </>
  );
}

/* ── Tarjeta de cada visitante ───────────────────────────────── */

function IconoDispositivo({ tipo, size = 14, color = INK2 }: { tipo: Visitante["dispositivo"]; size?: number; color?: string }) {
  const Icon = tipo === "movil" ? Smartphone : tipo === "tablet" ? Tablet : Monitor;
  return <Icon size={size} color={color} strokeWidth={1.8} />;
}

function Dato({ Icon, children, titulo }: { Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; children: React.ReactNode; titulo: string }) {
  return (
    <div className="ev-dato" title={titulo}>
      <Icon size={12} color={INK2} strokeWidth={1.8} />
      <span>{children}</span>
    </div>
  );
}

function TarjetaVisitante({ v, ahora }: { v: Visitante; ahora: number }) {
  const lugar = [v.ciudad, v.region, v.pais ? nombrePais(v.pais) : null].filter(Boolean).join(", ") || "Ubicación desconocida";
  const conCuenta = !!v.user_id;
  const acento = conCuenta ? COURT : SERIE[1];

  return (
    <Tarjeta acento={acento} className="ev-visitante">
      {/* Quién */}
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div className="ev-avatar" style={{ ["--acento" as string]: acento }}>
          {conCuenta ? <UserCheck size={17} color={acento} strokeWidth={1.8} /> : <UserRound size={17} color={acento} strokeWidth={1.8} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: INK0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {v.username
                ? <Link href={`/${v.username}`} className="ev-enlace" style={{ color: INK0 }}>@{v.username}</Link>
                : "Visitante sin cuenta"}
            </span>
            {v.role === "admin" && <span className="ev-badge" style={{ color: ADMIN, borderColor: "rgba(79,240,255,0.35)" }}>ADMIN</span>}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, color: INK2, marginTop: 3, lineHeight: 1.5 }}>
            <span style={{ color: v.sesiones > 1 ? INK1 : SERIE[5] }}>{v.sesiones > 1 ? `Ha venido ${v.sesiones} veces` : "Primera visita"}</span>
            {" · "}<span style={{ whiteSpace: "nowrap" }}>conectado hace {duracion(v.sesion_inicio, ahora)}</span>
          </div>
        </div>
        <div title={v.en_primer_plano ? "Mirando la página" : "Pestaña en segundo plano"}
          className="ev-estado" style={{ color: v.en_primer_plano ? COURT : INK2, borderColor: v.en_primer_plano ? "rgba(46,230,193,0.3)" : "rgba(255,255,255,0.1)" }}>
          {v.en_primer_plano ? <span className="ev-pulso" style={{ width: 6, height: 6 }} /> : <MoonStar size={10} />}
          {v.en_primer_plano ? "Activo" : "Oculta"}
        </div>
      </div>

      {/* Dónde está en el sitio */}
      <div className="ev-ahora" style={{ ["--acento" as string]: acento }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: INK2 }}>Está viendo</div>
        <div style={{ fontFamily: DISP, fontSize: 15, fontWeight: 600, color: INK0, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {v.ruta ? <Link href={v.ruta} className="ev-enlace" style={{ color: INK0 }}>{nombreRuta(v.ruta)}</Link> : "—"}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9.5, color: INK2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 3 }}>
          {v.ruta ?? "—"} · <span style={{ color: INK1 }}>{v.paginas_sesion} {v.paginas_sesion === 1 ? "página" : "páginas"}</span> en esta visita
        </div>
      </div>

      {/* Detalles */}
      <div className="ev-datos">
        <Dato Icon={MapPin} titulo="Ubicación">{lugar}</Dato>
        <div className="ev-dato" title="Dispositivo y pantalla">
          <IconoDispositivo tipo={v.dispositivo} size={12} />
          <span>{v.dispositivo ? ETIQUETA_DISPOSITIVO[v.dispositivo] : "—"}{v.pantalla ? ` · ${v.pantalla}` : ""}</span>
        </div>
        <Dato Icon={Monitor} titulo="Sistema operativo">{v.so ?? "—"}</Dato>
        <Dato Icon={Compass} titulo="Navegador">{v.navegador ?? "—"}{v.pwa ? " · App" : ""}</Dato>
        <Dato Icon={Radio} titulo="De dónde llegó">{nombreOrigen(v.utm_fuente ?? v.referido)}</Dato>
        <Dato Icon={Clock} titulo="Zona horaria">{v.zona_horaria ?? "—"}</Dato>
      </div>
    </Tarjeta>
  );
}
