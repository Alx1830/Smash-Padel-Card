import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { escaparLike } from "@/lib/escapar-like";

/**
 * Icono de WhatsApp del perfil. El número nunca se escribe en la página: este
 * enlace exige sesión, comprueba que el dueño quiera mostrarlo y recién ahí
 * redirige a wa.me. Sin sesión, manda a iniciarla.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const perfil = new URL(`/${encodeURIComponent(username)}`, req.url);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { data } = await supabaseAdmin.from("players")
    .select("whatsapp_indicativo, whatsapp_numero, mostrar_whatsapp, activo")
    .ilike("username", escaparLike(username)).maybeSingle();

  const numero = `${data?.whatsapp_indicativo ?? ""}${data?.whatsapp_numero ?? ""}`.replace(/\D/g, "");
  if (!data || data.activo === false || !data.mostrar_whatsapp || !data.whatsapp_numero || numero.length < 8) {
    return NextResponse.redirect(perfil);
  }
  return NextResponse.redirect(`https://wa.me/${numero}`);
}
