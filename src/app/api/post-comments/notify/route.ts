/**
 * Avisa a los administradores que alguien comentó una noticia.
 *
 * La llama el navegador después de guardar el comentario. No avisa cuando el
 * que comentó es el mismo admin: nadie necesita una notificación de su propio
 * comentario.
 *
 * Solo dice el id del comentario. El texto, quién lo escribió y en qué nota se
 * leen acá con la llave de servicio, para que nadie pueda mandar una
 * notificación con el contenido que se le ocurra.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { webpush } from "@/lib/web-push";
import webpushLib from "web-push";
import { nombreAutor, type PostAuthor } from "@/lib/posts";

export async function POST(request: NextRequest) {
  // 1. Quién llama. Sin sesión no hay nada que avisar.
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  let commentId: string | undefined;
  try {
    ({ commentId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (!commentId) return NextResponse.json({ error: "Falta commentId" }, { status: 400 });

  // 2. El comentario, leído del lado del servidor y no del cuerpo del pedido.
  const { data: comentario } = await supabaseAdmin
    .from("post_comments")
    .select("id, post_id, user_id, body")
    .eq("id", commentId)
    .maybeSingle();

  if (!comentario) return NextResponse.json({ error: "El comentario no existe" }, { status: 404 });
  if (comentario.user_id !== user.id) {
    return NextResponse.json({ error: "Ese comentario no es tuyo" }, { status: 403 });
  }

  // 3. A quién le llega: los admins, menos el que acaba de comentar.
  const { data: admins } = await supabaseAdmin
    .from("players").select("user_id").eq("role", "admin");

  const destinatarios = (admins ?? [])
    .map((a) => a.user_id)
    .filter((uid): uid is string => Boolean(uid) && uid !== comentario.user_id);

  if (!destinatarios.length) {
    return NextResponse.json({ ok: true, notificados: 0, push: 0, motivo: "sin destinatarios" });
  }

  const { data: post } = await supabaseAdmin
    .from("admin_posts").select("title, slug").eq("id", comentario.post_id).maybeSingle();

  const { data: autor } = await supabaseAdmin
    .from("players").select("username, first_name, last_name, photo_url")
    .eq("user_id", comentario.user_id).maybeSingle();

  const quien  = nombreAutor((autor ?? null) as PostAuthor | null);
  const titulo = `${quien} comentó "${post?.title ?? "una noticia"}"`;
  const cuerpo = comentario.body.length > 120 ? `${comentario.body.slice(0, 120)}…` : comentario.body;
  const url    = `/post/${post?.slug ?? ""}`;

  // 4. La campana
  const { error: errNotif } = await supabaseAdmin.from("notifications").insert(
    destinatarios.map((uid) => ({
      user_id: uid,
      type: "post_comment",
      title: titulo,
      body: cuerpo,
      data: { post_id: comentario.post_id, comment_id: comentario.id, slug: post?.slug, url },
    }))
  );
  if (errNotif) {
    console.error("[Comment Notify] insert notifications:", errNotif);
    return NextResponse.json({ error: errNotif.message }, { status: 500 });
  }

  // 5. El celular, para los admins que lo tengan activado
  const { data: suscripciones } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id")
    .in("user_id", destinatarios);

  const carga = JSON.stringify({
    title: titulo,
    body: cuerpo,
    data: { url, post_id: comentario.post_id },
  });

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
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      } else {
        console.error("[Comment Notify] push:", err?.statusCode, err?.body);
      }
    }
  }));

  return NextResponse.json({ ok: true, notificados: destinatarios.length, push: enviadas });
}
