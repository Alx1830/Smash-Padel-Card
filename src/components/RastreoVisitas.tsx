"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { leerDispositivo, esRobot } from "@/lib/dispositivo";

/**
 * Avisa a la base que este navegador está en la página, para el panel de admin
 * "En vivo" (/dashboard/admin/en-vivo).
 *
 * - Un aviso al entrar y en cada cambio de página, y uno cada 30 s mientras
 *   la pestaña siga abierta. El panel cuenta como "en línea" a quien avisó en
 *   los últimos 75 s.
 * - Al cerrar la pestaña manda un último aviso que lo saca en el acto.
 * - No guarda la IP: el país y la ciudad los da Cloudflare (/api/geo).
 * - En desarrollo no mide, igual que Analytics: si no, cada recarga mientras
 *   se trabaja entraría como visita.
 */

const INTERVALO = 30_000;
const CLAVE_ID     = "fb-visitante";
const CLAVE_SESION = "fb-sesion";
const CLAVE_GEO    = "fb-geo";

type Geo = { pais: string | null; region: string | null; ciudad: string | null };

function leer(store: Storage, clave: string): string | null {
  try { return store.getItem(clave); } catch { return null; }
}
function guardar(store: Storage, clave: string, valor: string) {
  try { store.setItem(clave, valor); } catch { /* modo privado */ }
}

function visitanteId(): string {
  let id = leer(localStorage, CLAVE_ID);
  if (!id) {
    id = crypto.randomUUID();
    guardar(localStorage, CLAVE_ID, id);
  }
  return id;
}

let geoPromesa: Promise<Geo | null> | null = null;
function pedirGeo(): Promise<Geo | null> {
  const guardada = leer(sessionStorage, CLAVE_GEO);
  if (guardada) {
    try { return Promise.resolve(JSON.parse(guardada) as Geo); } catch { /* se vuelve a pedir */ }
  }
  geoPromesa ??= fetch("/api/geo")
    .then(r => (r.ok ? r.json() : null))
    .then((g: Geo | null) => {
      if (g) guardar(sessionStorage, CLAVE_GEO, JSON.stringify(g));
      return g;
    })
    .catch(() => null);
  return geoPromesa;
}

/** De dónde llegó, solo si viene de otro sitio */
function referido(): string | null {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname.replace(/^www\./, "");
    return host === location.hostname.replace(/^www\./, "") ? null : host;
  } catch { return null; }
}

export function RastreoVisitas() {
  const pathname = usePathname();
  const activo = useRef(false);
  const idRef  = useRef<string | null>(null);

  async function avisar(extra: { pagina_nueva?: boolean } = {}) {
    if (!activo.current || !idRef.current) return;

    /* Una visita = lo que dura la pestaña abierta. El "1" es de la versión
       anterior, que no llevaba código: se le da uno sin contarla como nueva. */
    let sesionId = leer(sessionStorage, CLAVE_SESION);
    const sesionNueva = !sesionId;
    if (!sesionId || sesionId.length < 30) {
      sesionId = crypto.randomUUID();
      guardar(sessionStorage, CLAVE_SESION, sesionId);
    }

    const geo = await pedirGeo();
    const params = new URLSearchParams(location.search);
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;

    await createClient().rpc("registrar_visita", {
      p: {
        visitante_id:    idRef.current,
        sesion_id:       sesionId,
        ruta:            location.pathname,
        titulo:          document.title,
        pagina_nueva:    extra.pagina_nueva ?? false,
        sesion_nueva:    sesionNueva,
        en_primer_plano: document.visibilityState === "visible",
        referido:        sesionNueva ? referido() : null,
        utm_fuente:      sesionNueva ? params.get("utm_source") : null,
        ...leerDispositivo(),
        pwa:             standalone,
        pantalla:        `${screen.width}x${screen.height}`,
        idioma:          navigator.language,
        zona_horaria:    Intl.DateTimeFormat().resolvedOptions().timeZone,
        pais:            geo?.pais ?? null,
        region:          geo?.region ?? null,
        ciudad:          geo?.ciudad ?? null,
      },
    }).then(() => {}, () => {});
  }

  /* Latido, pestaña oculta/visible y salida */
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || esRobot()) return;
    idRef.current = visitanteId();
    activo.current = true;

    const latido = setInterval(() => { void avisar(); }, INTERVALO);
    const alCambiarVisibilidad = () => { void avisar(); };

    /* Al cerrar: fetch con keepalive, que sobrevive a la pestaña. El cliente
       de Supabase no lo permite, por eso va a mano contra el mismo endpoint. */
    const alSalir = () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key || !idRef.current) return;
      fetch(`${url}/rest/v1/rpc/salir_visita`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
        body: JSON.stringify({ p_visitante: idRef.current }),
      }).catch(() => {});
    };

    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("pagehide", alSalir);
    return () => {
      clearInterval(latido);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.removeEventListener("pagehide", alSalir);
    };
  }, []);

  /* Cada página vista */
  useEffect(() => {
    void avisar({ pagina_nueva: true });
  }, [pathname]);

  return null;
}
