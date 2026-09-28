"use client";

/**
 * Pestaña "Reportes": todo lo que se guardó de las visitas en un rango de días
 * (hora de Bogotá). Los datos salen de reporte_visitas(), que también trae el
 * período anterior del mismo largo para mostrar si se subió o se bajó.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarRange, Download, RefreshCw, UsersRound, Eye, MousePointerClick, UserCheck, Sparkles,
  Timer, Layers, LogOut, TrendingUp, Clock, CalendarDays, FileText, Smartphone, AppWindow,
  Monitor, Compass, Globe, Building2, Radio, Languages, Crown, CalendarX, Check, ChevronDown,
} from "lucide-react";
import {
  MONO, COURT, CRIT, INK0, INK1, INK2, SERIE, COLOR, SIN_DATO,
  type Reporte, type Par,
  nombrePais, nombreRuta, nombreOrigen, nombreIdioma, num, segundos, reagrupar, ordenar,
  sumarDias, diasEntre, fechaCorta, fechaLarga, hora12, horaMinuto, ZONA, HISTORIAL_DESDE,
  DIAS_SEMANA, DIAS_CORTOS, ETIQUETA_DISPOSITIVO, Tarjeta, Titulo, Seccion, Vacio,
} from "./comun";
import {
  Area, Columnas, Dona, ListaBarras, MapaCalor, porciones, colorFijo,
  COLOR_SO, COLOR_NAVEGADOR, COLOR_DISPOSITIVO, COLOR_APP, type FilaBarra,
} from "./graficos";
import { Cifra, Cambio } from "./cifras";

/* ── Rangos ──────────────────────────────────────────────────── */

export interface Rango { desde: string; hasta: string }

export type Atajo = "hoy" | "ayer" | "7d" | "30d" | "90d" | "mes";

export const ATAJOS: { id: Atajo; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "ayer", label: "Ayer" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "90d", label: "90 días" },
  { id: "mes", label: "Este mes" },
];

