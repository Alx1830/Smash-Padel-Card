"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Una misma persona no vuelve a contar hasta pasadas estas horas. */
const ESPERA_HORAS = 6;

/**
 * Las lecturas de una nota, y la suma de la propia.
 *
 * El conteo se hace desde el navegador a propósito: así el rastreador de
 * Google, el que arma la vista previa de WhatsApp y los demás robots —que no
 * ejecutan nada— no inflan el número. A eso se suma un freno por equipo, para
 * que recargar la página cinco veces no cuente cinco lecturas.
 *
 * El freno vive en el navegador de cada uno, así que no es a prueba de balas:
 * alguien decidido puede sumar visitas a mano. Para lo que sirve el número
 * —saber qué nota funciona— alcanza; el dato fino está en Analytics.
 */
export function Lecturas({ slug, inicial }: { slug: string; inicial: number }) {
  const [total, setTotal] = useState(inicial);

  useEffect(() => {
    const clave = `leida:${slug}`;
    const corte = Date.now() - ESPERA_HORAS * 3600_000;

    let reciente = false;
    try {
      reciente = Number(window.localStorage.getItem(clave) ?? 0) > corte;
    } catch {
      /* Navegación privada o almacenamiento bloqueado: se cuenta igual */
    }
    if (reciente) return;

    let vivo = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("sumar_visita", { p_slug: slug });
      if (error || !vivo) return;

      try { window.localStorage.setItem(clave, String(Date.now())); } catch { /* da igual */ }

      /* El número que devuelve la base ya incluye esta lectura. Se usa solo si
         es mayor que el que vino dibujado: entre que la página se generó y
         alguien la abre pueden haber entrado otros. */
      if (typeof data === "number" && data > inicial) setTotal(data);
    })();

    return () => { vivo = false; };
  }, [slug, inicial]);

  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }} title={`${total.toLocaleString("es-CO")} lecturas`}>
      <Eye size={12} /> {formatear(total)} {total === 1 ? "lectura" : "lecturas"}
    </span>
  );
}

/** 1240 → "1,2k". Un número largo al lado de la fecha ensucia la línea. */
function formatear(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(".", ",")}k`;
  return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
}
