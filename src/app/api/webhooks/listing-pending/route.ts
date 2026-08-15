import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { webpush } from '@/lib/web-push';
import webpushLib from 'web-push';

/**
 * Avisa a los admins de que hay una carta esperando aprobación.
 * Lo dispara un trigger de market_listings cuando entra una fila pendiente.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WebhookPayload {
  record: {
    id: string;
    user_id: string;
    card_id: number | string;
    set_id: string;
    price_cop: number;
    currency: string;
    status: string;
  };
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { user_id: sellerId, status } = payload.record ?? {};
  if (status !== 'pending') return NextResponse.json({ ok: true, skipped: true });

  const { data: seller } = await supabaseAdmin
    .from('players').select('username').eq('user_id', sellerId).single();

  const { data: admins } = await supabaseAdmin
    .from('players').select('user_id').eq('role', 'admin');

  const adminIds = (admins ?? []).map((a: { user_id: string }) => a.user_id);
  if (!adminIds.length) return NextResponse.json({ ok: true, notified: 0 });

  const vendedor = String(seller?.username ?? 'Alguien').replace(/[<>"'&]/g, '').slice(0, 60);
  const titulo = 'Carta esperando aprobación';
  const cuerpo = `@${vendedor} publicó una carta en el market`;
  const url    = '/dashboard/admin/aprobaciones';

  await supabaseAdmin.from('notifications').insert(
    adminIds.map((adminId: string) => ({
      user_id: adminId,
      type: 'listing_pending_review',
      title: titulo,
      body: cuerpo,
      data: { url, listing_id: payload.record.id },
    }))
  );

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', adminIds);

  if (!subscriptions?.length) {
    return NextResponse.json({ ok: true, notified: adminIds.length, pushed: 0 });
  }

  const pushPayload = JSON.stringify({
    title: titulo,
    body: cuerpo,
    icon: '/icon-512.webp',
    badge: '/favicon-32.png',
    data: { url },
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload,
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
    notified: adminIds.length,
    pushed: results.filter(r => r.status === 'fulfilled').length,
  });
}
