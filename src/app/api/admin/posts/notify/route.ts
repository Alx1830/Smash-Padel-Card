/**
 * Avisa a todos los usuarios que hay una publicación nueva.
 *
 * Dos avisos por usuario: la fila en `notifications` (la campana de la app) y,
 * si tiene el celular suscrito, la notificación push. Las dos llevan el título
 * del post y abren /post/<slug>.
 *
 * Solo un admin puede dispararlo: se valida la sesión del que llama contra
 * `players.role`, porque la ruta usa la llave de servicio para escribir en
 * nombre de todos.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { webpush } from "@/lib/web-push";
import webpushLib from "web-push";
import { extractoAuto } from "@/lib/posts";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // 1. Quién llama
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const { data: perfil } = await supabaseAdmin
    .from("players").select("role").eq("user_id", user.id).single();
  if (perfil?.role !== "admin") {
    return NextResponse.json({ error: "Solo un admin puede avisar" }, { status: 403 });
  }

  // 2. Qué publicación
  let postId: string | undefined;
  try {
    ({ postId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (!postId) return NextResponse.json({ error: "Falta postId" }, { status: 400 });

  const { data: post } = await supabaseAdmin
    .from("admin_posts")
    .select("id, title, slug, excerpt, content_html, cover_url, status")
    .eq("id", postId)
    .single();

  if (!post) return NextResponse.json({ error: "La publicación no existe" }, { status: 404 });
  if (post.status !== "published") {
    return NextResponse.json({ error: "Todavía es un borrador" }, { status: 400 });
  }

  const url = `/post/${post.slug}`;
  const resumen = post.excerpt?.trim() || extractoAuto(post.content_html ?? "", 120) || "Entrá para leerla";

  // 3. La campana, para todos
  const { data: usuarios } = await supabaseAdmin.from("players").select("user_id");
  const destinatarios = (usuarios ?? []).map((u) => u.user_id).filter(Boolean);

  if (destinatarios.length) {
    const filas = destinatarios.map((uid) => ({
      user_id: uid,
      type: "admin_post",
      title: post.title,
      body: resumen,
      data: { post_id: post.id, slug: post.slug, url },
    }));

    // De a 500 para no armar una sentencia gigante.
    for (let i = 0; i < filas.length; i += 500) {
      const { error } = await supabaseAdmin.from("notifications").insert(filas.slice(i, i + 500));
      if (error) {
        console.error("[Post Notify] insert notifications:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  // 4. El celular, para quien lo tenga activado
  const { data: suscripciones } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id");

  /* El service worker lee la dirección de `data.url`, no de la raíz. */
  const carga = JSON.stringify({
    title: post.title,
    body: resumen,
    data: { url, post_id: post.id },
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
      // 404/410: el navegador tiró la suscripción. Se limpia sola.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      } else {
        console.error("[Post Notify] push:", err?.statusCode, err?.body);
      }
    }
  }));

  await supabaseAdmin
    .from("admin_posts")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", post.id);

  return NextResponse.json({ ok: true, notificados: destinatarios.length, push: enviadas });
}
