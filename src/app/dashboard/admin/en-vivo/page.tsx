"use client";

/**
 * Quién está en la página ahora mismo, y reportes por días de todo lo guardado.
 *
 * Cada navegador avisa cada 30 s (components/RastreoVisitas.tsx) y acá se
 * cuenta como "en línea" a quien avisó en los últimos 75 s. Los datos salen de
 * panel_en_vivo() y reporte_visitas(), que solo responden a un admin: las
 * tablas no son legibles por nadie más. La pestaña En vivo se refresca sola
 * cada 5 s; la pestaña y el rango de días quedan en la URL.
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PanelEnVivo, type Vista } from "@/components/admin/en-vivo/PanelEnVivo";
import { leerRango, type Rango } from "@/components/admin/en-vivo/VistaReportes";
import { hoyBogota, type Panel, type Reporte } from "@/components/admin/en-vivo/comun";

const REFRESCO = 5_000;

export default function EnVivoPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#05070d" }} />}>
      <EnVivo />
    </Suspense>
  );
}

function EnVivo() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [error, setError] = useState<string | null>(null);
  /* Diferencia entre el reloj del servidor y el de este equipo, para que los
     "hace 3 min" no dependan de la hora del computador del admin. */
  const [desfase, setDesfase] = useState(0);
  const [reloj, setReloj] = useState(() => Date.now());
  /* El reporte guarda para qué rango se pidió: si no coincide con el de la URL,
     está cargando (y mientras tanto se sigue viendo el anterior, atenuado). */
  const [reporte, setReporte] = useState<{ clave: string; datos: Reporte | null; error: string | null } | null>(null);
  const [vuelta, setVuelta] = useState(0);

  const vista: Vista = params.get("vista") === "reportes" ? "reportes" : "en-vivo";
  const ahora = reloj + desfase;
  const hoy = hoyBogota(ahora);
  const rango = leerRango(params.get("desde"), params.get("hasta"), hoy);
  const clave = `${rango.desde}|${rango.hasta}|${vuelta}`;

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data } = await supabase.from("players").select("role").eq("user_id", user.id).single();
      if (data?.role !== "admin") { router.replace("/dashboard"); return; }
      setChecking(false);
    })();
  }, [router]);

  const cargar = useCallback(async () => {
    const { data, error: err } = await createClient().rpc("panel_en_vivo");
    if (err) { setError(err.message); return; }
    const p = data as Panel;
    setError(null);
    setPanel(p);
    setDesfase(new Date(p.ahora).getTime() - Date.now());
  }, []);

  /* En vivo: solo se pide con esa pestaña abierta y la ventana visible */
  useEffect(() => {
    if (checking || vista !== "en-vivo") return;
    const primera = setTimeout(() => { void cargar(); }, 0);
    const refresco = setInterval(() => {
      if (document.visibilityState === "visible") void cargar();
    }, REFRESCO);
    return () => { clearTimeout(primera); clearInterval(refresco); };
  }, [checking, vista, cargar]);

  useEffect(() => {
    const tic = setInterval(() => setReloj(Date.now()), 1_000);
    return () => clearInterval(tic);
  }, []);

  /* Reportes: se pide cada vez que cambia el rango */
  const { desde, hasta } = rango;
  useEffect(() => {
    if (checking || vista !== "reportes") return;
    let vigente = true;
    const pedido = clave;
    createClient().rpc("reporte_visitas", { p_desde: desde, p_hasta: hasta }).then(({ data, error: err }) => {
      if (!vigente) return;
      setReporte(prev => err
        ? { clave: pedido, datos: prev?.datos ?? null, error: err.message }
        : { clave: pedido, datos: data as Reporte, error: null });
    });
    return () => { vigente = false; };
  }, [checking, vista, desde, hasta, clave]);

  /** Cambia parámetros de la URL sin agregar una entrada al historial */
  const cambiarURL = useCallback((cambios: Record<string, string | null>) => {
    const qs = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null) qs.delete(k); else qs.set(k, v);
    }
    const s = qs.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  if (checking) return <div style={{ minHeight: "100vh", background: "#05070d" }} />;

  return (
    <PanelEnVivo
      vista={vista}
      onVista={v => cambiarURL({ vista: v === "reportes" ? "reportes" : null })}
      panel={panel}
      errorPanel={error}
      ahora={ahora}
      reporte={reporte?.datos ?? null}
      cargandoReporte={reporte?.clave !== clave}
      errorReporte={reporte?.clave === clave ? reporte.error : null}
      rango={rango}
      hoy={hoy}
      onRango={(r: Rango) => cambiarURL({ vista: "reportes", desde: r.desde, hasta: r.hasta })}
      onActualizar={() => setVuelta(n => n + 1)}
    />
  );
}