export function rangoDeAtajo(a: Atajo, hoy: string): Rango {
  switch (a) {
    case "hoy":  return { desde: hoy, hasta: hoy };
    case "ayer": { const d = sumarDias(hoy, -1); return { desde: d, hasta: d }; }
    case "7d":   return { desde: sumarDias(hoy, -6), hasta: hoy };
    case "30d":  return { desde: sumarDias(hoy, -29), hasta: hoy };
    case "90d":  return { desde: sumarDias(hoy, -89), hasta: hoy };
    case "mes":  return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
  }
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Lee el rango de la URL; si falta o no sirve, los últimos 7 días */
export function leerRango(desde: string | null, hasta: string | null, hoy: string): Rango {
  if (!desde || !hasta || !FECHA.test(desde) || !FECHA.test(hasta)) return rangoDeAtajo("7d", hoy);
  let d = desde, h = hasta;
  if (h > hoy) h = hoy;
  if (d > h) [d, h] = [h, d];
  if (diasEntre(d, h) > 399) d = sumarDias(h, -399);
  return { desde: d, hasta: h };
}

/* ── Vista ───────────────────────────────────────────────────── */

export function VistaReportes({ reporte, cargando, error, rango, hoy, onRango, onActualizar }: {
  reporte: Reporte | null; cargando: boolean; error: string | null;
  rango: Rango; hoy: string; onRango: (r: Rango) => void; onActualizar: () => void;
}) {
  const atajo = ATAJOS.find(a => {
    const r = rangoDeAtajo(a.id, hoy);
    return r.desde === rango.desde && r.hasta === rango.hasta;
  })?.id ?? null;

  const dias = diasEntre(rango.desde, rango.hasta) + 1;
  const previoDesde = sumarDias(rango.desde, -dias);
  const previoHasta = sumarDias(rango.desde, -1);
  const contra = dias === 1 ? `vs ${fechaCorta(previoDesde)}` : `vs ${dias} días antes`;

  return (
    <>
      {/* Filtros: una sola fila arriba de todo lo que afectan */}
      <div className="ev-filtros">
        <div className="ev-atajos" role="group" aria-label="Rango rápido">
          {ATAJOS.map(a => (
            <button key={a.id} type="button" className={`ev-pill${atajo === a.id ? " on" : ""}`}
              aria-pressed={atajo === a.id} onClick={() => onRango(rangoDeAtajo(a.id, hoy))}>
              {atajo === a.id && <Check size={13} strokeWidth={2.6} />}
              {a.label}
            </button>
          ))}
        </div>
        <div className="ev-fechas">
          <label className="ev-fecha">
            <span>Desde</span>
            <input type="date" value={rango.desde} min={HISTORIAL_DESDE} max={hoy}
              onChange={e => {
                const d = e.target.value;
                if (FECHA.test(d)) onRango({ desde: d, hasta: d > rango.hasta ? d : rango.hasta });
              }} />
          </label>
          <label className="ev-fecha">
            <span>Hasta</span>
            <input type="date" value={rango.hasta} min={HISTORIAL_DESDE} max={hoy}
              onChange={e => {
                const h = e.target.value;
                if (FECHA.test(h)) onRango({ desde: h < rango.desde ? h : rango.desde, hasta: h });
              }} />
          </label>
          <div className="ev-acciones">
            <button type="button" className="ev-boton-icono" onClick={onActualizar} aria-label="Actualizar" title="Actualizar">
              <RefreshCw size={15} strokeWidth={1.9} className={cargando ? "ev-gira" : undefined} />
            </button>
            <button type="button" className="ev-boton" disabled={!reporte || cargando}
              onClick={() => reporte && descargarCSV(reporte)}>
              <Download size={14} strokeWidth={2} /> Descargar CSV
            </button>
          </div>
        </div>
      </div>

      <p style={{ fontFamily: MONO, fontSize: 10.5, color: INK2, lineHeight: 1.6, margin: "12px 0 0" }}>
        <CalendarRange size={12} color={COURT} style={{ display: "inline-block", verticalAlign: -2, marginRight: 6 }} />
        <span style={{ color: INK1 }}>
          {dias === 1 ? fechaLarga(rango.desde) : `${fechaCorta(rango.desde)} – ${fechaCorta(rango.hasta, true)}`}
        </span>
        {` · ${dias} ${dias === 1 ? "día" : "días"} · se compara con `}
        {dias === 1 ? fechaLarga(previoDesde) : `${fechaCorta(previoDesde)} – ${fechaCorta(previoHasta)}`}
        {rango.desde < HISTORIAL_DESDE && ` · el historial empieza el ${fechaCorta(HISTORIAL_DESDE, true)}`}
      </p>

      {error && <p style={{ fontFamily: MONO, fontSize: 11, color: CRIT, margin: "14px 0 0" }}>No se pudo cargar el reporte: {error}</p>}

      {!reporte ? (
        !error && <p style={{ fontFamily: MONO, fontSize: 12, color: INK2, letterSpacing: "0.1em", marginTop: 24 }}>Cargando...</p>
      ) : (
        <div className="ev-reporte" style={{ opacity: cargando ? 0.5 : 1 }} aria-busy={cargando}>
          <Contenido r={reporte} contra={contra} />
        </div>
      )}
    </>
  );
}

function Contenido({ r, contra }: { r: Reporte; contra: string }) {
  const t = r.totales;
  const unDia = r.dias <= 1;

  const d = useMemo(() => ({
    dispositivos: porciones(reagrupar(r.dispositivos, k => ETIQUETA_DISPOSITIVO[k] ?? k), colorFijo(COLOR_DISPOSITIVO, SERIE)),
    app:          porciones(ordenar(r.app), colorFijo(COLOR_APP, SERIE)),
    so:           porciones(ordenar(r.so), colorFijo(COLOR_SO, SERIE)),
    navegadores:  porciones(ordenar(r.navegadores), colorFijo(COLOR_NAVEGADOR, SERIE)),
    paises:       ordenar(r.paises).map(p => ({ k: p.k, etiqueta: nombrePais(p.k), n: p.n, chip: p.k === SIN_DATO ? undefined : p.k })),
    ciudades:     aFilas(ordenar(r.ciudades)),
    origenes:     aFilas(reagrupar(r.origenes, nombreOrigen)),
    idiomas:      aFilas(ordenar(r.idiomas), nombreIdioma),
  }), [r]);

  if (t.vistas === 0) {
    return (
      <div style={{ marginTop: 22 }}>
        <Vacio Icon={CalendarX} texto={`No hay visitas registradas en este rango. El historial empezó el ${fechaCorta(HISTORIAL_DESDE, true)}: prueba con Hoy o 7 días.`} />
      </div>
    );
  }

  const tendencia = (k: "vistas" | "visitantes" | "sesiones") => (unDia ? undefined : r.por_dia.map(x => x[k]));

  return (
    <>
      {/* Cifras principales, con la variación contra el período anterior */}
      <div className="ev-k3" style={{ marginTop: 22 }}>
        <Cifra grande Icon={UsersRound} color={COLOR.visitantes} label="Visitantes" valor={num(t.visitantes)}
          cambio={<Cambio actual={t.visitantes} previo={r.previos.visitantes} contra={contra} />}
          nota="Personas distintas (cada navegador cuenta una vez)" tendencia={tendencia("visitantes")} />
        <Cifra grande Icon={MousePointerClick} color={COLOR.sesiones} label="Visitas" valor={num(t.sesiones)}
          cambio={<Cambio actual={t.sesiones} previo={r.previos.sesiones} contra={contra} />}
          nota="Cada vez que alguien entra; una persona puede venir varias veces" tendencia={tendencia("sesiones")} />
        <Cifra grande Icon={Eye} color={COLOR.vistas} label="Páginas vistas" valor={num(t.vistas)}
          cambio={<Cambio actual={t.vistas} previo={r.previos.vistas} contra={contra} />}
          nota="Todas las páginas abiertas, sumando las repetidas" tendencia={tendencia("vistas")} />
      </div>

      <div className="ev-k5">
        <Cifra Icon={UserCheck} color={COLOR.conSesion} label="Con sesión" valor={num(t.con_sesion)}
          nota="Usuarios con cuenta que entraron logueados" />
        <Cifra Icon={Sparkles} color={COLOR.nuevos} label="Nuevos" valor={num(t.nuevos)}
          nota="Navegadores que llegaron por primera vez" />
        <Cifra Icon={Timer} color={COLOR.duracion} label="Duración media" valor={segundos(t.duracion_media_seg)}
          nota="Cuánto dura una visita, de la primera a la última página" />
        <Cifra Icon={Layers} color={COLOR.paginas} label="Páginas por visita" valor={String(t.paginas_por_sesion).replace(".", ",")}
          nota="Cuántas páginas abre alguien, en promedio, cada vez que entra" />
        <Cifra Icon={LogOut} color={COLOR.rebote} label="Rebote" valor={`${Math.round(t.rebote_pct)} %`}
          nota="Visitas que se fueron tras ver una sola página. Más bajo es mejor" />
      </div>

      {/* Tendencia: dos gráficos para no mezclar escalas en un mismo eje */}
      <Seccion>Cómo fue cada {unDia ? "hora" : "día"}</Seccion>
      {unDia ? (
        <Tarjeta acento={COLOR.vistas}>
          <Titulo Icon={TrendingUp} acento={COLOR.vistas} texto="Páginas vistas por hora" />
          <Columnas color={COLOR.vistas} unidad="páginas vistas" alto={200}
            datos={r.por_hora.map(h => ({
              clave: String(h.hora), eje: `${h.hora}h`, valor: h.vistas,
              titulo: `${hora12(h.hora)} – ${hora12((h.hora + 1) % 24)}`,
            }))} />
        </Tarjeta>
      ) : (
        <div className="ev-mitades">
          <Tarjeta acento={COLOR.visitantes}>
            <Titulo Icon={UsersRound} acento={COLOR.visitantes} texto="Visitantes y visitas por día" />
            <Area ejes={r.por_dia.map(x => fechaCorta(x.dia))} titulos={r.por_dia.map(x => fechaLarga(x.dia))}
              series={[
                { nombre: "Visitantes", color: COLOR.visitantes, valores: r.por_dia.map(x => x.visitantes) },
                { nombre: "Visitas", color: COLOR.sesiones, valores: r.por_dia.map(x => x.sesiones) },
              ]} />
          </Tarjeta>
          <Tarjeta acento={COLOR.vistas}>
            <Titulo Icon={Eye} acento={COLOR.vistas} texto="Páginas vistas por día" />
            <div className="ev-solo-ancho" style={{ height: 24 }} aria-hidden />
            <Area ejes={r.por_dia.map(x => fechaCorta(x.dia))} titulos={r.por_dia.map(x => fechaLarga(x.dia))}
              series={[{ nombre: "Páginas vistas", color: COLOR.vistas, valores: r.por_dia.map(x => x.vistas) }]} />
          </Tarjeta>
        </div>
      )}

      {/* Mapas de calor */}
      <div className="ev-calores">
        <Tarjeta acento={COURT}>
          <Titulo Icon={Clock} texto="A qué hora entran" ayuda="Páginas vistas en cada hora del día, hora de Colombia. Toca una casilla para ver el número." />
          <MapaCalor clase="ev-horas" unidad="vistas"
            celdas={r.por_hora.map(h => ({ clave: String(h.hora), corta: String(h.hora), larga: `${hora12(h.hora)} – ${hora12((h.hora + 1) % 24)}`, valor: h.vistas }))} />
        </Tarjeta>
        <Tarjeta acento={COURT}>
          <Titulo Icon={CalendarDays} texto="Qué días entran" ayuda="Páginas vistas según el día de la semana." />
          <MapaCalor clase="ev-semana" unidad="vistas"
            celdas={r.por_dia_semana.map(x => ({ clave: String(x.dow), corta: DIAS_CORTOS[x.dow], larga: DIAS_SEMANA[x.dow], valor: x.vistas }))} />
        </Tarjeta>
      </div>

      {/* Páginas */}
      <Seccion>Qué páginas visitaron</Seccion>
      <TablaPaginas paginas={r.paginas} />

      {/* Con qué entran */}
      <Seccion>Con qué entran</Seccion>
      <div className="ev-g4">
        <Tarjeta acento={SERIE[0]}><Titulo Icon={Smartphone} acento={SERIE[0]} texto="Dispositivo" /><DonaOVacio datos={d.dispositivos} /></Tarjeta>
        <Tarjeta acento={SERIE[1]}><Titulo Icon={AppWindow} acento={SERIE[1]} texto="App o navegador" /><DonaOVacio datos={d.app} /></Tarjeta>
        <Tarjeta acento={SERIE[3]}><Titulo Icon={Monitor} acento={SERIE[3]} texto="Sistema operativo" /><DonaOVacio datos={d.so} /></Tarjeta>
        <Tarjeta acento={SERIE[2]}><Titulo Icon={Compass} acento={SERIE[2]} texto="Navegador" /><DonaOVacio datos={d.navegadores} /></Tarjeta>
      </div>

      {/* De dónde son y de dónde llegan */}
      <Seccion>De dónde son y cómo llegan</Seccion>
      <div className="ev-g4">
        <Tarjeta acento={SERIE[0]}><Titulo Icon={Globe} acento={SERIE[0]} texto="Países" /><ListaOVacio filas={d.paises} color={SERIE[0]} /></Tarjeta>
        <Tarjeta acento={SERIE[5]}><Titulo Icon={Building2} acento={SERIE[5]} texto="Ciudades" /><ListaOVacio filas={d.ciudades} color={SERIE[5]} /></Tarjeta>
        <Tarjeta acento={SERIE[4]}>
          <Titulo Icon={Radio} acento={SERIE[4]} texto="De dónde llegan" ayuda="Visitas según el sitio que las trajo. Directo: escribieron la dirección o usaron un favorito." />
          <ListaOVacio filas={d.origenes} color={SERIE[4]} unidad="visitas" />
        </Tarjeta>
        <Tarjeta acento={SERIE[7]}><Titulo Icon={Languages} acento={SERIE[7]} texto="Idiomas" /><ListaOVacio filas={d.idiomas} color={SERIE[7]} /></Tarjeta>
      </div>

      {/* Usuarios */}
      <Seccion>Usuarios con sesión más activos</Seccion>
      <TablaUsuarios usuarios={r.usuarios} />
    </>
  );
}

/* ── Piezas ──────────────────────────────────────────────────── */

const aFilas = (pares: Par[], etiqueta: (k: string) => string = k => k): FilaBarra[] =>
  pares.map(p => ({ k: p.k, etiqueta: p.k === SIN_DATO ? SIN_DATO : etiqueta(p.k), n: p.n }));

function DonaOVacio({ datos }: { datos: ReturnType<typeof porciones> }) {
  return datos.length ? <Dona datos={datos} unidad="personas" /> : <Vacio compacto Icon={Monitor} texto="Sin datos en este rango." />;
}

function ListaOVacio({ filas, color, unidad = "personas" }: { filas: FilaBarra[]; color: string; unidad?: string }) {
  return filas.length ? <ListaBarras filas={filas} color={color} unidad={unidad} /> : <Vacio compacto Icon={Globe} texto="Sin datos en este rango." />;
}

function TablaPaginas({ paginas }: { paginas: Reporte["paginas"] }) {
  const [todas, setTodas] = useState(false);
  if (!paginas.length) return <Vacio compacto Icon={FileText} texto="Sin páginas vistas en este rango." />;
  const max = Math.max(1, ...paginas.map(p => p.vistas));
  const total = paginas.reduce((s, p) => s + p.vistas, 0) || 1;
  const lista = todas ? paginas : paginas.slice(0, 10);

  return (
    <Tarjeta acento={COLOR.vistas}>
      <Titulo Icon={FileText} acento={COLOR.vistas} texto={`Páginas más visitadas (${paginas.length})`}
        ayuda="Tiempo medio: cuánto se queda alguien en esa página antes de irse a otra o cerrar." />
      <div className="ev-tabla" role="table">
        <div className="ev-fila ev-cabeza" role="row">
          <span role="columnheader">#</span>
          <span role="columnheader">Página</span>
          <span className="ev-mets">
            <span role="columnheader">Vistas</span>
            <span role="columnheader">Personas</span>
            <span role="columnheader">Tiempo medio</span>
          </span>
        </div>
        {lista.map((p, i) => (
          <div key={p.ruta} className="ev-fila" role="row">
            <span className="ev-rank">{i + 1}</span>
            <div style={{ minWidth: 0 }} role="cell">
              <div className="ev-corta" style={{ fontFamily: MONO, fontSize: 12, color: INK0 }}>
                <Link href={p.ruta} className="ev-enlace">{nombreRuta(p.ruta)}</Link>
              </div>
              <div className="ev-corta" style={{ fontFamily: MONO, fontSize: 9.5, color: INK2, marginTop: 2 }}>
                {p.titulo && nombreRuta(p.ruta) !== p.titulo ? `${p.ruta} · ${p.titulo}` : p.ruta}
              </div>
              <div className="ev-prop">
                <span style={{ width: `${Math.max(2, (p.vistas / max) * 100)}%` }} />
              </div>
            </div>
            <span className="ev-mets">
              <span role="cell"><b>{num(p.vistas)}</b><i> vistas</i><em>{Math.round((p.vistas / total) * 100)} %</em></span>
              <span role="cell"><b>{num(p.visitantes)}</b><i> personas</i></span>
              <span role="cell"><b>{p.seg_medio != null ? segundos(p.seg_medio) : "—"}</b><i> en promedio</i></span>
            </span>
          </div>
        ))}
      </div>
      {paginas.length > 10 && (
        <button type="button" className="ev-mas" style={{ marginTop: 12 }} onClick={() => setTodas(x => !x)}>
          <ChevronDown size={13} strokeWidth={2} style={{ transform: todas ? "rotate(180deg)" : undefined }} />
          {todas ? "Ver menos" : `Ver las ${paginas.length}`}
        </button>
      )}
    </Tarjeta>
  );
}

function TablaUsuarios({ usuarios }: { usuarios: Reporte["usuarios"] }) {
  if (!usuarios.length) return <Vacio compacto Icon={UserCheck} texto="Nadie con cuenta entró logueado en este rango." />;
  const max = Math.max(1, ...usuarios.map(u => u.vistas));
  return (
    <Tarjeta acento={COLOR.conSesion}>
      <Titulo Icon={Crown} acento={COLOR.conSesion} texto={`Los que más usan el sitio (${usuarios.length})`} />
      <div className="ev-tabla" role="table">
        <div className="ev-fila ev-cabeza" role="row">
          <span role="columnheader">#</span>
          <span role="columnheader">Usuario</span>
          <span className="ev-mets">
            <span role="columnheader">Vistas</span>
            <span role="columnheader">Visitas</span>
            <span role="columnheader">Última vez</span>
          </span>
        </div>
        {usuarios.map((u, i) => (
          <div key={u.username} className="ev-fila" role="row">
            <span className="ev-rank">{i + 1}</span>
            <div style={{ minWidth: 0 }} role="cell">
              <div className="ev-corta" style={{ fontFamily: MONO, fontSize: 12, color: INK0 }}>
                <Link href={`/${u.username}`} className="ev-enlace">@{u.username}</Link>
              </div>
              <div className="ev-prop violeta">
                <span style={{ width: `${Math.max(2, (u.vistas / max) * 100)}%` }} />
              </div>
            </div>
            <span className="ev-mets">
              <span role="cell"><b>{num(u.vistas)}</b><i> vistas</i></span>
              <span role="cell"><b>{num(u.sesiones)}</b><i> visitas</i></span>
              <span role="cell"><b>{ultimaVez(u.ultima)}</b></span>
            </span>
          </div>
        ))}
      </div>
    </Tarjeta>
  );
}

function ultimaVez(iso: string): string {
  const f = new Date(iso);
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(f);
  return `${fechaCorta(dia)}, ${horaMinuto(iso)}`;
}

/* ── CSV (se arma en el navegador) ───────────────────────────── */

function descargarCSV(r: Reporte) {
  const filas: (string | number)[][] = [];
  const sec = (titulo: string, cabeza: string[], datos: (string | number)[][]) => {
    filas.push([], [titulo], cabeza, ...datos);
  };
  const t = r.totales;
  filas.push(["Reporte de visitas Facebinder"], ["Desde", r.desde], ["Hasta", r.hasta], ["Días", r.dias]);
  sec("Resumen", ["Cifra", "Valor", "Período anterior"], [
    ["Visitantes", t.visitantes, r.previos.visitantes],
    ["Visitas", t.sesiones, r.previos.sesiones],
    ["Páginas vistas", t.vistas, r.previos.vistas],
    ["Con sesión", t.con_sesion, ""],
    ["Nuevos", t.nuevos, ""],
    ["Duración media (s)", t.duracion_media_seg, ""],
    ["Páginas por visita", t.paginas_por_sesion, ""],
    ["Rebote (%)", t.rebote_pct, ""],
  ]);
  sec("Por día", ["Día", "Visitantes", "Visitas", "Páginas vistas"], r.por_dia.map(x => [x.dia, x.visitantes, x.sesiones, x.vistas]));
  sec("Por hora (Bogotá)", ["Hora", "Páginas vistas"], r.por_hora.map(x => [`${x.hora}:00`, x.vistas]));
  sec("Por día de la semana", ["Día", "Páginas vistas"], r.por_dia_semana.map(x => [DIAS_SEMANA[x.dow], x.vistas]));
  sec("Páginas", ["Ruta", "Nombre", "Título", "Vistas", "Personas", "Tiempo medio (s)"],
    r.paginas.map(p => [p.ruta, nombreRuta(p.ruta), p.titulo ?? "", p.vistas, p.visitantes, p.seg_medio ?? ""]));
  const pares = (titulo: string, lista: Par[], nombre: (k: string) => string = k => k) =>
    sec(titulo, ["Nombre", "Cantidad"], lista.map(p => [nombre(p.k), p.n]));
  pares("Países", r.paises, nombrePais);
  pares("Ciudades", r.ciudades);
  pares("Dispositivos", r.dispositivos, k => ETIQUETA_DISPOSITIVO[k] ?? k);
  pares("Sistemas operativos", r.so);
  pares("Navegadores", r.navegadores);
  pares("App o navegador", r.app);
  pares("Idiomas", r.idiomas, nombreIdioma);
  pares("Orígenes (visitas)", r.origenes, nombreOrigen);
  sec("Usuarios con sesión", ["Usuario", "Vistas", "Visitas", "Última vez"], r.usuarios.map(u => [u.username, u.vistas, u.sesiones, u.ultima]));

  /* Punto y coma y BOM: así Excel en español lo abre en columnas y con tildes */
  const celda = (v: string | number) => {
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const texto = "﻿" + filas.map(f => f.map(celda).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `facebinder-visitas-${r.desde}-a-${r.hasta}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
