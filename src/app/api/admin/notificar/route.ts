/**
 * Un aviso escrito a mano para todos los usuarios.
 *
 * Es el hermano suelto de `/api/admin/posts/notify`: aquel avisa de una nota
 * publicada y arma el texto solo; este manda lo que el admin escriba y hacia
 * donde él diga.
 *
 * Como todos los avisos de la casa, salen por dos vías: la fila en
 * `notifications` —la campana de la app, que la ve cualquiera al entrar— y la
 * notificación push, solo para quien tenga el celular suscrito.
 *
 * Solo un admin puede dispararlo: se valida la sesión del que llama contra
 * `players.role`, porque la ruta usa la llave de servicio para escribir en
 * nombre de todos.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { webpush } from "@/lib/web-push";
import webpushLib from "web-push";

/** Nadie lee un título de dos renglones en la barra del celular. */
const TITULO_MAX  = 70;
const MENSAJE_MAX = 180;

export async function POST(request: NextRequest) {
  /* 1. Quién llama
   *
   * Dos maneras válidas: un admin con sesión, que es cuando alguien aprieta
   * "Enviar"; o la base de datos con el secreto de webhook, que es cuando sale
   * un aviso programado y no hay nadie frente a la pantalla. */
  const secreto = request.headers.get("x-webhook-secret");
  const esperado = process.env.SUPABASE_WEBHOOK_SECRET;
  const desdeLaBase = Boolean(esperado) && secreto === esperado;

  if (!desdeLaBase) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

    const { data: perfil } = await supabaseAdmin
      .from("players").select("role").eq("user_id", user.id).single();
    if (perfil?.role !== "admin") {
      return NextResponse.json({ error: "Solo un admin puede enviar avisos" }, { status: 403 });
    }
  }

  /* 2. Qué dice el aviso */
  let titulo: string, mensaje: string, destino: string;
  try {
    const cuerpo = await request.json();
    titulo  = String(cuerpo.titulo  ?? "").trim();
    mensaje = String(cuerpo.mensaje ?? "").trim();
    destino = String(cuerpo.destino ?? "/dashboard").trim();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!titulo)  return NextResponse.json({ error: "Falta el título" }, { status: 400 });
  if (!mensaje) return NextResponse.json({ error: "Falta el mensaje" }, { status: 400 });
  if (titulo.length  > TITULO_MAX)  return NextResponse.json({ error: `El título no puede pasar de ${TITULO_MAX} caracteres` }, { status: 400 });
  if (mensaje.length > MENSAJE_MAX) return NextResponse.json({ error: `El mensaje no puede pasar de ${MENSAJE_MAX} caracteres` }, { status: 400 });

  /* Una dirección de nuestro propio sitio y nada más: un aviso que saca a la
     gente a otra página sería una puerta abierta a cualquier cosa. */
  if (!destino.startsWith("/") || destino.startsWith("//")) {
    return NextResponse.json({ error: "El destino tiene que ser una dirección de la app" }, { status: 400 });
  }

  /* 3. La campana, para todos */
  const { data: usuarios } = await supabaseAdmin.from("players").select("user_id");
  const destinatarios = (usuarios ?? []).map((u) => u.user_id).filter(Boolean);

  if (destinatarios.length) {
    const filas = destinatarios.map((uid) => ({
      user_id: uid,
      type: "admin_aviso",
      title: titulo,
      body: mensaje,
      data: { url: destino },
    }));

    /* De a 500 para no armar una sentencia gigante. */
    for (let i = 0; i < filas.length; i += 500) {
      const { error } = await supabaseAdmin.from("notifications").insert(filas.slice(i, i + 500));
      if (error) {
        console.error("[Aviso] insert notifications:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  /* 4. El celular, para quien lo tenga activado */
  const { data: suscripciones } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  /* El service worker lee la dirección de `data.url`, no de la raíz. */
  const carga = JSON.stringify({ title: titulo, body: mensaje, data: { url: destino } });

  let enviadas = 0;
  await Promise.all((suscripciones ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        carga
      );
      enviadas++;
    } catch (e) {
      const err = e as webpushLib.WebPushError;
      /* 404/410: el navegador tiró la suscripción. Se limpia sola. */
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      } else {
        console.error("[Aviso] push:", err?.statusCode, err?.body);
      }
    }
  }));

  return NextResponse.json({
    ok: true,
    campana: destinatarios.length,
    push: enviadas,
    suscritos: suscripciones?.length ?? 0,
  });
}
