import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { webpush } from '@/lib/web-push';
import webpushLib from 'web-push';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Manda al celular el aviso de una referencia nueva. El aviso de la campanita
 * ya lo creó referencia_guardar en la base; acá solo se reenvía como push.
 * Solo el autor puede dispararlo y se envía una sola vez por referencia.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { referencia_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const referenciaId = String(body.referencia_id ?? '');
  if (!UUID_RE.test(referenciaId)) {
    return NextResponse.json({ error: 'Invalid referencia_id' }, { status: 400 });
  }

  const { data: referencia } = await supabaseAdmin
    .from('referencias')
    .select('id, perfil_id, autor_id')
    .eq('id', referenciaId)
    .maybeSingle();

  if (!referencia) return NextResponse.json({ error: 'Referencia not found' }, { status: 404 });
  if (referencia.autor_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Sin aviso en la campanita (era una edición) no hay push; con la marca, ya se mandó
  const { data: aviso } = await supabaseAdmin
    .from('notifications')
    .select('id, title, body, data')
    .eq('user_id', referencia.perfil_id)
    .eq('type', 'referencia_nueva')
    .eq('data->>referencia_id', referenciaId)
    .maybeSingle();
  if (!aviso) return NextResponse.json({ ok: true, skipped: 'sin aviso' });
  if (aviso.data?.push_enviado) return NextResponse.json({ ok: true, skipped: 'ya enviado' });

  await supabaseAdmin
    .from('notifications')
    .update({ data: { ...aviso.data, push_enviado: true } })
    .eq('id', aviso.id);

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', referencia.perfil_id);

  if (!subscriptions?.length) {
    return NextResponse.json({ ok: true, pushed: 0 });
  }

  const payload = JSON.stringify({
    title: aviso.title,
    body: aviso.body,
    icon: '/icon-512.webp',
    badge: '/favicon-32.png',
    data: { url: aviso.data?.url ?? '/' },
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 86400, urgency: 'high' }
        );
      } catch (err: unknown) {
        const pushError = err as webpushLib.WebPushError;
        if (pushError?.statusCode === 410 || pushError?.statusCode === 404) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
        throw err;
      }
    })
  );

  return NextResponse.json({
    ok: true,
    pushed: results.filter(r => r.status === 'fulfilled').length,
  });
}
