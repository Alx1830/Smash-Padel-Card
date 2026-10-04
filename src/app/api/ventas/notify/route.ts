import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { webpush } from '@/lib/web-push';
import webpushLib from 'web-push';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Avisa al comprador que un vendedor registró una venta a su nombre, para que
 * la confirme y lo califique en /dashboard/compras. Solo el vendedor puede
 * dispararlo y solo una vez por venta.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { venta_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ventaId = String(body.venta_id ?? '');
  if (!UUID_RE.test(ventaId)) {
    return NextResponse.json({ error: 'Invalid venta_id' }, { status: 400 });
  }

  const { data: venta } = await supabaseAdmin
    .from('ventas')
    .select('id, vendedor_id, comprador_id, estado')
    .eq('id', ventaId)
    .maybeSingle();

  if (!venta) return NextResponse.json({ error: 'Venta not found' }, { status: 404 });
  if (venta.vendedor_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (venta.estado !== 'pendiente') return NextResponse.json({ ok: true, skipped: 'respondida' });

  const { count } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', venta.comprador_id)
    .eq('type', 'venta_confirmar')
    .eq('data->>venta_id', ventaId);
  if (count) return NextResponse.json({ ok: true, skipped: 'ya avisado' });

  const { data: actor } = await supabaseAdmin
    .from('players')
    .select('username, first_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const actorName = String(actor?.username || actor?.first_name || 'Un vendedor')
    .replace(/[<>"'&]/g, '')
    .slice(0, 40);

  const url = `/dashboard/compras?venta=${ventaId}`;
  const title = 'Confirma tu compra';
  const msgBody = `${actorName} dice que te vendió una carta. ¿La recibiste? Califícalo.`;

  const { error: insertError } = await supabaseAdmin.from('notifications').insert({
    user_id: venta.comprador_id,
    type: 'venta_confirmar',
    title,
    body: msgBody,
    data: { venta_id: ventaId, url },
  });

  if (insertError) {
    console.error('[Ventas] Insert notification error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', venta.comprador_id);

  if (!subscriptions?.length) {
    return NextResponse.json({ ok: true, pushed: 0 });
  }

  const payload = JSON.stringify({
    title,
    body: msgBody,
    icon: '/icon-512.webp',
    badge: '/favicon-32.png',
    data: { url },
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
