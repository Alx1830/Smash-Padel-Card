"use client";

/**
 * La columna de publicidad de la portada de noticias.
 *
 * Mientras no haya un aviso de verdad, el hueco reservado no tiene por qué
 * verlo el público: solo se dibuja para un admin, que es quien necesita
 * acordarse de que ese espacio existe. Para el resto no se dibuja nada.
 *
 * La comprobación va en el navegador a propósito: mirar la sesión en el
 * servidor volvería dinámica una página que hoy se sirve cacheada 60 segundos
 * para todo el mundo.
 */
import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const INK2 = "#7a8298";
const MONO = "var(--font-jetbrains)";

export function EspacioPublicitario() {
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!vivo || !user) return;
      const { data: perfil } = await supabase
        .from("players").select("role").eq("user_id", user.id).maybeSingle();
      if (vivo) setEsAdmin(perfil?.role === "admin");
    })();
    return () => { vivo = false; };
  }, []);

  if (!esAdmin) return null;

  return (
    <aside className="np-ads">
      <div className="np-ad">
        <Megaphone size={20} color={INK2} />
        <span className="np-ad-tit">Espacio publicitario</span>
        <span className="np-ad-med">300 &times; 250</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(122,130,152,0.6)", textAlign: "center" }}>
          Solo lo ves vos
        </span>
      </div>
    </aside>
  );
}
