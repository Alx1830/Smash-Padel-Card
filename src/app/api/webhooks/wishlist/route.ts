import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { webpush } from '@/lib/web-push';
import webpushLib from 'web-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface WebhookPayload {
  record: {
    card_id: string;
    set_id: string;
    version?: string;
    user_id: string;
    card_name?: string;
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

  const { card_id, set_id, user_id: sellerId, card_name } = payload.record;

  const cardLabel = card_name ?? 'Una carta de tu wishlist';

  // market_listings.card_id = card_number (ej: 53)
  // card_wishlist.card_id   = card.id (ej: "neo1-53")
  // Construimos el wishlist_card_id combinando set_id + card_number
  const wishlistCardId = `${set_id}-${card_id}`;

  const { data: wishlistUsers, error: wishlistError } = await supabaseAdmin
    .from('card_wishlist')
    .select('user_id')
    .eq('card_id', wishlistCardId)
    .eq('set_id', set_id)
    .neq('user_id', sellerId);

  if (wishlistError || !wishlistUsers?.length) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const userIds = wishlistUsers.map((r: { user_id: string }) => r.user_id);

  const notificationRows = userIds.map((uid: string) => ({
    user_id: uid,
    type: 'wishlist_available',
    title: '¡Carta disponible!',
    body: `${cardLabel} está en el market`,
    data: { card_id, set_id, url: '/dashboard/inventario' },
  }));

  await supabaseAdmin.from('notifications').insert(notificationRows);

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);

  if (!subscriptions?.length) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const pushPayload = JSON.stringify({
    title: '¡Carta disponible!',
    body: `${cardLabel} está en el market`,
    icon: '/icon-512.webp',
    badge: '/favicon-32.png',
    data: { url: '/dashboard/inventario' },
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub: { user_id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload
        );
      } catch (err: unknown) {
        const pushError = err as webpushLib.WebPushError;
        if (pushError?.statusCode === 410) {
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        }
        throw err;
      }
    })
  );

  const notified = results.filter((r) => r.status === 'fulfilled').length;

  return NextResponse.json({ ok: true, notified });
}
